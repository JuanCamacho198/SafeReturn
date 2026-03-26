## Exploration: Mejorar el realismo de la DB agregando aleatoriedad a medicamentos y resultados de laboratorio, e implementar internacionalización (i18n) en detalles del paciente incluyendo respuestas RAG en el idioma activo.

### Current State
1. `seed.ts`: Los pacientes sintéticos siempre tienen todos los medicamentos y resultados de laboratorios normales (hardcoded o mockeados de forma uniforme).
2. Frontend: La página de detalles del paciente (`[id]/+page.svelte`) está parcial o totalmente en inglés sin soporte completo de i18n para ciertas secciones (como Medications o Lab Results). El RAG retorna siempre en el idioma predeterminado del prompt del LLM.

### Affected Areas
- `backend/scripts/seed.ts` — Generación de base de datos sintética y lógica de sembrado de SQLite.
- `frontend/src/routes/patients/[id]/+page.svelte` — Soporte completo del diccionario i18n para los textos hardcodeados y envío de metadata.
- `backend/rag/orchestrator.ts` — Ajustar el prompt condicionado por un nuevo parámetro de idioma a recibir desde el frontend.
- `frontend/src/lib/api/client.ts` / `risk.rs` / `index.ts` — Pasar el idioma (`lang`) como parámetro por IPC hasta el sidecar.

### Approaches
1. **Población condicional de datos (Seed) + Parámetro i18n dinámico** — Randomizar la cantidad de registros por tabla (0 a N medicamentos); Agregar locale/lang en el Request del RAG para ajustar el input string del prompt.
   - Pros: Directo, aprovecha la arquitectura multi-lenguaje de LLMs.
   - Cons: Requiere actualizar la DB SQLite (seed iterativo) y la firma de contrato en múltiples puentes IPC (Svelte -> Rust -> Bun Sidecar).
   - Effort: Medium

### Recommendation
Usar el Approach 1 (Población condicional de datos + i18n dinámico). Refactorizar el IPC command `assess_risk` para que acepte un argumento opcional `language` (ej. 'es' o 'en') que llegue hasta `rag/orchestrator.ts`. Además, refinar el script `seed.ts` para randomizar las pastillas / laboratorios.

### Risks
- Romper el IPC schema si Tauri y el Sidecar terminan esperando diferentes modelos en JSON.
- Perder el estado en desarrollo de la DB (se mitiga haciendo backup de storage.sqlite o corriendo de nuevo el seed).

### Ready for Proposal
Yes
