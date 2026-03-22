// Groq API integration for LLM inference
// Uses environment variable GROQ_API_KEY for authentication

interface GroqResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class GroqLLM {
  private apiKey: string;
  private model: string;

  constructor(apiKey?: string, model: string = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey || process.env.GROQ_API_KEY || '';
    this.model = model;
  }

  async predict(prompt: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('GROQ_API_KEY not configured. Set GROQ_API_KEY environment variable.');
    }

    try {
      const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a clinical assistant analyzing patient records for readmission risk prediction. Provide clear, evidence-based assessments.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 500
        })
      });

      if (!response.ok) {
        throw new Error(`Groq API error: ${response.status}`);
      }

      const data: GroqResponse = await response.json();
      return data.choices[0]?.message?.content || 'No response generated';
    } catch (error) {
      console.error('LLM prediction failed:', error);
      throw error;
    }
  }
}
