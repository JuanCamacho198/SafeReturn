# Design: Paridad de Fallback Frontend y UI

## 1. Mock de `getPatient` en `client.ts`
Agregaremos un algoritmo de generación de historiales clonado pero en puro JS que corre solo si el IPC del backend no se ejecuta (Modo Demo Offline).
- Tomar `medications` y recortarlas aleatoriamente a 2 o 4 (en vez de 16).
- Tomar `lab_results`, inyectando las banderas (`normal`, `high`, `low`) estáticas multiplicando un poco su valor si hace falta.
- Inventar el Array de `encounters` que contenga:
  1. Routine (Azul) - X días atrás
  2. Medication (Amarillo) - X+5 días
  3. Emergency (Rojo) / Routine (Azul) - Dependiendo del flag `readmitted`.
  4. Discharge (Verde) - Último evento.

## 2. Gráfico Modal en `dashboard/+page.svelte`
Diseñar un Portal/Modal simple de Svelte 5.
```svelte
{#if expandChart === 'distribution'}
  <div class="fixed inset-0 bg-slate-900/50 z-50 p-8 flex items-center justify-center backdrop-blur-sm" transition:fade>
    <div class="bg-white p-6 rounded-2xl w-full h-[80vh] flex flex-col shadow-2xl relative">
       <button ... Cerrar />
       <GlassChart {data} {options} />
    </div>
  </div>
{/if}
```

## 3. UI en Detalles de Pacientes `[id]/+page.svelte`
- Route de medicamento: A la celda que muestra `{med.route}`, le pondremos `(vía: {med.route})`.
- Leyenda de colores: Encima del bucle `{#each}`, una fila de chips usando los colores CSS definidos (`sky-500`, `amber-400`, `rose-500`, `emerald-500`).
