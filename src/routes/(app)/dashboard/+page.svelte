<script lang="ts">
  // Dashboard Metrics
</script>

<div class="max-w-7xl mx-auto space-y-6">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Dashboard</h1>
    <button class="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-medium shadow-sm transition-colors">
      New Opportunity
    </button>
  </div>

  <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
    <!-- Metric Card -->
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Opportunities</h3>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-4xl font-bold text-gray-900">142</span>
        <span class="text-sm font-medium text-green-600">+12% from last week</span>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Upcoming Deadlines</h3>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-4xl font-bold text-gray-900">8</span>
        <span class="text-sm font-medium text-red-600">This week</span>
      </div>
    </div>
    <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <h3 class="text-sm font-medium text-gray-500 uppercase tracking-wider">Active Harvesters</h3>
      <div class="mt-2 flex items-baseline gap-2">
        <span class="text-4xl font-bold text-gray-900">5/5</span>
        <span class="text-sm font-medium text-green-600">All healthy</span>
      </div>
    </div>
  </div>
</div>
