# Proposal: Paridad de Fallback Frontend y Aclaraciones Visules UI

## Intent
Hacer que todos los datos enriquecidos que diseñamos antes para la Base de Datos se evidencien de inmediato solucionando el Offline Fallback `synthetic_patients.json` en TypeScript. Agregaremos el esquema de UI solicitado (gráfico expandible, leyenda de colores, límite de medicamentos y clarificación semántica).

## Scope

### In Scope
- **Frontend/Client Mock**: Expandir `client.ts` para que, cuando lea a Mary Johnson o simule pacientes falle por falta de IPC de base de datos activa, devuelva **Encounters** construidos allí mismo con los estados de la base (routine/medication/emergency/discharge), asigne laboratorios y limite fármacos a máximo 4.
- **Leyenda del Timeline**: Insertar una caja HTML arriba del Clinical History en `[id]/+page.svelte` que explique: `Azul: Chequeo, Amarillo: Ajustes, Rojo: Emergencias, Verde: Alta`.
- **Traducción de Vía**: Editar la celda de la tabla de la página del paciente para envolver `{med.route}` con la clarificación explícita de "vía".
- **GlassChart Modal**: Modificar o envolver el llamado de `GlassChart` en `dashboard/+page.svelte` para añadir capacidad "enlarge". Usaremos un div absoluto `<div class="fixed inset-0 ...">` como modal de Svelte que renderice el gráfico grande en pantalla completa.

### Out of Scope
- Escribir `get_patient` y la tubería completa en Rust. Como el app está en *Modo Demo* activo, es preferible enriquecer el Frontend Hydration.

## Approach
1. Ir a `client.ts` al interior de `getPatient()` fallback. Mutar el objeto paciente antes del `return` forzando `.medications = medicacionesCortadas` y crear `.encounters = [ { ... }, { ... } ]` construyendo la línea de tiempo interactiva. 
2. Editar `[id]/+page.svelte` incluyendo el string en el header de History y el paréntesis para `"Vía"`.
3. Editar `dashboard/+page.svelte` agregando las variables reactivas `expandedChart = null | 'distribution' | 'growth'`, que al prenderse proyecten el Chart sobre el layout completo simulando un overlay de pantalla completa con un botón "(X) Cerrar".

## Risks
| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Complicación del dom layout | Low | Usar Z-index altos (`z-50`) fijos `fixed inset-0` de Tailwind para el gráfico. |

## Success Criteria
- [ ] Entrar a un paciente muestra un Timeline de Commits git hermoso alimentado por el mock que inventamos, luciendo de colores.
- [ ] La lista de sus medicinas será entre 3 y 5; y la tabla indicará `(vía)`.
- [ ] Existirá la leyenda explicatoria de colores que solicitaste.
- [ ] Los gráficos del dashboard permitirán abrirlos en un recuadro inmenso al centro de la pantalla.
