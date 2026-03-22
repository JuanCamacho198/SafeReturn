# LLM Specification

## Purpose

Defines local LLM inference for risk score generation using llama.cpp/GGML. The LLM generates 30-day readmission probability scores based on retrieved clinical note fragments. All inference occurs locally without external API calls.

## Requirements

### Requirement: LLM-001: Local Model Loading

The system MUST load a quantized LLM model (GGUF format) from disk for local inference. The model SHALL be loaded once at application startup or first use. Supported model formats include Q4_0, Q4_1, Q5_0, Q5_1, and Q8_0 quantization. The system SHALL report the loaded model size and quantization type.

#### Scenario: Model loads successfully on first use

- GIVEN the GGUF model file exists at the configured path
- WHEN the first risk assessment request is received
- THEN the model SHALL be loaded into memory
- AND the system SHALL report model_name, quantization, and size in MB
- AND subsequent requests SHALL use the loaded model without reloading

#### Scenario: Model file not found

- GIVEN the GGUF model file does not exist at the configured path
- WHEN an inference request is made
- THEN the system SHALL return an error indicating model file missing
- AND the system SHALL provide guidance on downloading the model
- AND inference SHALL NOT proceed

### Requirement: LLM-002: Risk Score Prompt Construction

The system MUST construct prompts for risk score generation that include: patient demographics, retrieved clinical note fragments, and a structured output specification. Prompts SHALL follow a JSON schema specifying the output format. Context length MUST be managed to fit within the model's context window (truncating oldest fragments if necessary).

#### Scenario: Prompt constructed with all components

- GIVEN patient demographics, 5 retrieved fragments, and system instructions
- WHEN the prompt is constructed
- THEN the prompt SHALL include patient_name (anonymized), admission_date, primary_diagnosis
- AND the prompt SHALL include all 5 retrieved fragments with note_type and note_date
- AND the prompt SHALL end with the JSON output specification requiring risk_score and reasoning

#### Scenario: Prompt truncation due to context overflow

- GIVEN 10 retrieved fragments that exceed the model's context window
- WHEN the prompt is constructed
- THEN the system SHALL truncate fragments starting from the oldest
- AND the system SHALL retain the most recent 5 fragments that fit within context
- AND the system SHALL include a note in the response indicating truncation occurred

### Requirement: LLM-003: Risk Score Generation

The system SHALL generate a 30-day readmission probability score between 0.0 and 1.0, along with a categorical risk level (low: 0.0-0.33, medium: 0.34-0.66, high: 0.67-1.0) and brief reasoning text explaining the score. The reasoning SHALL cite specific clinical factors from the retrieved fragments.

#### Scenario: Generate high-risk score

- GIVEN a patient with fragments showing "history of 3 prior readmissions", "EF 25%", "no social support"
- WHEN the LLM generates a risk assessment
- THEN the response SHALL include risk_score >= 0.67
- AND risk_level SHALL be "high"
- AND reasoning SHALL mention prior readmissions and low ejection fraction

#### Scenario: Generate low-risk score

- GIVEN a patient with fragments showing "first admission", "stable discharge condition", "good family support"
- WHEN the LLM generates a risk assessment
- THEN the response SHALL include risk_score <= 0.33
- AND risk_level SHALL be "low"
- AND reasoning SHALL mention first admission and support system

### Requirement: LLM-004: Inference Parameters

The system MUST use sensible default inference parameters: temperature of 0.1 (low variance), top_p of 0.9, max_tokens of 512, and repeat_penalty of 1.1. Parameters SHALL be configurable via environment variables or config file.

#### Scenario: Inference uses default parameters

- GIVEN default inference parameters are configured
- WHEN a risk assessment request is made
- THEN the LLM inference SHALL use temperature=0.1, top_p=0.9, max_tokens=512
- AND results SHALL be consistent across multiple runs with identical input

#### Scenario: Custom parameters override defaults

- GIVEN a custom configuration sets temperature=0.3, max_tokens=256
- WHEN a risk assessment request is made
- THEN the inference SHALL use the custom values
- AND responses MAY show more variation than with default parameters

### Requirement: LLM-005: Inference Timing and Timeout

The system SHALL complete inference within 30 seconds for typical requests. If inference exceeds 30 seconds, the system SHALL return a timeout error with partial results if available. Inference timing SHALL be logged for performance monitoring.

#### Scenario: Inference completes within timeout

- GIVEN a risk assessment request with 5 fragments
- WHEN inference is executed
- THEN the result SHALL be returned within 30 seconds
- AND timing SHALL be logged as "inference_duration_ms"

#### Scenario: Inference timeout

- GIVEN inference has been running for 30 seconds on a large context
- WHEN the timeout is reached
- THEN the system SHALL cancel the inference
- AND the system SHALL return HTTP 504 Gateway Timeout
- AND the response SHALL indicate the inference timed out
- AND partial results SHALL be returned if the model produced any output

### Requirement: LLM-006: Fallback Scoring

If LLM inference fails (model not loaded, timeout, or error), the system SHALL fall back to a similarity-based scoring method using FAISS retrieval scores directly. The fallback SHALL compute a risk score from the average similarity scores of retrieved fragments and map to risk categories.

#### Scenario: Fallback activates on model load failure

- GIVEN the LLM model failed to load
- WHEN a risk assessment request is made
- THEN the system SHALL compute fallback_score = average(similarity_scores) * scaling_factor
- AND the response SHALL include is_fallback=true
- AND risk_level SHALL be derived from fallback_score

#### Scenario: Fallback activates on inference timeout

- GIVEN an inference request timed out
- WHEN the timeout error is returned
- THEN the system SHALL attempt fallback scoring
- AND if fallback succeeds, return risk assessment with is_fallback=true
- AND if fallback also fails, return error indicating both primary and fallback failed

### Requirement: LLM-007: Structured Output Parsing

The system MUST parse the LLM's text output into a structured JSON response with risk_score, risk_level, and reasoning fields. If JSON parsing fails, the system SHALL attempt regex extraction of numeric score and retry parsing. If all parsing fails, the system SHALL return an error with the raw output for debugging.

#### Scenario: Valid JSON output parsed correctly

- GIVEN the LLM returns valid JSON: {"risk_score": 0.72, "risk_level": "high", "reasoning": "Multiple risk factors"}
- WHEN the output is parsed
- THEN the system SHALL return structured response with all three fields populated
- AND risk_level SHALL be validated against risk_score (0.72 maps to "high")

#### Scenario: Invalid JSON with extractable score

- GIVEN the LLM returns text containing "Score: 0.65" but no valid JSON
- WHEN JSON parsing fails and regex extraction is attempted
- THEN the system SHALL extract 0.65 as risk_score
- AND risk_level SHALL be inferred from score (0.65 maps to "medium")
- AND reasoning SHALL be set to "Unable to parse full response"

### Requirement: LLM-008: Risk Score Caching

The system MAY cache risk assessment results for a given patient. Cache validity SHALL be based on: patient data unchanged, clinical notes unchanged, and retrieval results unchanged. Cache key SHALL be a hash of patient_id + note hashes. Cache TTL SHALL be configurable with default of 1 hour.

#### Scenario: Cache hit returns cached result

- GIVEN a risk assessment was computed for patient X 30 minutes ago
- WHEN the same risk assessment is requested for patient X
- THEN the system SHALL return the cached result
- AND the response SHALL include cached=true and original_timestamp

#### Scenario: Cache invalidated by note addition

- GIVEN a cached risk assessment for patient X exists
- WHEN a new clinical note is added for patient X
- THEN the cache for patient X SHALL be invalidated
- AND the next risk assessment SHALL recompute from scratch
