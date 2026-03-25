# Proposal: api-risk-assessment

## Intent

Implementar la evaluación de riesgo de readmisión hospitalaria usando la API de Groq y el sistema RAG. Actualmente, cuando el usuario hace clic en "Ejecutar Análisis" en la página de detalle del paciente, siempre retorna datos mock porque el comando `assess_risk` no está implementado en el backend de Tauri.

## Scope

### In Scope
1. **Implementar comando `assess_risk` en Tauri** - Agregar el comando Rust que receiving la llamada del frontend
2. **Integración con Groq API** - Usar la API key configurada en settings para hacer llamadas al LLM
3. **Pipeline RAG completo** - Recuperar notas clínicas relevantes, preparar prompt, obtener evaluación del LLM
4. **Manejo de errores robusto** - API key no configurada, errores de red, timeouts
5. **Fallback mejorado** - Si la API falla, usar datos mejorados del synthetic data en lugar del mock actual

### Out of Scope
- Embeddings locales (sentence-transformers) - Se usará la API de Groq directamente
- FAISS local - Por ahora solo API externa
- Modelo local (llama.cpp) - Solo API de Groq
- Guardar resultados en BD - Solo retornar al frontend

## Approach

1. **Backend Tauri**: Agregar comando `assess_risk` que:
   - Reciba patient_id y apiKey (opcional, sino la carga de settings)
   - Cargue los datos del paciente desde synthetic_patients.json
   - Construya un prompt con la información clínica del paciente
   - Llame a la API de Groq (usando el endpoint de chat completion)
   - Parse la respuesta y retorne riskScore, explanation, fragments

2. **Frontend**: Ya está configurado para llamar a assessRisk y mostrar resultados

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `frontend/src-tauri/src/lib.rs` | Modified | Agregar comando assess_risk |
| `frontend/src/lib/api/client.ts` | Modified | Actualizar fallback si es necesario |
| `frontend/src/routes/patients/[id]/+page.svelte` | No change | Ya tiene la UI correcta |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Groq API key no configurada | Medium | Mostrar mensaje claro al usuario, no fallback automático |
| API timeout | Low | Timeout de 30s, mensaje de error claro |
| Respuesta del LLM mal parseada | Medium | Validar estructura de respuesta, fallback si no es válida |
| Cuota de API agotada | Medium | Mensaje específico de cuota agotada |

## Rollback Plan

1. Si la implementación de Tauri falla: Mantener el fallback mock actual funcionando
2. Si la API de Groq falla: El comando retorna error, el frontend ya maneja errores
3. Full rollback: Restaurar el último commit donde solo hay mock data

## Dependencies

- Groq API (https://console.groq.com/docs/quick-start)
- API key almacenada en settings (groq_api_key)

## Success Criteria

- [ ] El comando `assess_risk` está registrado en Tauri
- [ ] La llamada a Groq API funciona con la API key configurada
- [ ] La respuesta del LLM se parsea correctamente (riskScore, explanation, fragments)
- [ ] Si no hay API key, muestra mensaje de error claro
- [ ] Si la API falla, el fallback usa datos mejorados del synthetic data
- [ ] La UI muestra la evaluación real (no mock) cuando funciona