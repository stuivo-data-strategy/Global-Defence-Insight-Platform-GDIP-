<script lang="ts">
  // Pipeline Canvas implementation using Tailwind
</script>

<div class="h-full flex flex-col space-y-4 max-w-7xl mx-auto">
  <div class="flex items-center justify-between">
    <h1 class="text-3xl font-extrabold text-gray-900 tracking-tight">Workflow Pipeline</h1>
  </div>

  <div class="flex-1 flex overflow-x-auto gap-6 pb-4">
    <!-- Pipeline Column: New -->
    <div class="flex-shrink-0 w-80 bg-gray-100 rounded-xl p-3 flex flex-col">
      <h3 class="text-sm font-bold text-gray-700 uppercase tracking-widest pl-2 mb-3">New (3)</h3>
      <div class="space-y-3 flex-1 overflow-y-auto">
        <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition">
          <h4 class="font-bold text-gray-900 text-sm">Autonomous Drone Swarm RFI</h4>
          <p class="text-xs text-gray-500 mt-2 line-clamp-2">Research into swarming tech for forward observation...</p>
        </div>
      </div>
    </div>

    <!-- Pipeline Column: Review -->
    <div class="flex-shrink-0 w-80 bg-gray-100 rounded-xl p-3 flex flex-col">
      <h3 class="text-sm font-bold text-gray-700 uppercase tracking-widest pl-2 mb-3">Review (1)</h3>
      <div class="space-y-3 flex-1 overflow-y-auto">
         <!-- Card -->
         <div class="bg-white p-4 rounded-lg shadow-sm border border-gray-200 cursor-grab hover:shadow-md transition">
          <h4 class="font-bold text-gray-900 text-sm">Naval Radar Upgrade</h4>
          <p class="text-xs text-gray-500 mt-2 line-clamp-2">Upgrading Type 45 systems.</p>
        </div>
      </div>
    </div>

    <!-- Other columns stubbed: Pursue, Bid, Closed -->
    <div class="flex-shrink-0 w-80 bg-gray-100 rounded-xl p-3 flex flex-col">
      <h3 class="text-sm font-bold text-gray-700 uppercase tracking-widest pl-2 mb-3">Pursue (0)</h3>
    </div>
  </div>
</div>
