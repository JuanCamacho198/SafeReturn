# Tasks: Timeline y Nombres

- [x] 1. Modificar `schema.sql` agregando `event_type TEXT` a `Encounters`.
- [x] 2. Modificar `seed.ts` incluyendo arrays hiper-largos de nombres/apellidos, randomizados *Fisher-Yates* para unicidad.
- [x] 3. Modificar `seed.ts` inventando eventos médicos reales y variados (con severidad/tipo y fechas congruentes) asignando su respectivo `event_type`.
- [x] 4. Regnerar base de datos (`backend/storage.sqlite` y AppData).
- [x] 5. Actualizar interfaz JSON en frontend: añadir `type` u `eventType` a `Encounter` interface en TS (si existe tipada genéricamente).
- [x] 6. En `dashboard/+page.svelte`, editar `Chart` para usar el dataset horizontal `indexAxis: 'y'`.
- [x] 7. En `[id]/+page.svelte`, rediseñar enteramente el contenedor `Clinical History` para representar una línea tipo tren/commits usando pseudoclases o bordes absolutos con colores atados a `event_type`.
