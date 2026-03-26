<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { getPatient, assessRisk } from '$lib/api/client';
  import { invoke } from '@tauri-apps/api/core';
  import type { Patient, RiskAssessment } from '$lib/types/ipc';
  import { fade, fly } from 'svelte/transition';
  import { t, locale } from '$lib/i18n';

  let patient: Patient | null = null;

  let assessment: RiskAssessment | null = null;
  let loading = true;
  let error: string | null = null;
  let assessingRisk = false;
  let riskError: string | null = null;

  $: patientId = $page.params.id ?? '';

  async function loadData() {
    loading = true;
    error = null;
    try {
      patient = await getPatient(patientId);
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
    riskError = null;
    try {
      // Try to load API key from settings
      let apiKey: string | undefined = undefined;
      try {
        const storedKey = await invoke<string | null>('load_setting', { key: 'groq_api_key' });
        if (storedKey) apiKey = storedKey;
      } catch (e) {
        console.warn('Failed to load API key from settings, using default/env:', e);
      }
      
      assessment = await assessRisk(patient.id, apiKey, $locale);
    } catch (e) {
      console.error('Error assessing risk:', e);
      const errorMsg = String(e);
      
      if (errorMsg.includes("Groq API key not configured")) {
         riskError = "API key missing. Please configure your Groq API key in settings.";
      } else if (errorMsg.includes("No se encontro el servicio de IA local") || errorMsg.includes("SIDECAR_NOT_FOUND")) {
         riskError = "No se encontro el servicio de IA local. En la raiz del proyecto ejecuta: cd backend && bun run build:sidecar:tauri-win. Luego reinicia la aplicacion y vuelve a intentar.";
      } else if (errorMsg.includes("401") || errorMsg.includes("Unauthorized")) {
         riskError = "Invalid API Key. Please check your settings.";
      } else if (errorMsg.includes("429") || errorMsg.includes("Too Many Requests")) {
         riskError = "Too many requests. Please try again later.";
      } else if (errorMsg.includes("Network") || errorMsg.includes("fetch") || errorMsg.includes("connection")) {
         riskError = "Network connection failed. Please check your internet.";
      } else if (errorMsg.includes("No encounters found")) {
         riskError = "No clinical notes available for analysis.";
      } else {
         // Show the actual error message if it's safe and short
         riskError = errorMsg.length < 150 ? errorMsg : "Risk assessment failed. Please try again.";
      }
    } finally {
      assessingRisk = false;
    }
  }

  onMount(() => {
    loadData();
  });

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
  <!-- Navigation -->
  <div class="bg-white border-b border-slate-200 px-6 py-4 sticky top-0 z-10">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div class="flex items-center space-x-4">
        <a href="/dashboard" class="text-slate-500 hover:text-sky-600 transition-colors flex items-center font-medium">
          {$t('nav.back_dashboard')}
        </a>
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
        <p class="text-sm text-red-700 font-medium">{error || $t('patient.error_load')}</p>
      </div>
    </div>
  {:else if patient}
    <div class="max-w-7xl mx-auto px-6 py-8 space-y-8" in:fade={{ duration: 300 }}>
      
      <!-- Patient Header -->
      <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 class="text-3xl font-bold text-slate-900 tracking-tight">
            {patient.name || patient.first_name + ' ' + patient.last_name || $t('common.unknown')}
          </h1>
          <div class="flex flex-wrap items-center gap-3 mt-2 text-sm text-slate-500 font-medium">
            <span class="bg-slate-100 text-slate-600 px-2 py-1 rounded">{$t('patient.header.mrn')}: {patient.mrn || $t('common.na')}</span>
            <span>•</span>
            <span>{patient.gender || $t('common.unknown')}</span>
            <span>•</span>
            <span>{patient.age ? `${patient.age} yrs` : $t('patient.header.age') + ' ' + $t('common.na')}</span>
            <span>•</span>
            <span>{$t('patient.header.dob')}: {formatDate(patient.dob)}</span>
          </div>
        </div>
        <div>
            <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                {$t('patient.header.active_patient')}
            </span>
        </div>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        <!-- Clinical History & Extended Data -->
        <div class="lg:col-span-2 space-y-8">
          
          <!-- Medications -->
          {#if patient.medications && patient.medications.length > 0}
            <section>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-slate-800">{$t('patient.extended.medications')}</h2>
                <span class="text-sm text-slate-500">{patient.medications.length} {$t('patient.extended.med_active')}</span>
              </div>
              <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th class="text-left px-4 py-3 font-semibold text-slate-600">{$t('patient.extended.med_name')}</th>
                      <th class="text-left px-4 py-3 font-semibold text-slate-600">{$t('patient.extended.dosage')}</th>
                      <th class="text-left px-4 py-3 font-semibold text-slate-600">{$t('patient.extended.frequency')}</th>
                      <th class="text-left px-4 py-3 font-semibold text-slate-600">{$t('patient.extended.route')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    {#each patient.medications as med}
                      <tr class="hover:bg-slate-50">
                        <td class="px-4 py-3 font-medium text-slate-800">{med.name}</td>
                        <td class="px-4 py-3 text-slate-600">{med.dosage}</td>
                        <td class="px-4 py-3 text-slate-600">{med.frequency}</td>
                        <td class="px-4 py-3 text-slate-600">{med.route}</td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </section>
          {/if}

          <!-- Lab Results -->
          {#if patient.lab_results && patient.lab_results.length > 0}
            <section>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-slate-800">{$t('patient.extended.lab_results')}</h2>
                <span class="text-sm text-slate-500">{patient.lab_results.length} {$t('patient.extended.lab_results_count')}</span>
              </div>
              <div class="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
                <table class="w-full text-sm">
                  <thead class="bg-slate-50 border-b border-slate-200">
                    <tr>
                      <th class="text-left px-4 py-3 font-semibold text-slate-600">{$t('patient.extended.test')}</th>
                      <th class="text-left px-4 py-3 font-semibold text-slate-600">{$t('patient.extended.value')}</th>
                      <th class="text-left px-4 py-3 font-semibold text-slate-600">{$t('patient.extended.reference')}</th>
                      <th class="text-left px-4 py-3 font-semibold text-slate-600">{$t('patient.extended.status')}</th>
                    </tr>
                  </thead>
                  <tbody class="divide-y divide-slate-100">
                    {#each patient.lab_results as lab}
                      <tr class="hover:bg-slate-50">
                        <td class="px-4 py-3 font-medium text-slate-800">{lab.name}</td>
                        <td class="px-4 py-3 text-slate-600">{lab.value} {lab.unit}</td>
                        <td class="px-4 py-3 text-slate-500 text-xs">{lab.reference_range[0]}-{lab.reference_range[1]} {lab.unit}</td>
                        <td class="px-4 py-3">
                          <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium
                            {lab.flag === 'high' ? 'bg-red-100 text-red-800' : lab.flag === 'low' ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'}">
                            {lab.flag}
                          </span>
                        </td>
                      </tr>
                    {/each}
                  </tbody>
                </table>
              </div>
            </section>
          {/if}

          <!-- Outcomes -->
          {#if patient.outcomes}
            <section>
              <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-bold text-slate-800">{$t('patient.extended.outcomes')}</h2>
              </div>
              <div class="bg-white rounded-lg border border-slate-200 shadow-sm p-5">
                <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div class="text-center p-4 bg-slate-50 rounded-lg">
                    <div class="text-sm text-slate-500 mb-1">{$t('patient.extended.readmitted')}</div>
                    <div class="text-lg font-semibold {patient.outcomes.readmitted ? 'text-amber-600' : 'text-emerald-600'}">
                      {patient.outcomes.readmitted ? $t('patient.extended.yes') : $t('patient.extended.no')}
                    </div>
                  </div>
                  {#if patient.outcomes.days_to_readmission !== null}
                    <div class="text-center p-4 bg-slate-50 rounded-lg">
                      <div class="text-sm text-slate-500 mb-1">{$t('patient.extended.days_to_readmission')}</div>
                      <div class="text-lg font-semibold text-slate-800">{patient.outcomes.days_to_readmission}</div>
                    </div>
                  {/if}
                  <div class="text-center p-4 bg-slate-50 rounded-lg">
                    <div class="text-sm text-slate-500 mb-1">{$t('patient.extended.discharge')}</div>
                    <div class="text-lg font-semibold text-slate-800">{patient.outcomes.discharge_disposition || $t('common.na')}</div>
                  </div>
                </div>
              </div>
            </section>
          {/if}

          <!-- Clinical History -->
          <section>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold text-slate-800">{$t('patient.history.title')}</h2>
              <span class="text-sm text-slate-500">{patient.encounters?.length || 0} {$t('patient.history.encounters')}</span>
            </div>

            {#if patient.encounters && patient.encounters.length > 0}
              <div class="relative pl-6 ml-2 space-y-8 before:absolute before:inset-y-0 before:left-0 before:w-0.5 before:bg-slate-200">
                {#each patient.encounters as encounter}
                  <div class="relative">
                    {@const typeColor = encounter.event_type === 'discharge' ? 'bg-emerald-500' :
                                        encounter.event_type === 'medication' ? 'bg-amber-400' :
                                        encounter.event_type === 'emergency' ? 'bg-rose-500' :
                                        'bg-sky-500'}
                    <div class="absolute -left-[29px] mt-1.5 h-4 w-4 rounded-full border-2 border-white {typeColor} shadow-sm z-10 box-content"></div>
                    <div class="bg-white p-5 rounded-lg border border-slate-200 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
                      <div class="absolute top-0 left-0 w-1 h-full {typeColor}"></div>
                      <div class="ml-3">
                        <div class="flex flex-col sm:flex-row justify-between items-start mb-2 gap-2">
                          <div>
                            <div class="flex items-center gap-2">
                              <h3 class="font-semibold text-slate-800 text-lg">{encounter.diagnosis || 'General Checkup'}</h3>
                              {#if encounter.event_type}
                                <span class="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full border opacity-80
                                  {encounter.event_type === 'discharge' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                                   encounter.event_type === 'medication' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                   encounter.event_type === 'emergency' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                                   'bg-sky-50 text-sky-700 border-sky-200'}">
                                  {encounter.event_type}
                                </span>
                              {/if}
                            </div>
                            <p class="text-xs text-slate-500 font-medium uppercase tracking-wider mt-1">
                              {formatDate(encounter.admission_date)}
                            </p>
                          </div>
                          <span class="text-xs bg-slate-50 text-slate-500 px-2 py-1 rounded font-medium border border-slate-100 flex-shrink-0">
                            #{encounter.id.substring(0, 8)}
                          </span>
                        </div>
                        
                        {#if encounter.notes}
                          <div class="mt-3 text-slate-600 text-sm leading-relaxed bg-slate-50 p-3 rounded border border-slate-100 whitespace-pre-line">
                            {encounter.notes}
                          </div>
                        {/if}
                      </div>
                    </div>
                  </div>
                {/each}
              </div>
            {:else}
              <div class="bg-slate-50 rounded-lg p-8 text-center border-2 border-dashed border-slate-200">
                <p class="text-slate-500">{$t('patient.history.no_encounters')}</p>
              </div>
            {/if}
          </section>
        </div>

        <!-- Sidebar -->
        <div class="space-y-6">
            
            <!-- Risk Assessment -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div class="bg-slate-50 px-5 py-4 border-b border-slate-200">
                    <h3 class="font-bold text-slate-800">{$t('patient.risk.title')}</h3>
                </div>
                
                <div class="p-5">
                    {#if riskError}
                        <div class="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded relative text-sm mb-4" role="alert">
                            <strong class="font-bold">Error:</strong>
                            <span class="block sm:inline">{riskError}</span>
                        </div>
                        <div class="text-center">
                             <button on:click={handleRiskAssessment} class="text-indigo-600 hover:text-indigo-800 text-sm font-medium">Try again</button>
                        </div>
                    {:else if !assessment && !assessingRisk}
                        <div class="text-center py-6">
                            <p class="text-slate-500 text-sm mb-4">{$t('patient.risk.prompt')}</p>
                            <button on:click={handleRiskAssessment} class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-4 rounded shadow-sm transition-colors">
                                {$t('patient.risk.run_analysis')}
                            </button>
                        </div>
                    {:else if assessingRisk}
                        <div class="text-center py-8">
                            <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-3"></div>
                            <p class="text-sm text-indigo-600 font-medium animate-pulse">{$t('patient.risk.analyzing')}</p>
                        </div>
                    {:else if assessment}
                        <div in:fly={{ y: 20, duration: 400 }}>
                            <div class="flex items-center justify-between mb-4">
                                <span class="text-sm font-medium text-slate-500 uppercase">{$t('patient.risk.score')}</span>
                                <span class="text-2xl font-bold {assessment.riskScore >= 0.7 ? 'text-red-600' : (assessment.riskScore >= 0.4 ? 'text-amber-600' : 'text-emerald-600')}">
                                    {(assessment.riskScore * 100).toFixed(0)}%
                                </span>
                            </div>
                            <div class="w-full bg-slate-100 rounded-full h-2 mb-6 overflow-hidden">
                                <div class="h-2 rounded-full {assessment.riskScore >= 0.7 ? 'bg-red-500' : (assessment.riskScore >= 0.4 ? 'bg-amber-500' : 'bg-emerald-500')}" style="width: {assessment.riskScore * 100}%"></div>
                            </div>

                            <div class="space-y-4">
                                <div class="bg-slate-50 p-3 rounded border border-slate-100">
                                    <h4 class="text-xs font-bold text-slate-700 uppercase mb-1">{$t('patient.risk.explanation')}</h4>
                                    <p class="text-sm text-slate-600 leading-snug">{assessment.explanation}</p>
                                </div>
                                
                                {#if assessment.fragments && assessment.fragments.length > 0}
                                    <div>
                                        <h4 class="text-xs font-bold text-slate-700 uppercase mb-2">{$t('patient.risk.evidence')}</h4>
                                        <ul class="space-y-2 max-h-48 overflow-y-auto pr-1 custom-scrollbar">
                                            {#each assessment.fragments as fragment}
                                                <li class="text-xs bg-indigo-50 text-indigo-900 p-2 rounded border border-indigo-100">"{fragment}"</li>
                                            {/each}
                                        </ul>
                                    </div>
                                {/if}
                            </div>
                        </div>
                    {/if}
                </div>
            </div>

            <!-- Demographics -->
            <div class="bg-white rounded-xl shadow-sm border border-slate-200 p-5">
                <h3 class="font-bold text-slate-800 mb-3 text-sm uppercase tracking-wide">{$t('patient.demographics.title')}</h3>
                <div class="space-y-3 text-sm">
                    <div class="flex justify-between py-1 border-b border-slate-50">
                        <span class="text-slate-500">{$t('patient.demographics.name')}</span>
                        <span class="font-medium text-slate-800 text-right">{patient.first_name} {patient.last_name}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-slate-50">
                        <span class="text-slate-500">{$t('patient.demographics.dob')}</span>
                        <span class="font-medium text-slate-800 text-right">{formatDate(patient.dob)}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-slate-50">
                        <span class="text-slate-500">{$t('patient.demographics.gender')}</span>
                        <span class="font-medium text-slate-800 text-right">{patient.gender}</span>
                    </div>
                    <div class="flex justify-between py-1 border-b border-slate-50">
                        <span class="text-slate-500">{$t('patient.demographics.id')}</span>
                        <span class="font-medium text-slate-800 font-mono text-xs text-right">{patient.id}</span>
                    </div>
                </div>
            </div>
        </div>
      </div>
    </div>
  {:else}
    <div class="max-w-7xl mx-auto px-6 py-12 text-center">
      <h2 class="text-2xl font-bold text-slate-800">{$t('patient.not_found')}</h2>
      <a href="/dashboard" class="mt-4 inline-block text-sky-600 hover:underline">{$t('patient.return_dashboard')}</a>
    </div>
  {/if}
</div>

<style>
    .custom-scrollbar::-webkit-scrollbar { width: 4px; }
    .custom-scrollbar::-webkit-scrollbar-track { background: #f1f5f9; }
    .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 2px; }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
</style>
