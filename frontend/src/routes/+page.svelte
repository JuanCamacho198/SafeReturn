<script lang="ts">
  import { goto } from '$app/navigation';
  import { onMount } from 'svelte';
  
  onMount(() => {
    goto('/dashboard');
  });
</script>

<div class="flex items-center justify-center min-h-screen">
  <div class="text-center">
    <h1 class="text-4xl font-bold text-blue-900 mb-4">🏥 SafeReturn</h1>
    <p class="text-gray-600">Redirecting to dashboard...</p>
  </div>
</div>
