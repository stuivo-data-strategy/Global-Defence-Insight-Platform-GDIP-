<script lang="ts">
    import Sidebar from "$lib/components/layout/Sidebar.svelte";
    import EventCard from "$lib/components/events/EventCard.svelte";
    import type { Event } from "$lib/modules/harvesters/types";
    import { Search, Bell, Loader2, Calendar } from "lucide-svelte";
    import type { PageData } from "./$types";
    import defenceSeedUrls from "$lib/harvest_seeds/defenceSeedUrls";

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

    let viewMode: "grid" | "list" = "list";
    let selectedCategory = "all";
    let selectedSort = "upcoming";

    // Create a new derived state for completely filtered and sorted events
    $: sortedAndFilteredEvents = filteredEvents
        .filter((evt) => {
            if (selectedCategory === "all") return true;
            return evt.eventType === selectedCategory;
        })
        .sort((a, b) => {
            if (selectedSort === "upcoming") {
                return (
                    new Date(a.startDate).getTime() -
                    new Date(b.startDate).getTime()
                );
            } else if (selectedSort === "name") {
                return (a.name || "").localeCompare(b.name || "");
            }
            return 0;
        });

    // Harvesting state and actions
    let harvesting = false;

    async function harvestEvents() {
        if (harvesting) return;
        harvesting = true;
        try {
            // Seed URLs to try extracting schema.org JSON-LD from industry listing pages
            const seedUrls = defenceSeedUrls;

            const defenceQuery =
                'defence OR defense OR military OR "defence expo" OR "defense expo" OR conference OR summit OR exhibition';

            const sources = [
                "meetup-harvester",
                "tentimes-harvester",
                "schema-org-harvester",
            ];
            for (const s of sources) {
                await fetch("/api/harvest", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        count: 500,
                        source: s,
                        urls: seedUrls,
                        q: defenceQuery,
                        defenceOnly: true,
                    }),
                });
            }

            location.reload();
        } catch (e) {
            console.error("Harvest failed", e);
            alert("Harvest failed. See console for details.");
        } finally {
            harvesting = false;
        }
    }

    async function clearMockEvents() {
        if (!confirm("Delete mock events? This cannot be undone.")) return;
        try {
            const res = await fetch("/api/events/clear-mock", {
                method: "POST",
            });
            const j = await res.json();
            if (j.success) {
                alert(`Deleted ${j.deleted || 0} mock events`);
                location.reload();
            } else {
                alert(
                    "Failed to delete mock events: " + (j.error || "unknown"),
                );
            }
        } catch (e) {
            console.error(e);
            alert("Failed to clear mock events");
        }
    }

    async function purgeAllEvents() {
        if (!confirm("Delete ALL events? This will remove every event record."))
            return;
        try {
            const res = await fetch("/api/events/purge", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ confirm: true }),
            });
            const j = await res.json();
            if (j.success) {
                alert("All events deleted");
                location.reload();
            } else {
                alert("Failed to delete events: " + (j.error || "unknown"));
            }
        } catch (e) {
            console.error(e);
            alert("Failed to delete events");
        }
    }
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
        <div
            class="flex-1 overflow-y-auto p-4 md:p-8 no-scrollbar scroll-smooth"
        >
            <div class="max-w-[1400px] mx-auto">
                <!-- Page Header -->
                <div
                    class="flex flex-col md:flex-row items-start md:items-end justify-between mb-8 gap-4"
                >
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

                    <div class="flex items-center gap-3 flex-wrap">
                        <button
                            class="bg-slate-800 text-slate-300 border border-slate-700 font-semibold text-sm px-4 py-2 rounded-lg hover:bg-slate-700 hover:text-white transition"
                            on:click={() =>
                                (viewMode =
                                    viewMode === "grid" ? "list" : "grid")}
                        >
                            Toggle View: {viewMode === "grid" ? "List" : "Grid"}
                        </button>
                    </div>
                </div>

                <!-- Filters Bar -->
                <div
                    class="bg-slate-900/50 border border-slate-800/60 rounded-xl p-4 mb-6 flex flex-wrap gap-4 items-center justify-between"
                >
                    <div class="flex items-center gap-3 flex-wrap">
                        <span class="text-sm font-semibold text-slate-400"
                            >Filter:</span
                        >
                        <select
                            bind:value={selectedCategory}
                            class="bg-slate-800 border border-slate-700 text-sm text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                        >
                            <option value="all">All Types</option>
                            <option value="expo">Expo</option>
                            <option value="conference">Conference</option>
                            <option value="trade_show">Trade Show</option>
                            <option value="innovation">Innovation</option>
                        </select>
                        <select
                            bind:value={selectedSort}
                            class="bg-slate-800 border border-slate-700 text-sm text-slate-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500"
                        >
                            <option value="upcoming"
                                >Sort: Upcoming First</option
                            >
                            <option value="name">Sort: Name (A-Z)</option>
                        </select>
                    </div>

                    <div class="flex items-center gap-2">
                        <button
                            class="bg-blue-600/20 text-blue-400 border border-blue-500/50 text-xs px-3 py-1.5 rounded-lg hover:bg-blue-600 hover:text-white transition font-medium"
                            on:click={harvestEvents}
                            disabled={harvesting}
                        >
                            {#if harvesting}
                                <Loader2
                                    class="w-3 h-3 animate-spin inline mr-1"
                                /> Harvesting...
                            {:else}
                                Harvest Events
                            {/if}
                        </button>
                    </div>
                </div>

                <!-- Events Layout -->
                {#if sortedAndFilteredEvents.length > 0}
                    <div
                        class={viewMode === "grid"
                            ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                            : "flex flex-col gap-4"}
                    >
                        {#each sortedAndFilteredEvents as evt (evt.id)}
                            <EventCard event={evt} {viewMode} />
                        {/each}
                    </div>
                {:else}
                    <div
                        class="flex flex-col items-center justify-center h-64 border border-dashed border-slate-700/60 rounded-2xl bg-slate-800/20 w-full mt-6"
                    >
                        <div
                            class="w-12 h-12 bg-slate-800 rounded-full flex items-center justify-center mb-4 text-slate-500"
                        >
                            <Calendar class="w-6 h-6" />
                        </div>
                        <p class="text-slate-300 font-semibold mb-1">
                            No upcoming events found
                        </p>
                        <p class="text-slate-500 text-sm max-w-sm text-center">
                            Try adjusting your search or filters, or trigger a
                            new harvest to find events.
                        </p>
                    </div>
                {/if}
            </div>
        </div>
    </main>
</div>
