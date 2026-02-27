<script lang="ts">
    import Sidebar from "$lib/components/layout/Sidebar.svelte";
    import OpportunityTable from "$lib/components/opportunities/OpportunityTable.svelte";
    import OpportunityDetailPanel from "$lib/components/opportunities/OpportunityDetailPanel.svelte";
    import OpportunityFilterPanel from "$lib/components/opportunities/OpportunityFilterPanel.svelte";
    import type { Opportunity } from "$lib/modules/harvesters/types";
    import { Search, Filter, Bell, Plus, Loader2 } from "lucide-svelte";
    import type { PageData } from "./$types";
    import { invalidateAll } from "$app/navigation";

    export let data: PageData;
    $: opportunities = data.opportunities || [];

    // Search & Filtering Logic
    let searchQuery = "";
    let isFilterOpen = false;
    let selectedDomains: string[] = [];
    let selectedCountries: string[] = [];
    let selectedNoticeTypes: string[] = [];

    // Check if any filters are currently active (to show a visual indicator)
    $: activeFilterCount =
        selectedDomains.length +
        selectedCountries.length +
        selectedNoticeTypes.length;

    $: filteredOpportunities = opportunities.filter((opp) => {
        // 1. Text Search Filter
        if (searchQuery) {
            const q = searchQuery.toLowerCase();
            const matchesSearch =
                opp.title?.toLowerCase().includes(q) ||
                opp.country?.toLowerCase().includes(q) ||
                opp.organisation?.toLowerCase().includes(q) ||
                opp.domain?.toLowerCase().includes(q);
            if (!matchesSearch) return false;
        }

        // 2. Domain Filter
        if (selectedDomains.length > 0) {
            const oppDomain = opp.domain || "multi"; // fallback for robustness
            if (!selectedDomains.includes(oppDomain)) return false;
        }

        // 3. Country Filter
        if (selectedCountries.length > 0) {
            if (!opp.country || !selectedCountries.includes(opp.country))
                return false;
        }

        // 4. Notice Type Filter
        if (selectedNoticeTypes.length > 0) {
            if (
                !opp.noticeType ||
                !selectedNoticeTypes.includes(opp.noticeType)
            )
                return false;
        }

        return true;
    });
    // Detail Panel State
    let selectedOpportunity: Opportunity | null = null;
    let isPanelOpen = false;

    function handleRowSelect(event: CustomEvent<Opportunity>) {
        selectedOpportunity = event.detail;
        isPanelOpen = true;
    }

    function handlePanelClose() {
        isPanelOpen = false;
        // Optionally clear selection after animation finishes
        setTimeout(() => {
            if (!isPanelOpen) selectedOpportunity = null;
        }, 500);
    }

    async function handleStageUpdate(
        event: CustomEvent<{ id: string; stage: string }>,
    ) {
        const { id, stage } = event.detail;
        const typedStage = stage as
            | "New"
            | "Review"
            | "Bid"
            | "Pursue"
            | "Closed";

        // Optimistically update the UI tracking array
        opportunities = opportunities.map((opp) =>
            opp.id === id ? { ...opp, workflowStage: typedStage } : opp,
        );

        if (selectedOpportunity?.id === id) {
            selectedOpportunity = {
                ...selectedOpportunity,
                workflowStage: typedStage,
            };
        }

        // Persist the change to the database
        try {
            const res = await fetch("/api/opportunities", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ id, stage: typedStage }),
            });

            if (!res.ok) {
                console.error("Failed to save stage update:", await res.text());
                // In a production app, we would revert the optimistic update here.
            }
        } catch (error) {
            console.error("Network error updating CRM stage:", error);
        }
    }

    // Harvest execution state
    let isHarvesting = false;

    async function handleHarvest() {
        if (isHarvesting) return;
        isHarvesting = true;

        try {
            const res = await fetch("/api/harvest", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ count: 15, source: "all" }),
            });

            if (res.ok) {
                // Force SvelteKit to re-run the +page.ts loader to fetch the new data from Postgres
                await invalidateAll();
            } else {
                console.error("Harvest API failed:", await res.text());
            }
        } catch (e) {
            console.error("Error triggering harvest:", e);
        } finally {
            isHarvesting = false;
        }
    }
</script>

<div class="flex h-full w-full bg-[#111827] relative overflow-hidden">
    <!-- Add subtle background glowing orbs -->
    <div
        class="absolute top-0 left-1/4 w-[500px] h-[500px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none mix-blend-screen mix-blend-color-dodge"
    ></div>
    <div
        class="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-indigo-600/5 rounded-full blur-[150px] pointer-events-none mix-blend-screen mix-blend-color-dodge"
    ></div>

    <!-- Main Sidebar Navigation -->
    <Sidebar />

    <!-- Main Content Area -->
    <main class="flex-1 flex flex-col min-w-0 z-10">
        <!-- Top Header -->
        <header
            class="h-20 flex items-center justify-between px-8 border-b border-slate-700/60 bg-slate-800/40 backdrop-blur-md sticky top-0 z-20"
        >
            <!-- Search Bar -->
            <div class="relative w-96 max-w-full">
                <Search
                    class="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500"
                />
                <input
                    type="text"
                    bind:value={searchQuery}
                    placeholder="Search opportunities, regions, or agencies..."
                    class="w-full h-10 bg-slate-700/50 border border-slate-600/60 rounded-xl pl-10 pr-4 text-sm text-slate-200 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-medium"
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
                <button
                    on:click={handleHarvest}
                    disabled={isHarvesting}
                    class="bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 px-4 h-10 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
                >
                    {#if isHarvesting}
                        <Loader2 class="w-4 h-4 animate-spin text-white" />
                        <span>Harvesting...</span>
                    {:else}
                        <Plus class="w-4 h-4 stroke-[3]" />
                        <span>Harvest Now</span>
                    {/if}
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
                            class="text-3xl font-bold tracking-tight text-white mb-2"
                        >
                            Live Opportunities
                        </h1>
                        <p class="text-slate-400 text-sm">
                            Discover and track harvested global defense
                            intelligence.
                        </p>
                    </div>

                    <div class="flex items-center gap-3">
                        <button
                            on:click={() => (isFilterOpen = !isFilterOpen)}
                            class="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800/80 border border-slate-700 text-sm font-medium text-slate-300 hover:text-white hover:bg-slate-700 transition-colors relative"
                        >
                            <Filter class="w-4 h-4" />
                            Filter Views
                            {#if activeFilterCount > 0}
                                <span
                                    class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-blue-600 outline outline-2 outline-slate-900 text-[10px] text-white font-bold"
                                >
                                    {activeFilterCount}
                                </span>
                            {/if}
                        </button>
                    </div>
                </div>

                <!-- Opportunities Table -->
                {#if filteredOpportunities.length > 0}
                    <OpportunityTable
                        data={filteredOpportunities}
                        activeId={selectedOpportunity?.id}
                        on:select={handleRowSelect}
                    />
                {:else}
                    <div
                        class="flex flex-col items-center justify-center h-64 border border-dashed border-slate-600 rounded-2xl bg-slate-700/30"
                    >
                        <div
                            class="w-12 h-12 bg-slate-700 rounded-full flex items-center justify-center mb-4 text-slate-400"
                        >
                            <Search class="w-6 h-6" />
                        </div>
                        <p class="text-slate-400 font-medium">
                            No opportunities found.
                        </p>
                        <button
                            on:click={handleHarvest}
                            disabled={isHarvesting}
                            class="mt-4 text-blue-400 text-sm font-medium hover:text-blue-300 disabled:opacity-50 flex items-center gap-2"
                        >
                            {#if isHarvesting}
                                <Loader2 class="w-3.5 h-3.5 animate-spin" />
                            {/if}
                            Run a manual harvest
                        </button>
                    </div>
                {/if}
            </div>
        </div>
    </main>

    <!-- Slide-out Detail Panel -->
    <OpportunityDetailPanel
        opportunity={selectedOpportunity}
        isOpen={isPanelOpen}
        on:close={handlePanelClose}
        on:updateStage={handleStageUpdate}
    />

    <!-- Slide-out Filter Panel -->
    <OpportunityFilterPanel
        isOpen={isFilterOpen}
        data={opportunities}
        bind:selectedDomains
        bind:selectedCountries
        bind:selectedNoticeTypes
        on:close={() => (isFilterOpen = false)}
    />
</div>
