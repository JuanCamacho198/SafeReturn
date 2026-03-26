<script lang="ts">
  import '../app.css';
  import { t } from '$lib/i18n';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
</script>

<div class="min-h-screen flex flex-col">
  <nav class="bg-white text-slate-800 p-4 shadow border-b border-slate-200">
    <div class="container mx-auto flex justify-between items-center">
      <div class="flex items-center gap-8">
        <a href="/" class="text-2xl font-bold flex items-center gap-3 text-sky-700">
          <img src="/logo.png" alt="SafeReturn" class="h-16 w-auto drop-shadow-sm" />
          <span class="hidden sm:inline">{$t('app.title')}</span>
        </a>
        <div class="flex gap-4 font-medium">
          <a href="/dashboard" class="hover:text-sky-600 transition px-3 py-2 rounded hover:bg-slate-100">
            {$t('nav.dashboard')}
          </a>
          <a href="/settings" class="hover:text-sky-600 transition px-3 py-2 rounded hover:bg-slate-100">
            {$t('nav.settings')}
          </a>
        </div>
      </div>
      <LanguageSwitcher />
    </div>
  </nav>
  
  <main class="flex-1 p-6">
    <div class="container mx-auto">
      <slot />
    </div>
  </main>
  
  <footer class="bg-gray-100 p-4 text-center text-sm text-gray-600">
    {$t('app.subtitle')}
  </footer>
</div>
