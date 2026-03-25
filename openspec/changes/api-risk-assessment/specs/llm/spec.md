# Delta for llm

## MODIFIED Requirements

### Requirement: LLM-001: Groq API Integration

The system MUST use the Groq API for LLM inference instead of local llama.cpp. The system SHALL load the API key from application settings (stored via Tauri store). The API endpoint SHALL be `https://api.groq.com/openai/v1/chat/completions` using the `llama-3.1-70b-versatile` model.

#### Scenario: Groq API called successfully

- GIVEN the Groq API key is configured in settings
- WHEN a risk assessment request is made with patient_id
- THEN the system SHALL call the Groq chat completions endpoint
- AND the request SHALL include the model `llama-3.1-70b-versatile`
- AND the response SHALL be parsed for risk_score, explanation, and fragments

#### Scenario: API key not configured

- GIVEN no Groq API key is stored in settings
- WHEN a risk assessment request is made
- THEN the system SHALL return an error with message "Groq API key not configured"
- AND the error SHALL instruct the user to configure the key in settings

---

### Requirement: LLM-002: Risk Assessment Prompt (Modified)

The system MUST construct prompts for Groq that include patient clinical data. The prompt SHALL include demographics (age, gender), diagnoses, medications, lab results, and outcomes. The prompt SHALL request JSON output with risk_score (0-1), explanation, and evidence fragments.

#### Scenario: Prompt includes all clinical data

- GIVEN a patient with 3 diagnoses, 4 medications, 5 lab results, and outcome data
- WHEN the prompt is constructed
- THEN it SHALL include all diagnoses with descriptions
- AND it SHALL include medication names and dosages
- AND it SHALL include lab results with values and flags
- AND it SHALL include outcome data (readmission history, discharge disposition)
- AND it SHALL request structured JSON output

---

### Requirement: LLM-003: Response Parsing (Modified)

The system MUST parse the Groq API JSON response into structured output. The response MUST include riskScore (number 0-1), explanation (string), and fragments (string array). If parsing fails, the system SHALL return an error with raw response for debugging.

#### Scenario: Valid JSON response parsed

- GIVEN Groq returns: {"risk_score": 0.72, "explanation": "High risk due to...", "fragments": ["prior readmission", "low EF"]}
- WHEN the response is parsed
- THEN the system SHALL return riskScore: 0.72, explanation: "High risk due to...", fragments: ["prior readmission", "low EF"]

#### Scenario: Invalid JSON response

- GIVEN Groq returns text that is not valid JSON
- WHEN parsing fails
- THEN the system SHALL return an error indicating parsing failed
- AND the raw response SHALL be included in the error for debugging

---

### Requirement: LLM-004: API Error Handling (NEW)

The system MUST handle Groq API errors gracefully. Different error types SHALL produce appropriate user-facing messages.

#### Scenario: API returns rate limit error

- GIVEN the Groq API rate limit has been exceeded
- WHEN a risk assessment request is made
- THEN the system SHALL return error "API rate limit exceeded. Please try again later."
- AND the error SHALL NOT fallback to mock data automatically

#### Scenario: API returns quota exhausted

- GIVEN the Groq account quota is exhausted
- WHEN a risk assessment request is made
- THEN the system SHALL return error "API quota exhausted. Please check your Groq account."

#### Scenario: Network timeout

- GIVEN the request to Groq times out after 30 seconds
- WHEN the timeout occurs
- THEN the system SHALL return error "API request timed out. Please try again."

---

### Requirement: LLM-005: Fallback to Enhanced Synthetic Data (NEW)

If the Groq API fails for any reason (network error, API error, parse error), the system SHALL fall back to generating a risk assessment from the patient's synthetic data. The fallback SHALL use clinical rules to determine risk level.

#### Scenario: Fallback generates risk from patient data

- GIVEN the Groq API call fails
- WHEN fallback is activated
- THEN the system SHALL examine patient.outcomes.readmitted
- AND if readmitted is true, set riskScore >= 0.7
- AND if readmitted is false and diagnoses.length <= 2, set riskScore <= 0.3
- AND generate explanation based on actual patient data fields
- AND generate fragments from diagnoses and medications

---

### Requirement: LLM-006: Tauri Command Implementation (NEW)

The system MUST implement the `assess_risk` Tauri command that bridges frontend requests to the backend logic.

#### Scenario: assess_risk command registered

- GIVEN the Tauri application is running
- WHEN invoke('assess_risk', { payload: { id, apiKey } }) is called from frontend
- THEN the command SHALL be handled by the Rust backend
- AND it SHALL load patient data, call Groq API, parse response, return result

#### Scenario: assess_risk with explicit API key

- GIVEN an explicit apiKey is passed in the payload
- WHEN the command executes
- THEN it SHALL use the provided apiKey instead of loading from settings

#### Scenario: assess_risk without API key

- GIVEN no apiKey is passed in the payload
- WHEN the command executes
- THEN it SHALL load the API key from settings using load_setting("groq_api_key")