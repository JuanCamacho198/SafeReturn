<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { assessRisk } from '$lib/api/client';
  import type { RiskAssessment } from '$lib/types/ipc';
  import RiskCard from '../../../components/RiskCard.svelte';
  import EvidencePanel from '../../../components/EvidencePanel.svelte';

  let assessment: RiskAssessment | null = null;
  let loading = true;

  $: patientId = $page.params.id ?? '';

  onMount(async () => {
    try {
      assessment = await assessRisk(patientId);
    } catch(e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-bold text-gray-800">Patient: {patientId}</h1>
    <a href="/dashboard" class="text-blue-600 hover:underline">← Back to Dashboard</a>
  </div>

  {#if loading}
    <div class="p-8 text-center text-gray-500 animate-pulse bg-white rounded-lg shadow-sm">
      Running local LLM risk assessment...
    </div>
  {:else if assessment}
    <div class="grid md:grid-cols-3 gap-6">
      <div class="md:col-span-1">
        <RiskCard score={assessment.riskScore} explanation={assessment.explanation} />
      </div>
      <div class="md:col-span-2">
        <EvidencePanel fragments={assessment.fragments} />
      </div>
    </div>
  {/if}
</div>
