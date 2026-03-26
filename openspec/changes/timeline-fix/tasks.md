# Tasks: Paridad de Fallback Frontend y Aclaraciones Visules UI

- [ ] 1. `client.ts`: Reescribir la función `getPatient()` en la sección dummy data fall back para inyectar `encounters` narrativos con los de tipo de evento `routine`, `medication`, `emergency`, `discharge`.
- [ ] 2. `client.ts`: Limitar las medicaciones extraídas aleatoriamente (max 4).
- [ ] 3. `client.ts`: Alterar laboratorios asignando artificialmente `flag` a high/low un 20% de las veces.
- [ ] 4. `[id]/+page.svelte`: Cambiar la impresión de la ruta por `(vía: {med.route})`.
- [ ] 5. `[id]/+page.svelte`: Agregar la leyenda descriptiva HTML de los 4 colores del Clinical History justo encima del título de Historia.
- [ ] 6. `dashboard/+page.svelte`: Crear variable `let expandedChart: 'distribution' | 'growth' | null = null`.
- [ ] 7. `dashboard/+page.svelte`: Añadir boton de Expandir a las tarjetas que contienen los GlassChart (usando CSS absolute top right).
- [ ] 8. `dashboard/+page.svelte`: Crear el Modal contenedor de pantalla completa que renderice el respectivo Chart en grande si `expandedChart` es verdadero.
