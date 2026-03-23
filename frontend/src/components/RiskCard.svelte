<script lang="ts">
  export let score: number = 0;
  export let explanation: string = '';
  
  $: isHighRisk = score >= 0.7;
  $: isMediumRisk = score >= 0.4 && score < 0.7;
  $: riskColor = isHighRisk ? 'text-red-600 bg-red-50' : (isMediumRisk ? 'text-yellow-600 bg-yellow-50' : 'text-green-600 bg-green-50');
  $: riskLabel = isHighRisk ? 'High Risk' : (isMediumRisk ? 'Medium Risk' : 'Low Risk');
</script>

<div class="card {riskColor} border-2">
  <div class="text-xs font-semibold uppercase tracking-wide mb-2">{riskLabel}</div>
  <div class="text-4xl font-bold mb-2">{(score * 100).toFixed(0)}%</div>
  <div class="text-sm opacity-80">30-Day Readmission</div>
  {#if explanation}
    <div class="mt-4 pt-4 border-t border-current/20 text-xs">
      {explanation}
    </div>
  {/if}
</div>
