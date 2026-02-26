<script lang="ts">
    import Sidebar from "$lib/components/layout/Sidebar.svelte";
    import EventCard from "$lib/components/events/EventCard.svelte";
    import type { Event } from "$lib/modules/harvesters/types";
    import { Search, Bell, Loader2, Calendar } from "lucide-svelte";
    import type { PageData } from "./$types";

    export let data: PageData;
    $: events = data.events || [];

    let searchQuery = "";

    $: filteredEvents = events.filter((evt) => {
        if (!searchQuery) return true;
        const q = searchQuery.toLowerCase();

        return (
            evt.name?.toLowerCase().includes(q) ||
            evt.location?.toLowerCase().includes(q) ||
            evt.description?.toLowerCase().includes(q)
        );
    });
</script>

<div class="flex h-full w-full bg-[#0a0f1c] relative overflow-hidden">
    <!-- Add subtle background glowing orbs -->
    <div
        class="absolute top-0 right-1/4 w-[400px] h-[400px] bg-purple-600/20 rounded-full blur-[120px] pointer-events-none mix-blend-screen mix-blend-color-dodge"
    ></div>
    <div
        class="absolute bottom-1/4 left-1/4 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[150px] pointer-events-none mix-blend-screen mix-blend-color-dodge"
    ></div>

    <!-- Main Sidebar Navigation -->
    <Sidebar />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 z-10">
        <!-- Top Header -->
        <header
            class="h-20 flex items-center justify-between px-8 border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-md sticky top-0 z-20"
        >
            <!-- Search Bar -->
            <div class="relative w-96 max-w-full">
                <Search
                    class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                />
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search events by name, location, or topic..."
                    class="w-full h-10 bg-slate-800/50 border border-slate-700/60 rounded-xl pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
                />
            </div>

            <!-- Top Actions -->
            <div class="flex items-center gap-4">
                <button
                    class="w-10 h-10 rounded-full flex items-center justify-center hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors relative"
                >
                    <Bell class="w-5 h-5" />
                    <span
                        class="absolute top-2.5 right-2.5 w-2 h-2 bg-blue-500 rounded-full ring-2 ring-slate-900"
                    ></span>
                </button>
            </div>
        </header>

        <!-- Scrollable Content -->
        <div class="flex-1 overflow-y-auto p-8 no-scrollbar scroll-smooth">
            <div class="max-w-[1600px] mx-auto">
                <!-- Page Header -->
                <div class="flex items-end justify-between mb-8">
                    <div>
                        <h1
                            class="text-3xl font-bold tracking-tight text-white mb-2 flex items-center gap-3"
                        >
                            <Calendar class="w-8 h-8 text-blue-500" />
                            Global Defense Events
                        </h1>
                        <p class="text-slate-400 text-sm">
                            Upcoming symposia, conferences, and expos across the
                            defense sector.
                        </p>
                    </div>

                    <!-- We can add 'Filter Views' here later just like Opportunities -->
                </div>

                <!-- Events Grid -->
                {#if filteredEvents.length > 0}
                    <div
                        class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-6"
                    >
                        {#each filteredEvents as evt (evt.id)}
                            <EventCard event={evt} />
                        {/each}
                    </div>
                {:else}
                    <div
                        class="flex flex-col items-center justify-center h-64 border border-dashed border-slate-700 rounded-2xl bg-slate-800/30 w-full mt-10"
                    >
                        <div
                            class="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500"
                        >
                            <Calendar class="w-6 h-6" />
                        </div>
                        <p class="text-slate-400 font-medium">
                            No upcoming events found.
                        </p>
                        <p class="text-slate-500 text-sm mt-1">
                            Try harvesting opportunities to gather more event
                            intel.
                        </p>
                    </div>
                {/if}
            </div>
        </div>
    </main>
</div>
