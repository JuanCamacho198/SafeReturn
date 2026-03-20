<script lang="ts">
  export let fragments: string[];
</script>

<div class="bg-white p-6 rounded-lg shadow-sm border border-gray-200 h-full">
  <h3 class="text-lg font-semibold mb-4 text-gray-800 border-b pb-2">Retrieved Clinical Evidence (RAG)</h3>
  
  {#if fragments.length === 0}
    <p class="text-gray-500 italic">No relevant historical notes found.</p>
  {:else}
    <ul class="space-y-4">
      {#each fragments as fragment, i}
        <li class="bg-blue-50/50 p-4 rounded text-sm text-gray-800 border border-blue-100 relative">
          <span class="absolute -top-3 -left-3 bg-blue-100 text-blue-800 text-xs font-bold px-2 py-1 rounded-full shadow-sm">
            Note {i + 1}
          </span>
          "{fragment}"
        </li>
      {/each}
    </ul>
  {/if}
</div>
