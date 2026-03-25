<script lang="ts">
  import { onMount } from 'svelte';
  import { invoke } from '@tauri-apps/api/core';
  import { t } from '$lib/i18n';

  let apiKey = '';
  let showKey = false;
  let status = 'Not Configured'; // 'Configured' | 'Not Configured' | 'Saved' | 'Error'
  let message = '';
  let isLoading = true;

  onMount(async () => {
    await loadKey();
  });

  const SETTINGS_STORAGE_KEY = 'app_settings';

  function loadSettingsFromStorage(): Record<string, string> {
    try {
      const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch {
      return {};
    }
  }

  function saveSettingsToStorage(settings: Record<string, string>) {
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  function deleteSettingFromStorage(key: string) {
    const settings = loadSettingsFromStorage();
    delete settings[key];
    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }

  async function loadKey() {
    isLoading = true;
    try {
      const storedKey = await invoke<string | null>('load_setting', { key: 'groq_api_key' });
      if (storedKey) {
        apiKey = storedKey;
        status = 'Configured';
      } else {
        status = 'Not Configured';
      }
    } catch (e) {
      // Fallback to localStorage when Tauri is not available
      console.warn('Tauri invoke failed, falling back to localStorage:', e);
      const settings = loadSettingsFromStorage();
      if (settings.groq_api_key) {
        apiKey = settings.groq_api_key;
        status = 'Configured';
      } else {
        status = 'Not Configured';
      }
    } finally {
      isLoading = false;
    }
  }

  async function saveKey() {
    if (!apiKey.trim()) {
      message = 'Please enter a valid API Key.';
      return;
    }
    
    // Basic validation (starts with gsk_)
    if (!apiKey.startsWith('gsk_')) {
        message = 'Invalid API Key format. Must start with "gsk_"';
        return;
    }

    try {
      await invoke('save_setting', { key: 'groq_api_key', value: apiKey });
      status = 'Saved';
      message = 'API Key saved successfully!';
      setTimeout(() => message = '', 3000);
    } catch (e) {
      // Fallback to localStorage when Tauri is not available
      console.warn('Tauri invoke failed, falling back to localStorage:', e);
      const settings = loadSettingsFromStorage();
      settings.groq_api_key = apiKey;
      saveSettingsToStorage(settings);
      status = 'Saved';
      message = 'API Key saved to local storage (fallback mode)!';
      setTimeout(() => message = '', 3000);
    }
  }

  async function clearKey() {
    try {
      await invoke('delete_setting', { key: 'groq_api_key' });
      apiKey = '';
      status = 'Not Configured';
      message = 'API Key removed.';
      setTimeout(() => message = '', 3000);
    } catch (e) {
      // Fallback to localStorage when Tauri is not available
      console.warn('Tauri invoke failed, falling back to localStorage:', e);
      deleteSettingFromStorage('groq_api_key');
      apiKey = '';
      status = 'Not Configured';
      message = 'API Key removed from local storage.';
      setTimeout(() => message = '', 3000);
    }
  }
</script>

<div class="max-w-2xl mx-auto py-8">
  <h1 class="text-3xl font-bold text-gray-900 mb-8">{$t('settings.title')}</h1>

  <div class="bg-white shadow rounded-lg p-6 border border-gray-200">
    <h2 class="text-xl font-semibold text-gray-800 mb-4">{$t('settings.api_config')}</h2>
    
    <div class="mb-6">
      <label for="apiKey" class="block text-sm font-medium text-gray-700 mb-2">{$t('settings.groq_key_label')}</label>
      <div class="relative rounded-md shadow-sm">
        <input
          type={showKey ? 'text' : 'password'}
          id="apiKey"
          bind:value={apiKey}
          class="block w-full rounded-md border-gray-300 pr-10 focus:border-blue-500 focus:ring-blue-500 sm:text-sm p-2 border"
          placeholder={$t('settings.placeholder')}
        />
        <button
          type="button"
          class="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-gray-700"
          on:click={() => showKey = !showKey}
        >
          {#if showKey}
            <!-- Eye Off Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
            </svg>
          {:else}
            <!-- Eye Icon -->
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor" class="w-5 h-5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          {/if}
        </button>
      </div>
      <p class="mt-2 text-sm text-gray-500">
        {$t('settings.status')}: 
        <span class={status === 'Configured' || status === 'Saved' ? 'text-green-600 font-semibold' : 'text-amber-600'}>
          {status === 'Saved' ? $t('settings.status_saved') : (status === 'Configured' ? $t('settings.status_configured') : $t('settings.status_not_configured'))}
        </span>
      </p>
    </div>

    <div class="flex items-center justify-between">
      <button
        on:click={clearKey}
        class="text-red-600 hover:text-red-800 text-sm font-medium px-4 py-2 rounded transition"
      >
        {$t('settings.clear_key')}
      </button>
      <button
        on:click={saveKey}
        class="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded focus:outline-none focus:shadow-outline transition"
      >
        {$t('settings.save_config')}
      </button>
    </div>

    {#if message}
      <div class="mt-4 p-3 rounded text-sm {message.includes('Error') || message.includes('Invalid') ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}">
        {message}
      </div>
    {/if}
  </div>
</div>
