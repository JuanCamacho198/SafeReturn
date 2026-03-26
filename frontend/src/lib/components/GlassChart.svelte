<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte';
  import { Chart, registerables } from 'chart.js';
  
  const dispatch = createEventDispatcher();
  
  Chart.register(...registerables);

  export let type: 'line' | 'bar' = 'line';
  export let data: any;
  export let options: any = {};
  export let title: string = '';
  export let loading: boolean = false;

  let canvas: HTMLCanvasElement;
  let chart: Chart | null = null;

  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor: '#ffffff',
        titleColor: '#0f172a',
        bodyColor: '#64748b',
        borderColor: '#e2e8f0',
        borderWidth: 1,
        padding: 10,
        displayColors: true,
        boxPadding: 4,
        usePointStyle: true,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Inter', sans-serif",
            size: 11
          }
        },
      },
      y: {
        grid: {
          color: '#f1f5f9',
          borderDash: [5, 5],
        },
        ticks: {
          color: '#94a3b8',
          font: {
            family: "'Inter', sans-serif",
            size: 11
          },
          padding: 10
        },
        border: {
          display: false,
        },
      },
    },
    elements: {
      line: {
        tension: 0.4,
        borderWidth: 3,
        borderColor: '#0ea5e9',
        fill: true,
      },
      point: {
        radius: 0,
        hoverRadius: 6,
        backgroundColor: '#0ea5e9',
        borderWidth: 2,
        borderColor: '#ffffff',
        hoverBorderWidth: 3,
      },
      bar: {
        borderRadius: 4,
        backgroundColor: '#0ea5e9',
        hoverBackgroundColor: '#0284c7',
      },
    },
    interaction: {
      mode: 'nearest' as const,
      axis: 'x' as const,
      intersect: false
    }
  };

  $: finalOptions = { 
      ...baseOptions, 
      ...options, 
      plugins: { ...baseOptions.plugins, ...options.plugins }, 
      scales: { 
          x: { ...baseOptions.scales.x, ...(options.scales?.x || {}) },
          y: { ...baseOptions.scales.y, ...(options.scales?.y || {}) }
      } 
  };

  function createChart() {
    if (chart) {
      chart.destroy();
    }
    if (canvas && data) {
      chart = new Chart(canvas, {
        type: type === 'line' ? 'line' : 'bar',
        data: data,
        options: finalOptions
      });
    }
  }

  $: if (data && canvas) {
    createChart();
  }

  onMount(() => {
    createChart();
    return () => {
      if (chart) chart.destroy();
    };
  });
</script>

<div class="card p-6 h-full flex flex-col">
  <div class="mb-6 flex items-center justify-between">
    {#if loading}
      <div class="h-6 w-1/3 animate-pulse rounded bg-slate-100"></div>
    {:else}
      <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
      <button on:click={() => dispatch('enlarge')} class="text-slate-400 hover:text-sky-600 transition-colors focus:outline-none" title="Expandir vista">
        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
           <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
        </svg>
      </button>
    {/if}
  </div>

  <div class="relative grow min-h-62.5 w-full">
    {#if loading}
      <div class="h-full w-full animate-pulse rounded-lg bg-slate-50 border border-slate-100"></div>
    {:else}
      <canvas bind:this={canvas}></canvas>
    {/if}
  </div>
</div>
