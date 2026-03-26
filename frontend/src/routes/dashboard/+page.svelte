<script lang="ts">
  import { onMount } from 'svelte';
  import { getPatients, getMetrics, type PatientListResponse, type MetricsResponse } from '$lib/api/client';
  import type { Patient } from '$lib/types/ipc';
  import StatCard from '$lib/components/StatCard.svelte';
  import GlassChart from '$lib/components/GlassChart.svelte';
  import PatientTable from '$lib/components/PatientTable.svelte';
  import syntheticData from '$lib/synthetic_patients.json';
  import { t } from '$lib/i18n';

  // Generate random names for patients

  const firstNames = ['James', 'Mary', 'John', 'Patricia', 'Robert', 'Jennifer', 'Michael', 'Linda', 'William', 'Elizabeth', 'David', 'Barbara', 'Richard', 'Susan', 'Joseph', 'Jessica', 'Thomas', 'Sarah', 'Charles', 'Karen'];
  const lastNames = ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'];

  // Transform synthetic data to patient format
  const realPatients: Patient[] = syntheticData.map((p: any, index: number) => {
    const firstName = firstNames[index % firstNames.length];
    const lastName = lastNames[index % lastNames.length];
    const primaryDiagnosis = p.diagnoses?.find((d: any) => d.primary) || p.diagnoses?.[0];
    return {
      id: p.patient_id,
      mrn: `MRN${String(index + 1).padStart(3, '0')}`,
      firstName,
      lastName,
      gender: p.demographics?.gender === 'M' ? 'Male' : 'Female',
      dateOfBirth: new Date(2024 - p.demographics?.age, 0, 1).toISOString().split('T')[0],
      age: p.demographics?.age,
      condition: primaryDiagnosis?.description || 'General',
      riskScore: Math.random() * 0.5 + 0.3 // Random risk between 30-80%
    };
  });

  // Calculate metrics from real data
  const conditions = realPatients.map(p => p.condition);
  const conditionCounts: Record<string, number> = {};
  conditions.forEach(c => { if (c) conditionCounts[c] = (conditionCounts[c] || 0) + 1; });

  const realMetrics: MetricsResponse = {
    totalPatients: realPatients.length,
    averageAge: Math.round(realPatients.reduce((sum, p) => sum + (p.age || 0), 0) / realPatients.length),
    highRiskCount: realPatients.filter(p => (p.riskScore || 0) > 0.7).length,
    newThisMonth: Math.floor(realPatients.length * 0.3),
    conditionDistribution: Object.entries(conditionCounts).map(([label, value]) => ({ label, value }))
  };

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
      console.warn("Using real synthetic data (API not available):", e);
      // Use real synthetic data
      let filtered = realPatients;
      if (searchQuery) {
        filtered = realPatients.filter(p => 
          (p.firstName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (p.lastName?.toLowerCase() || '').includes(searchQuery.toLowerCase()) ||
          (p.condition?.toLowerCase() || '').includes(searchQuery.toLowerCase())
        );
      }
      
      // Fallback pagination logic
      const limit = metadata.limit;
      const start = (page - 1) * limit;
      const end = start + limit;
      patients = filtered.slice(start, end);
      
      metadata = { 
        total_items: filtered.length, 
        total_pages: Math.ceil(filtered.length / limit), 
        current_page: page, 
        limit: limit 
      };
    } finally {
      loadingPatients = false;
    }
  }

  async function loadMetrics() {
    loadingMetrics = true;
    try {
      metrics = await getMetrics();
    } catch (e) {
      console.warn("Using real synthetic metrics (API not available):", e);
      // Use real synthetic metrics
      metrics = realMetrics;
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

  // Chart Data Preparation - Using Medical Theme Colors
  // Sky: #0ea5e9, Indigo: #6366f1, Emerald: #10b981, Amber: #f59e0b, Rose: #f43f5e
  $: distributionData = metrics ? {
    labels: metrics.conditionDistribution.map(d => d.label),
    datasets: [{
      label: 'Patients',
      data: metrics.conditionDistribution.map(d => d.value),
      backgroundColor: ['rgba(14, 165, 233, 0.7)', 'rgba(99, 102, 241, 0.7)', 'rgba(244, 63, 94, 0.7)', 'rgba(245, 158, 11, 0.7)', 'rgba(16, 185, 129, 0.7)'],
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
      borderColor: '#0ea5e9',
      tension: 0.4,
      pointBackgroundColor: '#ffffff',
      pointBorderColor: '#0ea5e9',
      pointBorderWidth: 2,
    }]
  };

</script>

<div class="min-h-screen bg-slate-50 font-sans text-slate-900 pb-12">
  <!-- Navigation/Header Bar -->
  <div class="bg-white border-b border-slate-200 sticky top-0 z-10 px-8 py-4 mb-8">
    <div class="max-w-7xl mx-auto flex items-center justify-between">
      <div>
        <h1 class="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <span class="text-sky-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" viewBox="0 0 20 20" fill="currentColor">
                    <path fill-rule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clip-rule="evenodd" />
                </svg>
            </span>
            {$t('dashboard.title')}
        </h1>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 font-medium">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          {$t('app.system_online')}
        </div>
        <div class="h-9 w-9 overflow-hidden rounded-full border border-slate-200 bg-slate-100">
          <img src="https://ui-avatars.com/api/?name=Dr+Smith&background=0ea5e9&color=fff" alt="User" />
        </div>
      </div>
    </div>
  </div>

  <div class="mx-auto max-w-7xl px-8 space-y-8">
    
    <!-- KPI Grid -->
    <div class="grid grid-cols-1 gap-6 md:grid-cols-3">
      <StatCard 
        title={$t('dashboard.stats.total_patients')}
        value={metrics?.totalPatients || 0} 
        loading={loadingMetrics} 
        trend="up" 
        trendValue="12%"
        icon="fas fa-users"
      />
      <StatCard 
        title={$t('dashboard.stats.new_admissions')}
        value={metrics?.newThisMonth || 0} 
        loading={loadingMetrics} 
        trend="up" 
        trendValue="5%" 
        icon="fas fa-user-plus"
      />
      <StatCard 
        title={$t('dashboard.stats.critical_alerts')}
        value="3" 
        loading={loadingMetrics} 
        trend="down" 
        trendValue="2" 
        icon="fas fa-exclamation-triangle"
      />
    </div>

    <!-- Charts Row -->
    <div class="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <div class="min-h-87.5">
          <GlassChart 
            type="bar" 
            title={$t('dashboard.charts.condition_distribution')}
            data={distributionData} 
            loading={loadingMetrics} 
          />
      </div>
      <div class="min-h-87.5">
          <GlassChart 
            type="line" 
            title={$t('dashboard.charts.patient_growth')}
            data={growthData} 
            loading={loadingMetrics} 
          />
      </div>
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
