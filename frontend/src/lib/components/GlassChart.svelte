<script lang="ts">
  import { Line, Bar } from 'svelte-chartjs';
  import '../chartConfig'; // Register components

  export let type: 'line' | 'bar' = 'line';
  export let data: any;
  export let options: any = {};
  export let title: string = '';
  export let loading: boolean = false;

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
        callbacks: {
            labelColor: function(context: any) {
                return {
                    borderColor: context.dataset.borderColor || context.dataset.backgroundColor,
                    backgroundColor: context.dataset.backgroundColor
                };
            }
        }
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
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(14, 165, 233, 0.2)');
          gradient.addColorStop(1, 'rgba(14, 165, 233, 0)');
          return gradient;
        },
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
      mode: 'nearest',
      axis: 'x',
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
</script>

<div class="card p-6 h-full flex flex-col">
  <div class="mb-6 flex items-center justify-between">
    {#if loading}
      <div class="h-6 w-1/3 animate-pulse rounded bg-slate-100"></div>
    {:else}
      <h3 class="text-sm font-bold text-slate-700 uppercase tracking-wide">{title}</h3>
    {/if}
  </div>

  <div class="relative flex-grow min-h-[250px] w-full">
    {#if loading}
      <div class="h-full w-full animate-pulse rounded-lg bg-slate-50 border border-slate-100"></div>
    {:else}
      {#if type === 'line'}
        <Line {data} options={finalOptions} />
      {:else if type === 'bar'}
        <Bar {data} options={finalOptions} />
      {/if}
    {/if}
  </div>
</div>
