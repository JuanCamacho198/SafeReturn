# Proposal: Timeline Timeline Visual, Nombres Únicos y Dashboard Chart

## Intent

Mejorar drásticamente la UX visual: 
1. Convertir la historia clínica en algo similar a un Git Log (línea vertical con puntos de colores que indican severidad/tipo de evento).
2. Aumentar el realismo eliminando pacientes duplicados falsos mediante combinaciones de nombres algorítmicamente únicos.
3. Despejar el dashboard haciendo que la gráfica de distribución de condiciones se entienda a simple vista.

## Scope

### In Scope
- **Backend/DB**: Añadir propiedad opcional `event_type` a Encounters. Actualizar `schema.sql` y TS. Las opciones válidas serán `discharge` (verde), `routine` (azul), `medication` (amarillo), `emergency` (rojo).
- **Backend/Seed**: Actualizar `seed.ts` para crear una *historia cronológica real* por paciente, inyectando eventos variados con el `event_type` adecuado. Expandir nombres usando dos listas (20 nombres x 20 apellidos) y cruzarlas aleatoriamente garantizando sets únicos.
- **Frontend/Paciente**: Reemplazar las tarjetas de "Clinical History" por una barra estructurada vertical con nodos usando Tailwind CSS (`border-l-2`, circulos absolutos).
- **Frontend/Dashboard**: Alterar la configuración estática de `Chart.js` en `+page.svelte` cambiando el tipo de gráfico o volcándolo horizontalmente (`indexAxis: 'y'`) para que los nombres largos de condiciones quepan en la izquierda, y ajustar sus márgenes.

### Out of Scope
- Migración de datos vivos: Destruiremos la SQLite actual (al ser dev) y se regenerará al 100%.

## Approach

1. Modificaremos `schema.sql` y `index.ts` del sidecar para lidiar con el string `event_type`.
2. Haremos upgrade del generador `seed.ts` con rutinas que escriben historiales ("routine check", seguidos a los días por "medication adjustment", y luego quizás "emergency" o "discharge").
3. Reescribiremos la UI del `timeline` en Svelte aprovechando SVG circles o elementos absolutizados a una linea Tailwind.
4. Ajustaremos el Bar Chart de Chart.JS agregando la opción `{ indexAxis: 'y' }` y deshabilitando guías sobrantes.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/db/schema.sql` | Modified | Add `event_type` a Encounters. |
| `backend/scripts/seed.ts` | Modified | Algoritmo de Nombres + Historias Falsas estructuradas por severidad. |
| `frontend/src/routes/dashboard/+page.svelte` | Modified | Eje de Chart.js vertical -> horizontal. |
| `frontend/src/routes/patients/[id]/+page.svelte` | Modified | Refactor masivo del componente Timeline History + colores. |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Interrupción visual en móviles | Medium | Ocultar linea base en móvil si es necesario, usar márgenes responsivos (`ml-4 lg:ml-8`). |

## Rollback Plan
El código de diseño UI será testeado in-place; si se ve comprometido, podemos revertir al layout original simple en un commit de git.

## Success Criteria
- [ ] Listado de pacientes no incluye 5 "Mary Johnson".
- [ ] La historia muestra una bella línea vertical izquierda conectando cada evento temporal.
- [ ] Los puntos varían entre rojo, azul, verde y amarillo de acuerdo a la leyenda.
- [ ] Gráfico de Distribución en el dashboard se ve limpio en los textos.
