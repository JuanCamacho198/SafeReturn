<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getPatient, assessRisk } from '$lib/api/client';
  import type { Patient, RiskAssessment } from '$lib/types/ipc';
  import { fade, fly } from 'svelte/transition';

  // Components (keeping local for simplicity or importing if complex)
  // Re-using existing components where possible, but refining here for the new theme
  
  let patient: Patient | null = null;
  let assessment: RiskAssessment | null = null;
  let loading = true;
  let error: string | null = null;
  let assessingRisk = false;

  $: patientId = $page.params.id ?? '';

  async function loadData() {
    loading = true;
    error = null;
    try {
      console.log('Fetching patient:', patientId);
      patient = await getPatient(patientId);
      console.log('Patient data:', patient);
    } catch (e) {
      console.error('Error fetching patient:', e);
      error = "Failed to load patient data. Please try again.";
    } finally {
      loading = false;
    }
  }

  async function handleRiskAssessment() {
    if (!patient) return;
    assessingRisk = true;
    try {
      assessment = await assessRisk(patient.id);
    } catch (e) {
      console.error('Error assessing risk:', e);
      // Optional: Show toast or inline error for risk assessment
    } finally {
      assessingRisk = false;
    }
  }

  onMount(() => {
    loadData();
  });

  // Helper for dates
  function formatDate(dateStr?: string) {
    if (!dateStr) return 'N/A';
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  }
</script>

<div class="min-h-screen bg-slate-50 pb-12">
  <!-- Top Navigation / Breadcrumbs -->
  <div class="bg-white border-b border-slate-200 px-6 py-4">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <a href="/dashboard" class="text-slate-500 hover:text-sky-600 transition-colors flex items-center font-medium">
          <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-1" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clip-rule="evenodd" />
          </svg>
          Back to Dashboard
        </a>
      </div>
      <div>
        <!-- Potential Actions like Edit Patient -->
      </div>
    </div>
  </div>

  {#if loading}
    <div class="max-w-7xl mx-auto px-6 py-12 flex justify-center">
      <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-sky-500"></div>
    </div>
  {:else if error}
    <div class="max-w-7xl mx-auto px-6 py-12">
      <div class="bg-red-50 border-l-4 border-red-500 p-4 rounded-md">
        <div class="flex">
          <div class="flex-shrink-0">
            <svg class="h-5 w-5 text-red-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
              <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />
            </svg>
          </div>
          <div class="ml-3">
            <p class="text-sm text-red-700 font-medium">
              {error}
            </p>
          </div>
        </div>
      </div>
    </div>
  {:else if patient}
    <div class="max-w-7xl mx-auto px-6 py-8 space-y-8" in:fade={{ duration: 300 }}>
      
      <!-- Patient Header -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight">
            {patient.name || patient.first_name + ' ' + patient.last_name || 'Unknown Patient'}
          </h1>
          <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500 font-medium">
            <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded">MRN: {patient.mrn || 'N/A'}</span>
            <span>•</span>
            <span>{patient.gender || 'Unknown'}</span>
            <span>•</span>
            <span>{patient.age ? `${patient.age} yrs` : 'Age N/A'}</span>
            <span>•</span>
            <span>DOB: {formatDate(patient.dob)}</span>
          </div>
        </div>
        <div class="flex items-center gap-3">
            <!-- Status Badge Placeholder -->
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                Active Patient
            </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Left Column: Clinical History -->
        <div class="lg:col-span-2 space-y-8">
          
          <!-- Encounters / Timeline -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-slate-800 flex items-center">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-sky-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Clinical Timeline
              </h2>
              <span class="text-sm text-slate-500">{patient.encounters?.length || 0} Encounters</span>
            </div>

            {#if patient.encounters && patient.encounters.length > 0}
              <div class="space-y-4">
                {#each patient.encounters as encounter}
                  <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                    <div class="absolute top-0 left-0 w-1 h-full bg-sky-500"></div>
                    <div class="ml-3">
                      <div class="flex justify-between items-start mb-2">
                        <div>
                          <h3 class="font-semibold text-slate-800 text-lg">{encounter.diagnosis || 'General Checkup'}</h3>
                          <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
                            {formatDate(encounter.admission_date)}
                            {#if encounter.discharge_date} - {formatDate(encounter.discharge_date)}{/if}
                          </p>
                        </div>
                        <span class="text-xs bg-sky-50 text-sky-700 px-2 py-1 rounded font-medium border border-sky-100">
                          Encounter #{encounter.id.substring(0, 6)}
                        </span>
                      </div>
                      
                      {#if encounter.notes}
                        <div class="mt-3 text-slate-600 text-sm leading-relaxed bg-slate-50 p-3 rounded border border-slate-100">
                          {encounter.notes}
                        </div>
                      {/if}
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="bg-slate-50 rounded-lg p-8 text-center border-2 border-dashed border-slate-200">
                <p class="text-slate-500">No clinical encounters recorded.</p>
              </div>
            {/if}
          </section>

        </div>

        <!-- Right Column: Analytics & Risk -->
        <div class="space-y-6">
            
            <!-- Risk Assessment Card -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-slate-50 px-5 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 class="font-bold text-slate-800 flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-
