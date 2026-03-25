<script lang="ts">
  import { Line, Bar } from 'svelte-chartjs';
  import '../chartConfig'; // Register components

  export let type: 'line' | 'bar' = 'line';
  export let data: any;
  export let options: any = {};
  export let title: string = '';
  export let loading: boolean = false;

  // Base options for the neon look
  const baseOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false, // Cleaner look by default
      },
      tooltip: {
        backgroundColor: 'rgba(10, 10, 14, 0.9)',
        titleColor: '#fff',
        bodyColor: '#9ca3af',
        borderColor: 'rgba(255, 255, 255, 0.1)',
        borderWidth: 1,
        padding: 10,
        displayColors: false,
      },
    },
    scales: {
      x: {
        grid: {
          display: false,
        },
        ticks: {
          color: '#6b7280',
        },
      },
      y: {
        grid: {
          color: 'rgba(255, 255, 255, 0.05)',
        },
        ticks: {
          color: '#6b7280',
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
        borderColor: '#00f3ff', // Neon Blue default
        backgroundColor: (context: any) => {
          const ctx = context.chart.ctx;
          const gradient = ctx.createLinearGradient(0, 0, 0, 400);
          gradient.addColorStop(0, 'rgba(0, 243, 255, 0.2)');
          gradient.addColorStop(1, 'rgba(0, 243, 255, 0)');
          return gradient;
        },
        fill: true,
      },
      point: {
        radius: 0,
        hoverRadius: 6,
        backgroundColor: '#00f3ff',
        borderWidth: 0,
      },
      bar: {
        borderRadius: 4,
        backgroundColor: '#00f3ff',
        hoverBackgroundColor: '#b026ff', // Neon Purple on hover
      },
    },
  };

  // Deep merge or simple spread (simple spread for now, can be improved if complex merging needed)
  $: finalOptions = { ...baseOptions, ...options, plugins: { ...baseOptions.plugins, ...options.plugins }, scales: { ...baseOptions.scales, ...options.scales } };
</script>

<div class="h-full w-full overflow-hidden rounded-2xl border border-surface-border bg-glass-gradient p-6 backdrop-blur-glass shadow-glass transition-all hover:border-neon-blue/30">
  <div class="mb-4 flex items-center justify-between">
    {#if loading}
      <div class="h-6 w-1/3 animate-pulse rounded bg-surface-border"></div>
    {:else}
      <h3 class="text-sm font-medium text-gray-400">{title}</h3>
    {/if}
  </div>

  <div class="relative h-64 w-full">
    {#if loading}
      <div class="h-full w-full animate-pulse rounded-lg bg-surface/50"></div>
    {:else}
      {#if type === 'line'}
        <Line {data} options={finalOptions} />
      {:else if type === 'bar'}
        <Bar {data} options={finalOptions} />
      {/if}
    {/if}
  </div>
</div>
