# Tareas para Realismo e i18n

- [x] 1. Añadir tablas `Medications` y `LabResults` a `backend/db/schema.sql`.
- [x] 2. Actualizar `backend/scripts/seed.ts` para insertar cantidades aleatorias (0-5) de medicamentos y la variedad de laboratorios con anomalías esporádicas.
- [x] 3. Modificar `backend/services/patient.ts` (`getPatientById`) para que recoja y devuelva `medications` y `lab_results` desde la BD.
- [x] 4. Regnerar en el shell: borrar `backend/storage.sqlite` y `storage.sqlite` locales, y ejecutar el nuevo `seed.ts`.
- [x] 5. Actualizar los archivos JSON de locales en el frontend (`en/index.json`, `es/index.json`) con las llaves requeridas (`patient.extended.*`).
- [x] 6. Actualizar Svelte `[id]/+page.svelte` para reemplazar los _hardcoded strings_ por `$t(...)` usando las nuevas llaves del paso 5.
- [x] 7. Modificar la función `assessRisk` invocada en `[id]/+page.svelte` para extraer la variable reacitava del idioma `$locale` y pasársela al cliente API.
- [x] 8. Actualizar `client.ts` para añadir `locale` al payload enviado por invocador de Tauri.
- [x] 9. Actualizar `src-tauri/src/lib.rs` (struct `AssessRiskPayload`) y `risk.rs` (`request` JSON array enviado por stdin) para propagar el string de `locale`.
- [x] 10. Modificar `backend/index.ts` y `backend/rag/orchestrator.ts` para capturar `locale` y agregar a la cadena de prompt del `GroqLLM` la coerción de lenguaje de salida.
