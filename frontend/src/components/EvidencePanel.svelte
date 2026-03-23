<script lang="ts">
  export let fragments: string[] = [];
</script>

<div class="card">
  <h3 class="font-semibold text-gray-800 mb-4">📋 Clinical Evidence (RAG)</h3>
  {#if fragments.length === 0}
    <p class="text-gray-500 text-sm italic">No evidence retrieved yet.</p>
  {:else}
    <ul class="space-y-3">
      {#each fragments as fragment, i}
        <li class="bg-blue-50 p-3 rounded-lg text-sm border-l-4 border-blue-500">
          <span class="font-bold text-blue-700">Note {i + 1}:</span>
          {fragment}
        </li>
      {/each}
    </ul>
  {/if}
</div>
