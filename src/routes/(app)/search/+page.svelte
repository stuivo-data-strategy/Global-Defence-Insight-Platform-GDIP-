<script lang="ts">
  // Search view
</script>

<div class="max-w-7xl mx-auto space-y-6">
  <div class="flex flex-col md:flex-row gap-4">
    <!-- Filters Sidebar -->
    <aside class="w-full md:w-64 bg-white rounded-xl shadow-sm border border-gray-100 p-5 shrink-0">
      <h2 class="text-lg font-bold text-gray-900 mb-4">Filters</h2>
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Domain</label>
          <select class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option>All Domains</option>
            <option>Air</option>
            <option>Land</option>
            <option>Sea</option>
            <option>Cyber</option>
            <option>Space</option>
          </select>
        </div>
        <div>
          <label class="block text-sm font-medium text-gray-700 mb-1">Notice Type</label>
          <select class="w-full border-gray-300 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
            <option>All Types</option>
            <option>Tenders</option>
            <option>RFPs / RFIs</option>
            <option>Innovation Challenges</option>
          </select>
        </div>
      </div>
    </aside>

    <!-- Search Results -->
    <main class="flex-1 space-y-4">
      <div class="relative">
        <input type="text" placeholder="Search opportunities, keywords, organisations..." class="w-full pl-10 pr-4 py-3 border-gray-300 rounded-xl shadow-sm focus:ring-indigo-500 focus:border-indigo-500 text-base">
        <div class="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <svg class="h-5 w-5 text-gray-400" viewBox="0 0 20 20" fill="currentColor">
            <path fill-rule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clip-rule="evenodd"/>
          </svg>
        </div>
      </div>

      <!-- Result Card Stub -->
      <div class="bg-white rounded-xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow cursor-pointer">
        <div class="flex justify-between items-start">
          <div>
            <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">Cyber</span>
            <h3 class="text-lg font-bold text-gray-900 mt-2">Next-Gen Cybersecurity Infrastructure Setup</h3>
            <p class="text-sm text-gray-500 mt-1">Ministry of Defence - Published 2 days ago</p>
          </div>
          <div class="text-right">
            <p class="text-sm font-semibold text-gray-900">Est. £2.5M</p>
            <p class="text-xs text-red-500 mt-1">Closes in 14 days</p>
          </div>
        </div>
      </div>
    </main>
  </div>
</div>
