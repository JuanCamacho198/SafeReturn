## Exploration: Fallback del Frontend, Leyenda de Timeline y Componente de Gráfico Ampliable

### Current State
1. **Clinical Timeline Vacía**: El frontend llama a `invoke('get_patient')`, pero al NO existir dicho comando en `lib.rs`, la app cae en un bloque `catch` (Fallback) dentro de `client.ts` leyendo el archivo duro `synthetic_patients.json`. Este JSON *no tiene* el array `encounters` que creamos localmente en SQLite, y por ende, la UI de la línea de tiempo se rompe vacía.
2. **Medicinas excesivas**: El archivo duro de JSON sigue mandando todas las medicinas (10-16).
3. **Dashboards fijos**: Los gráficos son fijos en tamaño y no tienen opción para "ampliar" (Full screen modal).
4. **Leyenda de colores**: No existe UI indicando el código de colores del timeline.

### Affected Areas
- `frontend/src/lib/api/client.ts` — El fallback usa `synthetic_patients.json`. Necesitamos que el mock invente los encounters temporalmente allí O exponer el comando a Tauri. Por simplicidad e inmediatez en entorno de demostración sin alterar extensas lineas de Rust IPC que el backend original omitió, inventaremos la simulación de historia clínica directo en TypeScript `client.ts` para que Svelte lo renderice idéntico a SQLite.
- `frontend/src/routes/dashboard/+page.svelte` y `GlassChart.svelte` — Crear un botón `<button>` de expandir y un Svelte Portal/Modal.
- `frontend/src/routes/patients/[id]/+page.svelte` — Restringir `patient.medications.slice(0, 4)`. Agregar parentesis a "(vía: {route})" y pintar la Leyenda HTML.

### Approaches
1. **(Rust Backend IPC)** Construir `get_patients`, `get_patient`, `get_metrics` para Rust->Bun(Sidecar)->SQLite. Mucho overhead y propenso a romper la base.
2. **(Frontend Hydration)** Aprovechar el `catch` de `client.ts` que ya diseñaron para hidratar en vivo el mock, devolviendo `encounters` generados dinámicamente con los colores, las banderas `high/low` y recortando medicamentos a máximo 5. Cero dolor de cabeza de IPC.

### Recommendation
Usar Approach 2. Expandir el "Hydration" de Mock en `client.ts` aplicando la misma lógica algorítmica de Fisher-Yates, los laboratorios alterados y la fabricación dinámica de historiales clínicos ("routine", "medication", "emergency", "discharge") de forma que sirva el dashboard perfecto. Luego agregar el modal para los gráficos, y la leyenda HTML al Timeline.

### Ready for Proposal
Yes
