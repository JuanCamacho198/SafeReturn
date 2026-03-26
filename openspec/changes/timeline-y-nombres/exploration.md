## Exploration: Rediseño de Línea de Tiempo, Nombres Únicos y Limpieza de Gráfico en Dashboard

### Current State
1. **Línea de Tiempo**: Actualmente `[id]/+page.svelte` renderiza los "Encounters" como tarjetas básicas horizontales apiladas. El script `seed.ts` genera notas aleatorias que son textuales, sin categorías o banderas de severidad (Verde, Azul, Amarillo, Rojo).
2. **Nombres Únicos**: `seed.ts` asigna nombres de un array estático tan solo de 10 variables (`firstNames`, `lastNames`), produciendo repeticiones masivas debido al `i % length`.
3. **Distribución de Condiciones (Dashboard)**: En `dashboard/+page.svelte`, se extrae el "conditionDistribution" como barras verticales. Si las condiciones son extremadamente largas, los nombres se montan (abarrotado) y es imposible de leer en pantallas pequeñas.

### Affected Areas
- `backend/scripts/seed.ts` — Necesitamos arrays de 100 nombres únicos (o combinaciones algorítmicas vastas) y lógica para inventar 3 a 5 "Encuentros" que sigan una narrativa temporal (ej. Chequeo -> Ajuste Médico -> Urgencia -> Alta).
- `backend/db/schema.sql` — Añadir la columna `type` a `Encounters` (`routine`, `medication`, `emergency`, `discharge`) para guiar el color de UI.
- `frontend/src/routes/patients/[id]/+page.svelte` — Reconstrucción total de la sección Timeline para usar Flexbox/Border con un diseño de *Git Commit History*.
- `frontend/src/routes/dashboard/+page.svelte` — Cambio visual del gráfico (ej. truncado de labels o cambio a gráfico horizontal/Doughnut si es más legible).

### Approaches
1. **Rediseño con tipo nativo en DB** — Modificar `Encounters` y reconstruir el Svelte component con CSS Tailwind. Para nombres, usar `faker` o arrays extensos combinados. Para gráfico, usar IndexAxis 'y' (barras horizontales) que permiten leer labels largos.
   - Pros: Correcto desde la raíz, diseño limpio, escalable.
   - Cons: Hay que regenerar BD y ajustar un poco de CSS para el Git-timeline.
   - Effort: Medium

### Recommendation
Usar Approach 1 completo. Un rediseño CSS nativo en Tailwind con el componente Svelte; Ingesta de arrays combinatorios `Nombres x Apellidos` (ej: 15 nombres y 15 apellidos generan 225 únicos) para no repetir, y cambio de IndexAxis en Chart.js para el gráfico de barras.

### Risks
- Modificar schema implica otra base de datos de 0, lo cual el usuario debe conocer.

### Ready for Proposal
Yes
