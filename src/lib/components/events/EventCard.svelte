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
</script>

<div
    class="group h-full flex flex-col bg-slate-900/50 backdrop-blur-md rounded-2xl border border-slate-800/60 overflow-hidden hover:border-blue-500/50 transition-all duration-300 hover:shadow-[0_0_30px_-5px_rgba(59,130,246,0.3)]"
>
    <div class="flex-1 p-6">
        <div class="flex gap-5">
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
                        class="text-lg font-bold text-white leading-tight group-hover:text-blue-400 transition-colors line-clamp-2"
                        title={event.name}
                    >
                        {event.name}
                    </h3>
                    <span
                        class="inline-flex flex-shrink-0 items-center px-2.5 py-0.5 rounded-full text-xs font-semibold uppercase tracking-wide bg-blue-500/10 text-blue-400 border border-blue-500/20"
                    >
                        {event.eventType}
                    </span>
                </div>

                <p class="text-sm text-slate-400 line-clamp-3 mb-4">
                    {event.description}
                </p>

                <div class="space-y-2 mt-auto">
                    <!-- Specific dates -->
                    <div class="flex items-center gap-2 text-sm text-slate-300">
                        <CalendarDays
                            class="w-4 h-4 text-slate-500 flex-shrink-0"
                        />
                        <span class="truncate"
                            >{formatToDate(event.startDate)} - {formatToDate(
                                event.endDate,
                            )}</span
                        >
                    </div>

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

    <!-- Actions Footer -->
    {#if event.websiteUrl}
        <div
            class="px-6 py-4 bg-slate-800/30 border-t border-slate-800/60 transition-colors group-hover:bg-slate-800/50"
        >
            <a
                href={event.websiteUrl}
                target="_blank"
                rel="noopener noreferrer"
                class="flex items-center justify-between text-sm font-semibold text-blue-400 hover:text-blue-300 transition-colors"
            >
                Visit Event Website
                <ExternalLink class="w-4 h-4" />
            </a>
        </div>
    {/if}
</div>
