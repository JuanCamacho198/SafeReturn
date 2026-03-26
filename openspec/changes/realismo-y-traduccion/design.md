# Design: Realismo e i18n en Base de Datos y RAG

## 1. Realismo en SQLite
Actualmente, `getPatientById` en SQLite solo devuelve el paciente y sus encuentros (`encounters`). La UI no muestra medicaciones ni laboratorios porque en la base real no existen (sólo en el mock).
Para arreglar esto y cumplir el requerimiento de aleatoriedad:
- **Estructura**: Añadiremos las tablas `Medications` y `LabResults` en `schema.sql`.
- **Aleatoriedad (Seed)**: En `seed.ts`, asignaremos entre 0 a 5 medicamentos al azar seleccionados de `synthetic_patients.json`. Para los laboratorios, insertaremos registros aleatorios variando la propiedad `flag` de manera probabilística (por ejemplo, 30% de `high` o `low`, resto normal).
- **Backend Service**: `getPatientById` hará consultas adicionales para hidratar `medications` y `lab_results` en el JSON devuelto.

## 2. i18n en Frontend
La página `frontend/src/routes/patients/[id]/+page.svelte` tiene múltiples bloques de UI como:
- `<h2>Medications</h2>` -> `$t('patient.extended.medications')`
- `<th>Dosage</th>` -> `$t('patient.extended.dosage')`
- `<h2>Lab Results</h2>` -> `$t('patient.extended.lab_results')`
- `Readmitted`, `Days to Readmission`, `Discharge` -> Usar el objeto de traducciones.

## 3. RAG Localizado (i18n en IA)
El idioma del UI debe determinar el idioma del JSON generado por el LLM.
- **Frontend Svelte**: Leeremos `$locale` de `svelte-i18n` y se enviará en la llamada `assessRisk(patientId, undefined, $locale)`.
- **IPC Client**: Actualizar la interfaz de `assessRisk` en `client.ts` añadiendo `locale?: string`.
- **Rust Tauri**: En `lib.rs` y `risk.rs`, la estructura `AssessRiskPayload` tendrá `locale: Option<String>`. Este valor se reenviará al puerto serial JSON de stdin hacia el sidecar Bun.
- **Sidecar Bun**: `rag/orchestrator.ts` inyectará una instrucción condicional en el prompt del sistema: `RESPOND STRICTLY IN ${locale}` o similar, enfocada en la explicación del riesgo para ayudar a los clínicos nativos.

## Consideraciones de Seguridad
Ninguna alteración estructural grave. Asegurar el borrado local de `storage.sqlite` antes del re-seed.
