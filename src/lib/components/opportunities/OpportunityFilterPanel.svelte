<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Opportunity } from "$lib/modules/harvesters/types";
    import { X, FilterX } from "lucide-svelte";
    import { fade, slide } from "svelte/transition";

    export let isOpen = false;
    export let data: Opportunity[] = [];

    // The currently active filter selections (passed down from parent)
    export let selectedDomains: string[] = [];
    export let selectedCountries: string[] = [];
    export let selectedNoticeTypes: string[] = [];

    const dispatch = createEventDispatcher();

    // Dynamically derive available filter options based on the dataset
    $: availableDomains = [
        ...new Set(data.map((d) => d.domain || "multi")),
    ].sort() as string[];
    $: availableCountries = [
        ...new Set(data.map((d) => d.country).filter(Boolean)),
    ].sort() as string[];
    $: availableNoticeTypes = [
        ...new Set(data.map((d) => d.noticeType).filter(Boolean)),
    ].sort() as string[];

    function toggleDomain(domain: string) {
        if (selectedDomains.includes(domain)) {
            selectedDomains = selectedDomains.filter((d) => d !== domain);
        } else {
            selectedDomains = [...selectedDomains, domain];
        }
    }

    function toggleCountry(country: string) {
        if (selectedCountries.includes(country)) {
            selectedCountries = selectedCountries.filter((c) => c !== country);
        } else {
            selectedCountries = [...selectedCountries, country];
        }
    }

    function toggleNoticeType(type: string) {
        if (selectedNoticeTypes.includes(type)) {
            selectedNoticeTypes = selectedNoticeTypes.filter((t) => t !== type);
        } else {
            selectedNoticeTypes = [...selectedNoticeTypes, type];
        }
    }

    function clearFilters() {
        selectedDomains = [];
        selectedCountries = [];
        selectedNoticeTypes = [];
    }

    // Helper for generating Flag URLs
    const getFlagUrl = (countryCode: string) =>
        `https://flagcdn.com/w20/${countryCode.toLowerCase()}.png`;
</script>

{#if isOpen}
    <!-- Backdrop overlay -->
    <div
        class="fixed inset-0 bg-[#0a0f1c]/60 backdrop-blur-sm z-30 transition-opacity duration-300"
        transition:fade={{ duration: 200 }}
        role="button"
        tabindex="0"
        on:click={() => dispatch("close")}
        on:keydown={(e) => e.key === "Escape" && dispatch("close")}
    ></div>

    <!-- Slide-in Panel -->
    <aside
        class="fixed inset-y-0 left-64 w-[340px] bg-slate-900/90 border-r border-slate-700/60 shadow-2xl z-40 flex flex-col transform transition-transform duration-300 ease-out"
        transition:slide={{ duration: 300, axis: "x" }}
    >
        <!-- Header -->
        <header
            class="h-20 flex items-center justify-between px-6 border-b border-slate-700/60 bg-slate-800/40"
        >
            <div>
                <h2 class="text-white font-semibold flex items-center gap-2">
                    <FilterX class="w-4 h-4 text-blue-400" />
                    Filter Views
                </h2>
                <p class="text-xs text-slate-400 mt-0.5">
                    Narrow down opportunities
                </p>
            </div>
            <button
                on:click={() => dispatch("close")}
                class="w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
            >
                <X class="w-4 h-4" />
            </button>
        </header>

        <!-- Scrollable filter body -->
        <div class="flex-1 overflow-y-auto p-6 space-y-8 no-scrollbar">
            <!-- Domains Filter -->
            <section>
                <h3
                    class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3"
                >
                    Domain
                </h3>
                <div class="space-y-2">
                    {#each availableDomains as domain}
                        <label
                            class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-700/50"
                        >
                            <input
                                type="checkbox"
                                checked={selectedDomains.includes(domain)}
                                on:change={() => toggleDomain(domain)}
                                class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                            />
                            <span
                                class="text-slate-200 text-sm font-medium capitalize"
                                >{domain}</span
                            >
                        </label>
                    {/each}
                </div>
            </section>

            <!-- Countries Filter -->
            {#if availableCountries.length > 0}
                <section>
                    <h3
                        class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3"
                    >
                        Country
                    </h3>
                    <div
                        class="space-y-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar"
                    >
                        {#each availableCountries as country}
                            <label
                                class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-700/50"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedCountries.includes(
                                        country,
                                    )}
                                    on:change={() => toggleCountry(country)}
                                    class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                                />
                                <div class="flex items-center gap-2">
                                    <img
                                        src={getFlagUrl(country)}
                                        alt={country}
                                        class="w-4 h-auto rounded-sm"
                                    />
                                    <span
                                        class="text-slate-200 text-sm font-medium uppercase"
                                        >{country}</span
                                    >
                                </div>
                            </label>
                        {/each}
                    </div>
                </section>
            {/if}

            <!-- Notice Type Filter -->
            {#if availableNoticeTypes.length > 0}
                <section>
                    <h3
                        class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3"
                    >
                        Notice Type
                    </h3>
                    <div class="space-y-2">
                        {#each availableNoticeTypes as type}
                            <label
                                class="flex items-center gap-3 p-2 rounded-lg hover:bg-slate-800/50 cursor-pointer transition-colors border border-transparent hover:border-slate-700/50"
                            >
                                <input
                                    type="checkbox"
                                    checked={selectedNoticeTypes.includes(type)}
                                    on:change={() => toggleNoticeType(type)}
                                    class="w-4 h-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                                />
                                <span
                                    class="text-slate-200 text-sm font-medium truncate"
                                    title={type}>{type}</span
                                >
                            </label>
                        {/each}
                    </div>
                </section>
            {/if}
        </div>

        <!-- Footer Actions -->
        <footer class="p-4 border-t border-slate-700/60 bg-slate-800/50">
            {#if selectedDomains.length > 0 || selectedCountries.length > 0 || selectedNoticeTypes.length > 0}
                <button
                    on:click={clearFilters}
                    class="w-full py-2.5 px-4 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-300 text-sm font-medium transition-colors"
                >
                    Clear All Filters
                </button>
            {/if}
        </footer>
    </aside>
{/if}

<style>
    .custom-scrollbar::-webkit-scrollbar {
        width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
        background: transparent;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
        background: #334155;
        border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
        background: #475569;
    }
</style>
