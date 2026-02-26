<script lang="ts">
  // App Layout Shell
</script>

<div class="flex h-screen bg-gray-50 text-slate-900">
  <!-- Sidebar -->
  <aside class="w-64 bg-white border-r border-gray-200 flex flex-col hidden md:flex">
    <div class="h-16 flex items-center px-6 border-b border-gray-100 font-bold text-lg text-indigo-700">
      SentinelScope
    </div>
    <nav class="flex-1 p-4 space-y-1">
      <a href="/dashboard" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">Dashboard</a>
      <a href="/search" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">Search</a>
      <a href="/events" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">Events Explorer</a>
      <a href="/pipeline" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">Workflow Pipeline</a>
      <a href="/workspace" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100">Team Workspace</a>
    </nav>
    <div class="p-4 border-t border-gray-100">
      <a href="/console" class="block px-3 py-2 rounded-md text-sm font-medium text-gray-500 hover:bg-gray-100">Admin Console</a>
    </div>
  </aside>

  <!-- Main Content -->
  <main class="flex-1 overflow-y-auto">
    <header class="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm">
      <div class="text-xl font-semibold text-gray-800">Workspace name</div>
      <div class="flex items-center space-x-4">
        <button class="text-sm font-medium text-gray-600 hover:text-gray-900">Alerts</button>
        <div class="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold">U</div>
      </div>
    </header>
    <div class="p-6">
      <slot />
    </div>
  </main>
</div>
