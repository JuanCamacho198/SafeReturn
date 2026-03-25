<script lang="ts">
  import { onMount } from 'svelte';
  import { getPatients, getMetrics, type PatientListResponse, type MetricsResponse } from '$lib/api/client';
  import type { Patient } from '$lib/types/ipc';
  import StatCard from '$lib/components/StatCard.svelte';
  import GlassChart from '$lib/components/GlassChart.svelte';
  import PatientTable from '$lib/components/PatientTable.svelte';

  // Mock data for development/testing
  const mockPatients: Patient[] = [
    { id: '1', mrn: 'MRN001', firstName: 'John', lastName: 'Smith', gender: 'Male', dateOfBirth: '1955-03-15', age: 70, condition: 'Heart Failure', riskScore: 0.85 },
    { id: '2', mrn: 'MRN002', firstName: 'Maria', lastName: 'Garcia', gender: 'Female', dateOfBirth: '1968-07-22', age: 57, condition: 'Diabetes Type 2', riskScore: 0.45 },
    { id: '3', mrn: 'MRN003', firstName: 'Robert', lastName: 'Johnson', gender: 'Male', dateOfBirth: '1942-11-08', age: 83, condition: 'COPD', riskScore: 0.72 },
    { id: '4', mrn: 'MRN004', firstName: 'Emily', lastName: 'Davis', gender: 'Female', dateOfBirth: '1975-01-30', age: 51, condition: 'Hypertension', riskScore: 0.28 },
    { id: '5', mrn: 'MRN005', firstName: 'Michael', lastName: 'Wilson', gender: 'Male', dateOfBirth: '1960-09-12', age: 65, condition: 'Heart Failure', riskScore: 0.78 },
    { id: '6', mrn: 'MRN006', firstName: 'Sarah', lastName: 'Brown', gender: 'Female', dateOfBirth: '1982-05-18', age: 43, condition: 'Asthma', riskScore: 0.15 },
    { id: '7', mrn: 'MRN007', firstName: 'James', lastName: 'Miller', gender: 'Male', dateOfBirth: '1958-12-03', age: 67, condition: 'Diabetes Type 2', riskScore: 0.52 },
    { id: '8', mrn: 'MRN008', firstName: 'Linda', lastName: 'Taylor', gender: 'Female', dateOfBirth: '1970-08-25', age: 55, condition: 'Hypertension', riskScore: 0.33 },
    { id: '9', mrn: 'MRN009', firstName: 'David', lastName: 'Anderson', gender: 'Male', dateOfBirth: '1948-02-14', age: 78, condition: 'COPD', riskScore: 0.81 },
    { id: '10', mrn: 'MRN010', firstName: 'Patricia', lastName: 'Thomas', gender: 'Female', dateOfBirth: '1965-10-07', age: 60, condition: 'Heart Failure', riskScore: 0.68 },
  ];

  const mockMetrics: MetricsResponse = {
    totalPatients: 10,
    averageAge: 62.9,
    highRiskCount: 4,
    newThisMonth: 3,
    conditionDistribution: [
      { label: 'Heart Failure', value: 3 },
      { label: 'Diabetes Type 2', value: 2 },
      { label: 'COPD', value: 2 },
      { label: 'Hypertension', value: 2 },
      { label: 'Asthma', value: 1 },
    ]
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
      console.warn("Using mock data (API not available):", e);
      // Use mock data for development
      let filtered = mockPatients;
      if (searchQuery) {
        filtered = mockPatients.filter(p => 
          p.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.condition.toLowerCase().includes(searchQuery.toLowerCase())
        );
      }
      patients = filtered;
      metadata = { total_items: filtered.length, total_pages: 1, current_page: 1, limit: 10 };
    } finally {
      loadingPatients = false;
    }
  }

  async function loadMetrics() {
    loadingMetrics = true;
    try {
      metrics = await getMetrics();
    } catch (e) {
      console.warn("Using mock metrics (API not available):", e);
      // Use mock metrics for development
      metrics = mockMetrics;
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
  <!-- Demo Mode Banner -->
  <div class="bg-amber-500 text-white text-center py-2 text-sm font-medium">
    Modo Demo - Usando datos de prueba. Ejecuta en Tauri para usar datos reales.
  </div>
  
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
            Clinical Intelligence
        </h1>
      </div>
      <div class="flex items-center gap-4">
        <div class="flex items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs text-emerald-700 font-medium">
          <span class="relative flex h-2 w-2">
            <span class="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex h-2 w-2 rounded-full bg-emerald-500"></span>
          </span>
          System Online
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
        title="Total Patients" 
        value={metrics?.totalPatients || 0} 
        loading={loadingMetrics} 
        trend="up" 
        trendValue="12%"
        icon="fas fa-users"
      />
      <StatCard 
        title="New Admissions" 
        value={metrics?.newThisMonth || 0} 
        loading={loadingMetrics} 
        trend="up" 
        trendValue="5%" 
        icon="fas fa-user-plus"
      />
      <StatCard 
        title="Critical Alerts" 
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
            title="Condition Distribution" 
            data={distributionData} 
            loading={loadingMetrics} 
          />
      </div>
      <div class="min-h-87.5">
          <GlassChart 
            type="line" 
            title="Patient Growth Trend" 
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
