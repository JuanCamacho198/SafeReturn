import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

export interface InferenceParams {
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  repeat_penalty?: number;
}

export interface RiskAssessment {
  risk_score: number;
  risk_level: 'low' | 'medium' | 'high';
  reasoning: string;
  is_fallback?: boolean;
}

export interface InferenceConfig {
  modelPath: string;
  nCtx?: number;
  nThreads?: number;
  defaultParams?: InferenceParams;
}

const DEFAULT_PARAMS: Required<InferenceParams> = {
  temperature: 0.1,
  top_p: 0.9,
  max_tokens: 512,
  repeat_penalty: 1.1,
};

const SYSTEM_PROMPT = `You are a clinical risk assessment assistant. Analyze the patient data and clinical notes provided to estimate 30-day hospital readmission risk.

Provide your assessment as valid JSON with these exact fields:
{
  "risk_score": number between 0.0 and 1.0,
  "risk_level": "low" | "medium" | "high",
  "reasoning": brief explanation citing specific clinical factors
}

Risk categories:
- LOW (0.0-0.33): First admission, stable conditions, good social support
- MEDIUM (0.34-0.66): Moderate complexity, some risk factors present
- HIGH (0.67-1.0): Multiple prior readmissions, severe conditions, poor support

Consider: prior readmissions, comorbidities (CHF, COPD, diabetes), ejection fraction, social support, length of stay, discharge condition.`;

export class LLMService {
  private process: ReturnType<typeof spawn> | null = null;
  private modelPath: string;
  private nCtx: number;
  private nThreads: number;
  private params: Required<InferenceParams>;
  private ready: boolean = false;
  private pendingResolve: ((v: string) => void) | null = null;
  private pendingReject: ((e: Error) => void) | null = null;
  private outputBuffer: string = '';

  constructor(config: InferenceConfig) {
    this.modelPath = config.modelPath;
    this.nCtx = config.nCtx || 2048;
    this.nThreads = config.nThreads || 4;
    this.params = { ...DEFAULT_PARAMS, ...config.defaultParams };
  }

  async initialize(): Promise<void> {
    if (!existsSync(this.modelPath)) {
      throw new Error(`Model file not found at ${this.modelPath}. Please download a GGUF model.`);
    }

    const scriptPath = join(import.meta.dir, 'llm_infer.py');
    const script = this.getPythonScript();
    const { writeFileSync } = await import('fs');
    writeFileSync(scriptPath, script, 'utf8');

    return new Promise((resolve, reject) => {
      this.process = spawn('python', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.stdout?.setEncoding('utf8');
      this.process.stderr?.on('data', (d) => console.error(JSON.stringify({ type: 'llm-error', message: d.toString() })));

      this.process.stdout?.on('data', (data: string) => {
        this.outputBuffer += data;
        const lines = this.outputBuffer.split('\n');
        this.outputBuffer = lines.pop() || '';
        for (const line of lines) {
          if (line.trim()) this.handleOutput(line, resolve, reject);
        }
      });

      this.process.on('error', reject);
      this.process.on('close', () => { this.ready = false; this.process = null; });

      setTimeout(() => {
        if (!this.ready) reject(new Error('LLM init timeout'));
      }, 60000);
    });
  }

  private getPythonScript(): string {
    return `
import sys
import json
import ctypes
import struct
import os
import time
import re
import math

try:
    import llama_cpp
    from llama_cpp import Llama
    USE_LLAMA_CPP = True
except ImportError:
    USE_LLAMA_CPP = False

model = None
config = {}

def load_model(path, n_ctx, n_threads):
    global model
    if USE_LLAMA_CPP:
        model = Llama(model_path=path, n_ctx=n_ctx, n_threads=n_threads)
        return True
    return False

def generate(prompt, temperature, top_p, max_tokens, repeat_penalty):
    if USE_LLAMA_CPP and model:
        output = model.create_chat_completion(
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=top_p,
            repeat_penalty=repeat_penalty,
            stop=["</s>", "User:"],
        )
        return output['choices'][0]['message']['content']
    return '{"error": "No model loaded"}'

for line in sys.stdin:
    line = line.strip()
    if not line:
        continue
    try:
        data = json.loads(line)
        t = data.get('type')
        if t == 'init':
            ok = load_model(data.get('model_path'), data.get('n_ctx', 2048), data.get('n_threads', 4))
            config.update(data)
            print(json.dumps({'type': 'init', 'success': ok, 'model_loaded': ok}))
        elif t == 'generate':
            start = time.time()
            result = generate(
                data.get('prompt', ''),
                data.get('temperature', 0.1),
                data.get('top_p', 0.9),
                data.get('max_tokens', 512),
                data.get('repeat_penalty', 1.1),
            )
            duration = int((time.time() - start) * 1000)
            print(json.dumps({'type': 'result', 'text': result, 'duration_ms': duration}))
        elif t == 'ping':
            print(json.dumps({'type': 'pong', 'ready': model is not None}))
        elif t == 'shutdown':
            break
    except Exception as e:
        print(json.dumps({'type': 'error', 'error': str(e)}), file=sys.stderr)
    sys.stdout.flush()
`;
  }

  private handleOutput(line: string, resolve: (v: string) => void, reject: (e: Error) => void): void {
    try {
      const data = JSON.parse(line);
      if (data.type === 'init') {
        this.ready = data.success;
        if (data.success) resolve();
        else reject(new Error('Model failed to load'));
      } else if (data.type === 'result') {
        if (this.pendingResolve) {
          this.pendingResolve(data.text);
          this.pendingResolve = null;
        }
      } else if (data.type === 'pong') {
        this.ready = data.ready;
      } else if (data.type === 'error') {
        if (this.pendingReject) {
          this.pendingReject(new Error(data.error));
          this.pendingReject = null;
        }
      }
    } catch { /* ignore */ }
  }

  private async send(message: object): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.process?.stdin) { reject(new Error('Process not running')); return; }
      const msg = JSON.stringify(message) + '\n';
      this.process.stdin.write(msg, (err) => { if (err) reject(err); else resolve(); });
    });
  }

  async generate(prompt: string, params?: InferenceParams): Promise<string> {
    if (!this.ready) throw new Error('LLM not initialized');
    const p = { ...this.params, ...params };
    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;
      this.send({ type: 'generate', prompt, ...p });
      setTimeout(() => {
        if (this.pendingReject) { this.pendingReject(new Error('Inference timeout')); this.pendingReject = null; }
      }, 30000);
    });
  }

  parseRiskAssessment(raw: string, fallbackScore?: number): RiskAssessment {
    try {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        let score = typeof parsed.risk_score === 'number' ? parsed.risk_score : 0;
        let level: 'low' | 'medium' | 'high' = parsed.risk_level || 'medium';
        if (score < 0) score = 0;
        if (score > 1) score = 1;
        if (score <= 0.33) level = 'low';
        else if (score <= 0.66) level = 'medium';
        else level = 'high';
        return { risk_score: Math.round(score * 1000) / 1000, risk_level: level, reasoning: parsed.reasoning || 'Assessment generated' };
      }
    } catch { /* parse failed */ }

    const scoreMatch = raw.match(/(\d+\.?\d*)/);
    let score = fallbackScore ?? 0.5;
    if (scoreMatch) score = parseFloat(scoreMatch[1]);
    if (score < 0) score = 0;
    if (score > 1) score = 1;
    let level: 'low' | 'medium' | 'high' = 'medium';
    if (score <= 0.33) level = 'low';
    else if (score <= 0.66) level = 'medium';
    else level = 'high';
    return { risk_score: score, risk_level: level, reasoning: 'Unable to parse full response', is_fallback: true };
  }

  isReady(): boolean { return this.ready; }
  getParams(): Required<InferenceParams> { return { ...this.params }; }

  async shutdown(): Promise<void> {
    if (this.process) {
      try { await this.send({ type: 'shutdown' }); await new Promise(r => setTimeout(r, 500)); this.process?.kill(); } catch { /* ignore */ }
    }
  }
}
