<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen bg-gray-50 text-gray-900 font-sans">
  <nav class="bg-blue-900 text-white p-4 shadow-md flex justify-between items-center">
    <div class="text-xl font-bold flex items-center gap-2">
      🏥 SafeReturn
    </div>
    <div class="flex gap-4">
      <a href="/dashboard" class="hover:text-blue-200 transition">Dashboard</a>
    </div>
  </nav>
  <main class="p-6 max-w-6xl mx-auto">
    <slot />
  </main>
</div>
