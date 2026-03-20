<script lang="ts">
  import { onMount } from 'svelte';
  import { getPatients } from '$lib/api/client';
  import type { Patient } from '$lib/types/ipc';

  let patients: Patient[] = [];
  let loading = true;

  onMount(async () => {
    try {
      patients = await getPatients();
    } catch (e) {
      console.error(e);
    } finally {
      loading = false;
    }
  });
</script>

<div class="space-y-6">
  <h1 class="text-3xl font-bold text-gray-800">Patient Dashboard</h1>
  
  {#if loading}
    <p class="text-gray-500 animate-pulse">Loading patients...</p>
  {:else}
    <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {#each patients as patient}
        <a href="/patients/{patient.id}" class="block bg-white p-6 rounded-lg shadow-sm border border-gray-100 hover:shadow-md hover:border-blue-300 transition cursor-pointer">
          <h2 class="text-xl font-semibold text-blue-900">{patient.name}</h2>
          <div class="mt-2 text-sm text-gray-600 flex justify-between">
            <span>Age: {patient.age}</span>
            <span class="bg-gray-100 px-2 py-1 rounded-full">{patient.condition}</span>
          </div>
        </a>
      {/each}
    </div>
  {/if}
</div>
