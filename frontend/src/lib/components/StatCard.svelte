<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let trend: 'up' | 'down' | 'neutral' = 'neutral';
  export let trendValue: string | undefined = undefined;
  export let loading: boolean = false;
  export let icon: string | undefined = undefined;
</script>

<div class="card p-6 relative overflow-hidden group">
  {#if loading}
    <div class="animate-pulse space-y-4">
      <div class="h-4 w-1/3 rounded bg-slate-200"></div>
      <div class="h-8 w-2/3 rounded bg-slate-200"></div>
    </div>
  {:else}
    <div class="relative z-10 flex items-start justify-between">
      <div>
        <h3 class="text-sm font-medium text-slate-500 uppercase tracking-wide">{title}</h3>
        <p class="mt-2 text-3xl font-bold text-slate-900 tracking-tight">
          {value}
        </p>
      </div>
      {#if icon}
        <div class="rounded-xl bg-sky-50 p-3 text-sky-600 shadow-sm border border-sky-100">
          <i class={icon} style="font-size: 1.5rem;"></i>
        </div>
      {/if}
    </div>

    {#if trendValue}
      <div class="relative z-10 mt-4 flex items-center gap-2 text-sm">
        <span class:text-emerald-600={trend === 'up'} class:text-red-600={trend === 'down'} class:text-slate-500={trend === 'neutral'} class="flex items-center gap-1 font-medium bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
          {#if trend === 'up'}
            ▲
          {:else if trend === 'down'}
            ▼
          {/if}
          {trendValue}
        </span>
        <span class="text-slate-400">vs last month</span>
      </div>
    {/if}
  {/if}
</div>
