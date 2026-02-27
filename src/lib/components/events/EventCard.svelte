<script lang="ts">
    import type { Event } from "$lib/modules/harvesters/types";
    import { MapPin, ExternalLink, CalendarDays } from "lucide-svelte";

    export let event: Event;

    // Helper to format the calendar block
    const getMonth = (dateString: string | Date) => {
        return new Date(dateString)
            .toLocaleDateString("en-US", { month: "short" })
            .toUpperCase();
    };

    const getDay = (dateString: string | Date) => {
        return new Date(dateString).toLocaleDateString("en-US", {
            day: "numeric",
        });
    };

    const formatToDate = (dateString: string | Date) => {
        const d = new Date(dateString);
        return d.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        });
    };

    export let viewMode: "grid" | "list" = "grid";

    let isIgnored = false;
</script>

{#if !isIgnored}
    <div
        class="group flex {viewMode === 'grid'
            ? 'h-full flex-col'
            : 'flex-row items-center'} bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/60 overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)] relative"
    >
        <!-- Ignore Button (Absolute Top Right) -->
        <button
            on:click|preventDefault={() => (isIgnored = true)}
            class="absolute top-3 right-3 p-1.5 rounded-lg bg-slate-800/80 text-slate-400 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-slate-700 transition-all z-10"
            title="Ignore Event"
        >
            <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round"
                class="lucide lucide-x"
                ><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg
            >
        </button>

        <div
            class="flex-1 p-6 flex flex-col {viewMode === 'grid'
                ? ''
                : 'justify-center'}"
        >
            <div class="flex gap-5 {viewMode === 'grid' ? '' : 'items-center'}">
                <!-- Calendar Block -->
                <div
                    class="flex-shrink-0 flex flex-col items-center justify-center w-16 h-16 bg-slate-800 rounded-xl border border-slate-700/50 shadow-inner overflow-hidden"
                >
                    <div
                        class="w-full text-center bg-red-500/10 text-red-400 text-[10px] font-bold uppercase tracking-widest py-1 border-b border-red-500/20"
                    >
                        {getMonth(event.startDate)}
                    </div>
                    <div
                        class="w-full flex-1 flex items-center justify-center text-xl font-black text-white"
                    >
                        {getDay(event.startDate)}
                    </div>
                </div>

                <!-- Content -->
                <div class="flex-1 min-w-0">
                    <div class="flex items-start justify-between gap-4 mb-2">
                        <h3
                            class="text-lg font-bold text-white leading-tight group-hover:text-blue-400 transition-colors {viewMode ===
                            'grid'
                                ? 'line-clamp-2'
                                : 'line-clamp-1 truncate pr-8'}"
                            title={event.name}
                        >
                            {event.name}
                        </h3>
                        {#if viewMode === "grid"}
                            <span
                                class="inline-flex flex-shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-500/10 text-blue-400 border border-blue-500/20"
                            >
                                {event.eventType}
                            </span>
                        {/if}
                    </div>

                    <p
                        class="text-sm text-slate-400 {viewMode === 'grid'
                            ? 'line-clamp-3 mb-4'
                            : 'line-clamp-1 mb-2'}"
                    >
                        {event.description}
                    </p>

                    <div
                        class="flex {viewMode === 'grid'
                            ? 'flex-col space-y-2 mt-auto'
                            : 'flex-row items-center gap-6'}"
                    >
                        <!-- Specific dates -->
                        <div
                            class="flex items-center gap-2 text-sm text-slate-300"
                        >
                            <CalendarDays
                                class="w-4 h-4 text-slate-500 flex-shrink-0"
                            />
                            <span class="truncate"
                                >{formatToDate(event.startDate)} - {formatToDate(
                                    event.endDate,
                                )}</span
                            >
                        </div>

                        <!-- Type Tag in List View -->
                        {#if viewMode === "list"}
                            <div
                                class="flex items-center gap-2 text-sm text-slate-300"
                            >
                                <span
                                    class="inline-flex flex-shrink-0 items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wide bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                >
                                    {event.eventType}
                                </span>
                            </div>
                        {/if}

                        <!-- Location -->
                        {#if event.location}
                            <div
                                class="flex items-center gap-2 text-sm text-slate-300"
                            >
                                <MapPin
                                    class="w-4 h-4 text-slate-500 flex-shrink-0"
                                />
                                <span class="truncate" title={event.location}
                                    >{event.location}</span
                                >
                            </div>
                        {/if}
                    </div>
                </div>
            </div>
        </div>

        <!-- Actions Footer / Side -->
        {#if event.websiteUrl}
            <div
                class="{viewMode === 'grid'
                    ? 'px-6 py-4 border-t'
                    : 'px-6 py-6 border-l flex items-center justify-center'} bg-slate-800/30 border-slate-800/60 transition-colors group-hover:bg-slate-800/50"
            >
                <a
                    href={event.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center justify-between gap-2 text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors whitespace-nowrap"
                >
                    {viewMode === "grid" ? "Visit Event Website" : "Visit Site"}
                    <ExternalLink class="w-4 h-4" />
                </a>
            </div>
        {/if}
    </div>
{/if}
