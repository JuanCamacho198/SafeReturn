<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Patient } from '../types/ipc';
  import { t } from '$lib/i18n';

  export let patients: Patient[] = [];

  export let metadata = {
    total_items: 0,
    total_pages: 0,
    current_page: 1,
    limit: 10,
  };
  export let search: string = '';
  export let loading: boolean = false;

  const dispatch = createEventDispatcher();

  let searchTimeout: any;

  function handleSearch(event: Event) {
    const value = (event.target as HTMLInputElement).value;
    search = value;
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => {
      dispatch('changeSearch', value);
    }, 300);
  }

  function changePage(newPage: number) {
    if (newPage >= 1 && newPage <= metadata.total_pages) {
      dispatch('changePage', newPage);
    }
  }
</script>

<div class="card overflow-hidden">
  <!-- Header with search -->
  <div class="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
    <h3 class="text-lg font-bold text-slate-800 flex items-center">
      <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 mr-2 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
      {$t('dashboard.table.recent_patients')}
    </h3>
    <div class="relative w-64">
      <input
        type="text"
        placeholder={$t('dashboard.table.search_placeholder')}
        value={search}
        on:input={handleSearch}
        class="w-full rounded-lg border border-slate-300 bg-white px-4 py-2 pl-10 text-sm text-slate-900 placeholder-slate-400 transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500 shadow-sm"
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="absolute left-3 top-2.5 h-4 w-4 text-slate-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
        />
      </svg>
    </div>
  </div>

  <!-- Table -->
  <div class="overflow-x-auto">
    <table class="w-full text-left text-sm text-slate-600">
      <thead class="bg-slate-50 text-xs uppercase text-slate-500 font-semibold tracking-wider border-b border-slate-200">
        <tr>
          <th scope="col" class="px-6 py-3">{$t('dashboard.columns.name')}</th>
          <th scope="col" class="px-6 py-3">{$t('dashboard.columns.age')}</th>
          <th scope="col" class="px-6 py-3">{$t('dashboard.columns.condition')}</th>
          <th scope="col" class="px-6 py-3 text-right">{$t('common.actions')}</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100 bg-white">
        {#if loading}
          {#each Array(5) as _}
            <tr class="animate-pulse">
              <td class="px-6 py-4"><div class="h-4 w-32 rounded bg-slate-100"></div></td>
              <td class="px-6 py-4"><div class="h-4 w-8 rounded bg-slate-100"></div></td>
              <td class="px-6 py-4"><div class="h-4 w-24 rounded bg-slate-100"></div></td>
              <td class="px-6 py-4 text-right"><div class="ml-auto h-8 w-20 rounded bg-slate-100"></div></td>
            </tr>
          {/each}
        {:else if patients.length === 0}
          <tr>
            <td colspan="4" class="px-6 py-12 text-center text-slate-500 italic">
              {$t('dashboard.table.no_results')} "{search}"
            </td>
          </tr>
        {:else}
          {#each patients as patient}
            {@const fullName = patient.firstName && patient.lastName ? `${patient.firstName} ${patient.lastName}` : (patient.name || 'Unknown')}
            {@const patientAge = patient.age || patient.demographics?.age || 'N/A'}
            {@const condition = patient.condition || patient.diagnoses?.[0]?.description || 'General'}
            {@const patientId = patient.id || patient.patient_id}
            <tr class="group transition-colors hover:bg-slate-50">
              <td class="whitespace-nowrap px-6 py-4 font-medium text-slate-900">
                {fullName}
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-slate-500">{patientAge}</td>
              <td class="whitespace-nowrap px-6 py-4">
                <span class="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 border border-emerald-100">
                  {condition}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <div class="flex items-center justify-end gap-2">
                  <a href="/patients/{patientId}" class="text-sky-600 hover:text-sky-800 transition-colors text-xs font-semibold uppercase tracking-wider hover:underline">
                    {$t('common.view_details')}
                  </a>
                  <button 
                    on:click={() => window.location.href = `/patients/${patientId}?analyze=true`}
                    class="rounded bg-rose-500 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-600 transition-colors shadow-sm"
                  >
                    {$t('common.analyze_risk')}
                  </button>
                </div>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="flex items-center justify-between border-t border-slate-200 bg-white px-6 py-4">
    <div class="text-xs text-slate-500">
      {$t('dashboard.table.showing')} <span class="font-medium text-slate-900">{(metadata.current_page - 1) * metadata.limit + 1}</span>
      {$t('dashboard.table.to')} <span class="font-medium text-slate-900">{Math.min(metadata.current_page * metadata.limit, metadata.total_items)}</span>
      {$t('dashboard.table.of')} <span class="font-medium text-slate-900">{metadata.total_items}</span> {$t('dashboard.table.results')}
    </div>
    <div class="flex gap-2">
      <button
        on:click={() => changePage(metadata.current_page - 1)}
        disabled={metadata.current_page === 1}
        class="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-sm"
      >
        {$t('common.previous')}
      </button>
      <button
        on:click={() => changePage(metadata.current_page + 1)}
        disabled={metadata.current_page === metadata.total_pages}
        class="rounded border border-slate-300 bg-white px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:hover:bg-white transition-colors shadow-sm"
      >
        {$t('common.next')}
      </button>
    </div>
  </div>
</div>
