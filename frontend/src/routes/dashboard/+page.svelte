<script lang="ts">
  import { onMount } from 'svelte';
  import { getPatients, getMetrics, type PatientListResponse, type MetricsResponse } from '$lib/api/client';
  import type { Patient } from '$lib/types/ipc';
  import StatCard from '$lib/components/StatCard.svelte';
  import GlassChart from '$lib/components/GlassChart.svelte';
  import PatientTable from '$lib/components/PatientTable.svelte';

  // State
  let patients: Patient[] = [];
  let metadata = {
    total_items: 0,
    total_pages: 0,
    current_page: 1,
    limit: 10,
  };
  let metrics: MetricsResponse | null = null;
  
  let loadingPatients = true;
  let loadingMetrics = true;
  let search = '';

  // Fetch Data
  async function loadPatients(page = 1, searchQuery = '') {
    loadingPatients = true;
    try {
      const res = await getPatients(page, metadata.limit, searchQuery);
      patients = res.items;
      metadata = res.metadata;
    } catch (e) {
      console.error("Failed to load patients:", e);
    } finally {
      loadingPatients = false;
    }
  }

  async function loadMetrics() {
    loadingMetrics = true;
    try {
      metrics = await getMetrics();
    } catch (e) {
      console.error("Failed to load metrics:", e);
    } finally {
      loadingMetrics = false;
    }
  }

  // Handlers
  function handlePageChange(event: CustomEvent<number>) {
    loadPatients(event.detail, search);
  }

  function handleSearchChange(event: CustomEvent<string>) {
    search = event.detail;
    loadPatients(1, search);
  }

  // Lifecycle
  onMount(() => {
    loadPatients();
    loadMetrics();
  });

  // Chart Data Preparation
  $: distributionData = metrics ? {
    labels: metrics.conditionDistribution.map(d => d.label),
    datasets: [{
      label: 'Patients',
      data: metrics.conditionDistribution.map(d => d.value),
      backgroundColor: ['rgba(0, 243, 255, 0.6)', 'rgba(176, 38, 255, 0.6)', 'rgba(255, 42, 133, 0.6)', 'rgba(59, 130, 246, 0.6)', 'rgba(16, 185, 129, 0.6)'],
      borderWidth: 0,
      borderRadius: 4,
    }]
  } : { labels: [], datasets: [] };

  $: growthData = {
    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
    datasets: [{
      label: 'New Patients',
      data: [65, 59, 80, 81, 56, metrics?.newThisMonth || 124],
      fill: true,
      borderColor: '#00f3ff',
      tension: 0.4
    }]
  };

</script>

<div class="min-h-screen bg-background p-8 font-sans text-gray-200 selection:bg-neon-blue/30 selection:text-white">
  <div class="mx-auto max-w-7xl space-y-8">
    
    <!-- Header -->
    <header class="flex items-center justify-between">
      <div>
        <h1 class="bg-linear-to-r from-white to-gray-500 bg-clip-text text-4xl font-bold text-transparent tracking-tighter">
          Clinical Intelligence
        </h1>
        <p class="mt-1 text-sm text-gray-500">Real-time patient monitoring & analytics</p>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 rounded-full border border-surface-border bg-surface px-3 py-1 text-xs text-gray-400">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-neon-green opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-green-500"></span>
          </span>
          System Online
        </div>
        <div class="h-10 w-10 overflow-hidden rounded-full border border-surface-border bg-surface-border">
          <img src="https://ui-avatars.com/api/?name=Dr+Smith&background=0a0a0e&color=fff" alt="User" />
        </div>
      </div>
    </header>

    <!-- KPI Grid -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard 
        title="Total Patients" 
        value={metrics?.totalPatients || 0} 
        loading={loadingMetrics} 
        trend="up" 
        trendValue="12%" 
      />
      <StatCard 
        title="New Admissions" 
        value={metrics?.newThisMonth || 0} 
        loading={loadingMetrics} 
        trend="up" 
        trendValue="5%" 
      />
      <StatCard 
        title="Critical Alerts" 
        value="3" 
        loading={loadingMetrics} 
        trend="down" 
        trendValue="2" 
      />
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <GlassChart 
        type="bar" 
        title="Condition Distribution" 
        data={distributionData} 
        loading={loadingMetrics} 
      />
      <GlassChart 
        type="line" 
        title="Patient Growth Trend" 
        data={growthData} 
        loading={loadingMetrics} 
      />
    </div>

    <!-- Patient Table -->
    <section>
      <PatientTable 
        {patients} 
        {metadata} 
        loading={loadingPatients} 
        {search}
        on:changePage={handlePageChange}
        on:changeSearch={handleSearchChange}
      />
    </section>

  </div>
</div>
