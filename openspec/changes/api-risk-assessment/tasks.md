# Tasks: api-risk-assessment

## Task List

### Phase 1: Dependencies & Setup
- [ ] **1.1** Agregar `reqwest` y `tokio` a `Cargo.toml` (dependencies)
- [ ] **1.2** Crear módulo `src/prompt.rs` - funciones para construir prompts clínicos
- [ ] **1.3** Crear módulo `src/risk.rs` - lógica de risk assessment
- [ ] **1.4** Actualizar `src/lib.rs` para incluir los nuevos módulos

### Phase 2: Core Implementation
- [ ] **2.1** Implementar función `load_patient_data(patient_id)` en `risk.rs` - leer synthetic_patients.json
- [ ] **2.2** Implementar función `build_clinical_prompt(patient)` en `prompt.rs` - construir prompt para Groq
- [ ] **2.3** Implementar función `call_groq_api(api_key, prompt)` en `risk.rs` - llamada HTTP a Groq
- [ ] **2.4** Implementar función `parse_groq_response(response)` en `risk.rs` - parsear JSON
- [ ] **2.5** Implementar función `fallback_assessment(patient)` en `risk.rs` - fallback con reglas clínicas

### Phase 3: Tauri Command
- [ ] **3.1** Implementar comando `assess_risk` en `lib.rs`
- [ ] **3.2** Registrar el comando en el invoke_handler
- [ ] **3.3** Probar que cargo build compila sin errores

### Phase 4: Integration & Testing
- [ ] **4.1** Verificar que la app compila: `cd src-tauri && cargo build`
- [ ] **4.2** Test manual: hacer click en "Ejecutar Análisis" en patient detail
- [ ] **4.3** Verificar que se muestra la evaluación real (no mock)
- [ ] **4.4** Probar caso de error: API key no configurada

---

## Implementation Order

1. **1.1**: Agregar dependencias primero (necesario para compilar)
2. **1.2-1.4**: Crear módulos y actualizar lib.rs
3. **2.1-2.5**: Implementar la lógica core (riesgo, prompt, API, fallback)
4. **3.1-3.3**: Crear y registrar el comando de Tauri
5. **4.1-4.4**: Compilar y probar manualmente

## Dependencies Between Tasks

- 2.2 depende de 2.1 (tener datos del paciente para construir prompt)
- 2.3 depende de 2.2 (tener prompt para llamar API)
- 2.4 depende de 2.3 (tener respuesta de API para parsear)
- 2.5 es independiente (fallback)
- 3.1 depende de todos los de fase 2 (necesita las funciones)