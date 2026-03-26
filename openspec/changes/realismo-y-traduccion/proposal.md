# Proposal: Realismo de DB e i18n

## Intent

Hacer que los datos simulados de HealthCare sean plausibles (no todos los pacientes tienen medicaciones constantes, introducir variedad en resultados de laboratorios con datos anormales), transicionar la UI de detalles de pacientes al soporte de traducción (i18n), e inyectar el contexto de idioma al sistema RAG para análisis localizado.

## Scope

### In Scope
- Variar la asignación de medicamentos (de 0 a max) y laboratorios por paciente.
- Distribuir resultados de laboratorio con rangos variables simulando valores anormales (`flag="high"|"low"`).
- Reemplazar textos estáticos ('Medications', 'Lab Results', 'Readmitted') por claves de internacionalización `$t(...)` en `[id]/+page.svelte`.
- Modificar el flujo de `assessRisk` para pasar el idioma activo de Svelte hacia el backend.
- Modificar el orquestador RAG para recibir idioma y hacer que el LLM responda sus conclusiones y diagnósticos en dicho idioma.

### Out of Scope
- Traducción automática de notas o resúmenes de egreso (solo la UI y el RAG assessment final se traduce).
- Refactorización de componentes globales, esto estará atado puramente a la página de paciente y el store principal de traducciones.

## Approach

1. **Seed**: Editar `seed.ts` (y potencialmente `synthetic_patients.json` mappings) para randomizar la inyección de medicaciones y random flags de laboratorios en base al paciente.
2. **Frontend UI**: Rastrear y actualizar string constants usando el helper de i18ne ya configurado localmente.
3. **Backend RAG y Contrato IPC**: Modificar `client.ts` `assessRisk(id, lang)`, `risk.rs`, `index.ts`, y `rag/orchestrator.ts` para que propaguen el campo `language`, alterando la última linea del prompt del LLM ("Respond in the corresponding language").

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/scripts/seed.ts` | Modified | Lógica de inserción aleatoria para medicamentos y laboratorios. |
| `frontend/src/routes/patients/[id]/+page.svelte` | Modified | Tokens `$t`, paso de lenguaje al endpoint de riesgo. |
| `frontend/src/lib/api/client.ts` | Modified | Schema modificado para aceptar idioma. |
| `frontend/src-tauri/src/lib.rs` / `risk.rs` | Modified | Estructura en el puente de Rust (`AssessRiskPayload`). |
| `backend/index.ts` / `rag/orchestrator.ts` | Modified | Manejo de Locale parameters en Groq prediction call. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| IPC JSON schema mismatch | Medium | Implementar TS Interfaces fuertes y alinear las definiciones Rust Serde cautelosamente en un commit unitario. |
| LLM code bleed | Low | Reforzar en el prompt que el formato JSON de retorno conserve las llaves en inglés aun si el valor del string va en español. |

## Rollback Plan

Revertir git changes de los archivos de interface (`client.ts`, `lib.rs`, `risk.rs`, `index.ts`, `orchestrator.ts`). Recrear la DB sqlite ejecutando un revert local o una copia pre-fabricada usando el seed sin randomización.

## Dependencies

- Requiere re-sembrar la SQLite de backend para ver los resultados (`storage.sqlite`).
- Requiere acceso funcional de la API de Groq para parseo multilingüe.

## Success Criteria

- [ ] Un número variado de pacientes muestran entre 0 y múltiples medicamentos al visitarlos en cascada.
- [ ] Laboratorios sintéticos muestran banderas "High"/"Low" en colores relevantes de UI.
- [ ] Los títulos "Medications" y "Lab Results" aplican i18n al cambiar el setting de página global.
- [ ] Al seleccionar Ejecutar Análisis (con locale ES o EN seleccionado), JSON `explanation` del LLM se plasma en el idioma correcto.
