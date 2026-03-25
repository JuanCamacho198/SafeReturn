<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  let testResult = 'Testing...';
  let apiStatus = 'Unknown';

  onMount(async () => {
    // Test 1: Check if invoke exists
    testResult = `invoke function: ${typeof invoke}`;
    
    // Test 2: Try a simple command
    try {
      const result = await invoke<string>('greet', { name: 'Test' });
      apiStatus = `Working! Response: ${result}`;
    } catch (e) {
      apiStatus = `Error: ${e}`;
    }
  });
</script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">Tauri API Test</h1>
  <p class="mb-2">{testResult}</p>
  <p class="text-lg">{apiStatus}</p>
</div>
