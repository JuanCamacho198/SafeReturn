<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';

  let testResult = 'Testing...';
  let apiStatus = 'Unknown';
  let debugInfo = '';

  onMount(async () => {
    // Test 1: Check if invoke exists
    testResult = `invoke function: ${typeof invoke}`;
    
    // Debug: Check window object
    debugInfo = `window.__TAURI__: ${typeof window !== 'undefined' ? (window as any).__TAURI__ : 'N/A'}\n`;
    debugInfo += `window.__TAURI_INTERNALS__: ${typeof window !== 'undefined' ? typeof (window as any).__TAURI_INTERNALS__ : 'N/A'}`;
    
    // Test 2: Try a simple command
    try {
      const result = await invoke<string>('greet', { name: 'Test' });
      apiStatus = `Working! Response: ${result}`;
    } catch (e: any) {
      apiStatus = `Error: ${e}\nMessage: ${e?.message}\nStack: ${e?.stack}`;
    }
  });
</script>

<div class="p-8">
  <h1 class="text-2xl font-bold mb-4">Tauri API Test</h1>
  <p class="mb-2">{testResult}</p>
  <p class="text-lg mb-4">{apiStatus}</p>
  <pre class="bg-gray-100 p-4 rounded text-sm whitespace-pre-wrap">{debugInfo}</pre>
</div>
