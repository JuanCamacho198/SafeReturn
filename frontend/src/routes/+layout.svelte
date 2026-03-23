<script lang="ts">
  import '../app.css';
</script>

<div class="min-h-screen flex flex-col">
  <nav class="bg-blue-900 text-white p-4 shadow-md">
    <div class="container mx-auto flex justify-between items-center">
      <a href="/" class="text-xl font-bold flex items-center gap-2">
        🏥 SafeReturn
      </a>
      <div class="flex gap-4">
        <a href="/dashboard" class="hover:text-blue-200 transition px-3 py-1 rounded hover:bg-blue-800">
          Dashboard
        </a>
      </div>
    </div>
  </nav>
  
  <main class="flex-1 p-6">
    <div class="container mx-auto">
      <slot />
    </div>
  </main>
  
  <footer class="bg-gray-100 p-4 text-center text-sm text-gray-600">
    SafeReturn v0.1.0 — Healthcare Readmission Prediction
  </footer>
</div>
