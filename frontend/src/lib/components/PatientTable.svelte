<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import type { Patient } from '../types/ipc';

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

<div class="w-full rounded-2xl border border-surface-border bg-glass-gradient backdrop-blur-glass shadow-glass">
  <!-- Header with search -->
  <div class="flex items-center justify-between border-b border-surface-border p-6">
    <h3 class="text-lg font-medium text-white">Recent Patients</h3>
    <div class="relative w-64">
      <input
        type="text"
        placeholder="Search patients..."
        value={search}
        on:input={handleSearch}
        class="w-full rounded-lg border border-surface-border bg-surface px-4 py-2 pl-10 text-sm text-white placeholder-gray-500 transition-colors focus:border-neon-blue focus:outline-none focus:ring-1 focus:ring-neon-blue"
      />
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="absolute left-3 top-2.5 h-4 w-4 text-gray-500"
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
    <table class="w-full text-left text-sm text-gray-400">
      <thead class="bg-surface/50 text-xs uppercase text-gray-400">
        <tr>
          <th scope="col" class="px-6 py-3 font-medium">Name</th>
          <th scope="col" class="px-6 py-3 font-medium">Age</th>
          <th scope="col" class="px-6 py-3 font-medium">Condition</th>
          <th scope="col" class="px-6 py-3 font-medium text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-surface-border">
        {#if loading}
          {#each Array(5) as _}
            <tr class="animate-pulse">
              <td class="px-6 py-4"><div class="h-4 w-32 rounded bg-surface-border"></div></td>
              <td class="px-6 py-4"><div class="h-4 w-8 rounded bg-surface-border"></div></td>
              <td class="px-6 py-4"><div class="h-4 w-24 rounded bg-surface-border"></div></td>
              <td class="px-6 py-4 text-right"><div class="ml-auto h-8 w-20 rounded bg-surface-border"></div></td>
            </tr>
          {/each}
        {:else if patients.length === 0}
          <tr>
            <td colspan="4" class="px-6 py-8 text-center text-gray-500">
              No patients found matching "{search}"
            </td>
          </tr>
        {:else}
          {#each patients as patient}
            <tr class="group transition-colors hover:bg-surface/50">
              <td class="whitespace-nowrap px-6 py-4 font-medium text-white group-hover:text-neon-blue transition-colors">
                {patient.name}
              </td>
              <td class="whitespace-nowrap px-6 py-4">{patient.age}</td>
              <td class="whitespace-nowrap px-6 py-4">
                <span class="inline-flex items-center rounded-full bg-neon-blue/10 px-2.5 py-0.5 text-xs font-medium text-neon-blue border border-neon-blue/20">
                  {patient.condition}
                </span>
              </td>
              <td class="whitespace-nowrap px-6 py-4 text-right">
                <button class="text-neon-blue hover:text-white transition-colors text-xs font-medium uppercase tracking-wider">
                  View Details
                </button>
              </td>
            </tr>
          {/each}
        {/if}
      </tbody>
    </table>
  </div>

  <!-- Pagination -->
  <div class="flex items-center justify-between border-t border-surface-border px-6 py-4">
    <div class="text-xs text-gray-500">
      Showing <span class="font-medium text-white">{(metadata.current_page - 1) * metadata.limit + 1}</span>
      to <span class="font-medium text-white">{Math.min(metadata.current_page * metadata.limit, metadata.total_items)}</span>
      of <span class="font-medium text-white">{metadata.total_items}</span> results
    </div>
    <div class="flex gap-2">
      <button
        on:click={() => changePage(metadata.current_page - 1)}
        disabled={metadata.current_page === 1}
        class="rounded-lg border border-surface-border px-3 py-1 text-xs font-medium text-gray-400 hover:border-neon-blue hover:text-neon-blue disabled:opacity-50 disabled:hover:border-surface-border disabled:hover:text-gray-400 transition-colors"
      >
        Previous
      </button>
      <button
        on:click={() => changePage(metadata.current_page + 1)}
        disabled={metadata.current_page === metadata.total_pages}
        class="rounded-lg border border-surface-border px-3 py-1 text-xs font-medium text-gray-400 hover:border-neon-blue hover:text-neon-blue disabled:opacity-50 disabled:hover:border-surface-border disabled:hover:text-gray-400 transition-colors"
      >
        Next
      </button>
    </div>
  </div>
</div>
