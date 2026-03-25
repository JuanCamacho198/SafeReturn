# Design: api-risk-assessment

## Technical Approach

Implementar el comando `assess_risk` en el backend de Tauri (Rust) que:
1. Reciba patient_id del frontend
2. Cargue la API key de Groq desde settings o use la proporcionada
3. Lea los datos clínicos del paciente desde synthetic_patients.json
4. Construya un prompt con la información clínica
5. Llame a la API de Groq (chat completions)
6. Parse la respuesta y retorne riskScore, explanation, fragments
7. Si falla, usar fallback basado en datos sintéticos

## Architecture Decisions

### Decision: Groq API over Local LLM

**Choice**: Usar Groq API con modelo llama-3.1-70b-versatile
**Alternatives considered**: 
- Local llama.cpp (ya especificado en LLM-001 original)
- HuggingFace Inference API
- OpenAI API
**Rationale**: Groq ofrece inferencia rápida y económica, ya tenemos API key configurada en settings

### Decision: Load synthetic data from JSON in Rust

**Choice**: Leer synthetic_patients.json directamente en el backend de Tauri
**Alternatives considered**: 
- Pasar todos los datos del paciente desde el frontend
- Crear un endpoint HTTP interno
**Rationale**: El frontend ya tiene los datos, pero el comando de Tauri necesita tener la lógica de prompting. Mássimple leer el JSON en Rust y mantener la lógica de prompt en el backend.

### Decision: Reqwest for HTTP calls

**Choice**: Usar la librería `reqwest` para llamadas HTTP a Groq
**Alternatives considered**: 
- ureq (sync only)
- nativo std::net::TcpStream
**Rationale**: reqwest es el estándar de facto en Rust, tiene soporte async y JSON integrado

### Decision: Fallback with clinical rules

**Choice**: Fallback basado en reglas clínicas simples (no mock aleatorio)
**Alternatives considered**: 
- Mock aleatorio (actual)
- Retornar error directamente
**Rationale**: Mejor UX - el usuario aún obtiene una evaluación útil basada en datos reales del paciente

## Data Flow

```
Frontend (Svelte)
    │
    ▼ invoke('assess_risk', { payload: { id, apiKey } })
    │
Tauri Command (Rust)
    │
    ├──► Load API key from settings (or use provided)
    │
    ├──► Load patient data from synthetic_patients.json
    │
    ├──► Build clinical prompt
    │
    ├──► Call Groq API (POST /v1/chat/completions)
    │
    ├──► Parse JSON response
    │
    └──► Return { riskScore, explanation, fragments }
    
    [If error] → Fallback: clinical rules from patient data
```

## File Changes

| File | Action | Description |
|------|--------|-------------|
| `src-tauri/Cargo.toml` | Modify | Agregar dependencias: reqwest, tokio |
| `src-tauri/src/lib.rs` | Modify | Agregar comando `assess_risk` |
| `src-tauri/src/risk.rs` | Create | Módulo para lógica de risk assessment |
| `src-tauri/src/prompt.rs` | Create | Módulo para construir prompts clínicos |
| `frontend/src/lib/api/client.ts` | No Change | Ya existe la función, solo espera implementación |

## Interfaces / Contracts

### Tauri Command: assess_risk

```rust
#[derive(Deserialize)]
struct AssessRiskPayload {
    id: String,           // patient_id
    api_key: Option<String>,  // Optional override
}

#[derive(Serialize)]
struct RiskAssessment {
    risk_score: f64,          // 0.0 - 1.0
    explanation: String,     // Descripción del riesgo
    fragments: Vec<String>,   // Evidencia clave
}

#[tauri::command]
async fn assess_risk(
    app: tauri::AppHandle,
    payload: AssessRiskPayload
) -> Result<RiskAssessment, String>
```

### Groq API Request

```rust
struct GroqRequest {
    model: "llama-3.1-70b-versatile",
    messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: USER_PROMPT }
    ],
    temperature: 0.1,
    max_tokens: 512,
    response_format: { type: "json_object" }
}
```

### Expected Groq Response

```json
{
  "risk_score": 0.72,
  "explanation": "High risk due to prior readmission history and multiple comorbidities.",
  "fragments": ["Prior readmission within 30 days", "CHF diagnosis", "Diabetes with complications"]
}
```

## Testing Strategy

| Layer | What to Test | Approach |
|-------|-------------|----------|
| Unit | Prompt construction | Verificar que el prompt incluya todos los campos del paciente |
| Unit | Response parsing | Testear parsing de JSON válido e inválido |
| Unit | Fallback logic | Verificar que las reglas clínicas generen scores apropiados |
| Integration | Tauri command | Probar que el comando se registra y responde |
| Manual | End-to-end | Click en "Ejecutar Análisis" y verificar respuesta real |

## Migration / Rollout

No migration required. Este es un comando nuevo que se adiciona al handler existente.

## Open Questions

- [ ] ¿Necesitamos agregar logging para debugging de las llamadas a Groq?
- [ ] ¿Cuántos tokens tiene el prompt con todos los datos clínicos de un paciente? ¿Cabe en el context window?
- [ ] ¿Debe el fallback mostrar un indicador visual de que no es una evaluación real? (Agregar campo `is_fallback: bool`)