<script lang="ts">
  import { locale, type Locale } from '$lib/i18n';

  function switchLanguage(newLocale: Locale) {
    locale.set(newLocale);
  }
</script>

<div class="flex items-center gap-2">
  <button 
    on:click={() => switchLanguage('es')}
    class="px-2 py-1 text-sm rounded transition-colors {$locale === 'es' ? 'bg-blue-700 text-white font-medium' : 'text-blue-200 hover:text-white hover:bg-blue-800'}"
    aria-label="Switch to Spanish"
  >
    ES
  </button>
  <span class="text-blue-400">|</span>
  <button 
    on:click={() => switchLanguage('en')}
    class="px-2 py-1 text-sm rounded transition-colors {$locale === 'en' ? 'bg-blue-700 text-white font-medium' : 'text-blue-200 hover:text-white hover:bg-blue-800'}"
    aria-label="Switch to English"
  >
    EN
  </button>
</div>
