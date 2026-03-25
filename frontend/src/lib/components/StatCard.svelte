<script lang="ts">
  export let title: string;
  export let value: string | number;
  export let trend: 'up' | 'down' | 'neutral' = 'neutral';
  export let trendValue: string | undefined = undefined;
  export let loading: boolean = false;
  export let icon: string | undefined = undefined;
</script>

<div class="group relative overflow-hidden rounded-2xl border border-surface-border bg-glass-gradient p-6 backdrop-blur-glass transition-all duration-300 hover:border-neon-blue/50 hover:shadow-neon-blue/20">
  <!-- Glowing orb effect -->
  <div class="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-neon-blue/5 blur-[60px] transition-opacity duration-500 group-hover:opacity-100"></div>

  {#if loading}
    <div class="animate-pulse space-y-4">
      <div class="h-4 w-1/3 rounded bg-surface-border"></div>
      <div class="h-8 w-2/3 rounded bg-surface-border"></div>
    </div>
  {:else}
    <div class="relative z-10 flex items-start justify-between">
      <div>
        <h3 class="text-sm font-medium text-gray-400">{title}</h3>
        <p class="mt-2 text-3xl font-bold text-white tracking-tight drop-shadow-[0_0_10px_rgba(255,255,255,0.3)]">
          {value}
        </p>
      </div>
      {#if icon}
        <div class="rounded-xl bg-surface p-2 text-neon-blue shadow-inner border border-surface-border/50">
          <i class={icon} style="font-size: 1.5rem;"></i>
        </div>
      {/if}
    </div>

    {#if trendValue}
      <div class="relative z-10 mt-4 flex items-center gap-2 text-sm">
        <span class:text-neon-blue={trend === 'up'} class:text-neon-pink={trend === 'down'} class:text-gray-400={trend === 'neutral'} class="flex items-center gap-1 font-medium">
          {#if trend === 'up'}
            ▲
          {:else if trend === 'down'}
            ▼
          {/if}
          {trendValue}
        </span>
        <span class="text-gray-500">vs last month</span>
      </div>
    {/if}
  {/if}
</div>
