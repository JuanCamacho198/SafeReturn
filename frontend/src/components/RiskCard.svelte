<script lang="ts">
  export let score: number;
  export let explanation: string;

  $: isHighRisk = score >= 0.7;
  $: isMediumRisk = score >= 0.4 && score < 0.7;
  $: riskColor = isHighRisk ? 'text-red-600' : (isMediumRisk ? 'text-yellow-600' : 'text-green-600');
  $: riskBg = isHighRisk ? 'bg-red-50 border-red-200' : (isMediumRisk ? 'bg-yellow-50 border-yellow-200' : 'bg-green-50 border-green-200');
</script>

<div class="p-6 rounded-lg shadow-sm border {riskBg}">
  <h3 class="text-lg font-semibold mb-2 text-gray-800">30-Day Readmission Risk</h3>
  <div class="flex items-end gap-2 mb-4">
    <span class="text-5xl font-bold {riskColor}">{(score * 100).toFixed(0)}%</span>
  </div>
  <p class="text-sm text-gray-700 leading-relaxed border-t border-black/10 pt-4 mt-2">
    <strong>LLM Analysis:</strong><br/>
    {explanation}
  </p>
</div>
