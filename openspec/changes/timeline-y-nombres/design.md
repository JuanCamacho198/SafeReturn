# Design: Timeline Visual, Nombres Únicos y Dashboard Chart

## 1. Nombres Aleatorios y Únicos
Actualmente, `firstNames` y `lastNames` tienen 10 items cada uno y se usan con `i % length`, lo que repite "James Smith" cada 10 pacientes.
- Aumentaremos las listas a al menos 20x20 = 400 combinaciones.
- Cifraremos una selección aleatoria validada por un Set para garantizar que no existan colisiones entre los 100 pacientes sintéticos.

## 2. Línea de Tiempo Git-Like
El diseño `Clinical History` en `frontend/src/routes/patients/[id]/+page.svelte` requiere:
- Un contenedor `<div class="relative pl-6">`
- Un borde izquierdo vertical `<div class="absolute left-3 top-2 bottom-0 w-0.5 bg-slate-200"></div>`
- Nodos circulantes que sobresalen `<div class="absolute left-0 mt-1 h-6 w-6 rounded-full border-4 border-white {color} flex items-center justify-center"></div>` (dependiendo de `event_type`).
- Los colores serán:
  - `routine` (Azul: `bg-blue-500`)
  - `medication` (Amarillo: `bg-amber-400`)
  - `emergency` (Rojo: `bg-rose-500`)
  - `discharge` (Verde: `bg-emerald-500`)

## 3. Inventario Temporal (`seed.ts` y SQL)
En `backend/db/schema.sql`, añadimos:
`event_type TEXT DEFAULT 'routine'` en Encounters.
Dentro del bucle de encouters en `seed.ts`, inventamos una pequeña máquina de estados o randomizaciones que alterne el tipo de cita. Para un paciente, si ingresa por un dolor, un día puede tener `routine`, dos días después `medication`, y el final `discharge`.

## 4. Gráfico del Dashboard Bar Chart (`dashboard/+page.svelte`)
Dado que Chart.js empaqueta las letras pequeñas debajo del Eje X cuando hay muchos items:
- Pasaremos de `indexAxis: 'x'` (default) a `indexAxis: 'y'`.
- Estableceremos la barra para distribuir el contenedor verticalmente y que las categorías quepan y se extruyan cómodamente.
