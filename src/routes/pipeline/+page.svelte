<script lang="ts">
    import Sidebar from "$lib/components/layout/Sidebar.svelte";
    import type { Opportunity } from "$lib/modules/harvesters/types";
    import { Search, Bell, Briefcase, Plus } from "lucide-svelte";
    import type { PageData } from "./$types";

    export let data: PageData;
    $: opportunities = data.opportunities || [];

    const STAGES = ["New", "Review", "Bid", "Pursue", "Closed"] as const;
    type Stage = (typeof STAGES)[number];

    // Drag and Drop State
    let draggedOppId: string | null = null;
    let dragOverStage: Stage | null = null;
    let isUpdating = false;

    // Handlers
    function handleDragStart(e: DragEvent, oppId: string) {
        draggedOppId = oppId;
        if (e.dataTransfer) {
            e.dataTransfer.effectAllowed = "move";
            e.dataTransfer.setData("text/plain", oppId);
        }
    }

    function handleDragEnter(e: DragEvent, stage: Stage) {
        e.preventDefault();
        dragOverStage = stage;
    }

    function handleDragOver(e: DragEvent) {
        e.preventDefault();
        if (e.dataTransfer) {
            e.dataTransfer.dropEffect = "move";
        }
    }

    async function handleDrop(e: DragEvent, newStage: Stage) {
        e.preventDefault();
        dragOverStage = null;

        const oppId = e.dataTransfer?.getData("text/plain") || draggedOppId;
        if (!oppId) return;

        const opp = opportunities.find((o) => o.id === oppId);
        if (!opp || opp.workflowStage === newStage) return; // No change needed

        // Optimistic UI Update
        const oldStage = opp.workflowStage;
        opportunities = opportunities.map((o) =>
            o.id === oppId ? { ...o, workflowStage: newStage } : o,
        );

        isUpdating = true;
        try {
            const res = await fetch(`/api/opportunities`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: oppId,
                    stage: newStage,
                }),
            });

            if (!res.ok) throw new Error("Failed to update stage");
        } catch (error) {
            console.error("Drag drop update failed:", error);
            // Revert on failure
            opportunities = opportunities.map((o) =>
                o.id === oppId ? { ...o, workflowStage: oldStage } : o,
            );
        } finally {
            isUpdating = false;
            draggedOppId = null;
        }
    }

    // Grouping
    $: groupedOpportunities = STAGES.reduce(
        (acc, stage) => {
            acc[stage] = opportunities.filter(
                (opp) => opp.workflowStage === stage,
            );
            return acc;
        },
        {} as Record<Stage, Opportunity[]>,
    );

    // Compute column values (sum of reviewValue, bidValue, or awardValue depending on stage)
    const computeColumnValue = (stage: Stage, opps: Opportunity[]) => {
        return opps.reduce((sum, opp) => {
            if (stage === "Review") return sum + (opp.reviewValue || 0);
            if (stage === "Bid" || stage === "Pursue")
                return sum + (opp.bidValue || 0);
            if (stage === "Closed") return sum + (opp.awardValue || 0);
            return sum;
        }, 0);
    };

    const formatCurrency = (val: number) => {
        if (!val) return "$0";
        if (val > 1000000) return `$${(val / 1000000).toFixed(1)}M`;
        if (val > 1000) return `$${(val / 1000).toFixed(0)}k`;
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: "USD",
            maximumFractionDigits: 0,
        }).format(val);
    };

    // UI Helpers
    const getStageColor = (stage: Stage) => {
        const colors = {
            New: "border-blue-500/50 hover:border-blue-400 bg-blue-500/10 text-blue-400",
            Review: "border-purple-500/50 hover:border-purple-400 bg-purple-500/10 text-purple-400",
            Bid: "border-amber-500/50 hover:border-amber-400 bg-amber-500/10 text-amber-400",
            Pursue: "border-orange-500/50 hover:border-orange-400 bg-orange-500/10 text-orange-400",
            Closed: "border-emerald-500/50 hover:border-emerald-400 bg-emerald-500/10 text-emerald-400",
        };
        return colors[stage];
    };

    const getDomainColor = (domain?: string) => {
        const colors: Record<string, string> = {
            air: "bg-sky-500/20 text-sky-400 border-sky-500/30",
            land: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
            sea: "bg-blue-600/20 text-blue-400 border-blue-600/30",
            space: "bg-purple-500/20 text-purple-400 border-purple-500/30",
            cyber: "bg-red-500/20 text-red-400 border-red-500/30",
            multi: "bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30",
        };
        return domain
            ? colors[domain.toLowerCase()] ||
                  "bg-slate-700 text-slate-300 border-slate-600"
            : "bg-slate-700 text-slate-300 border-slate-600";
    };

    const getFlagUrl = (countryCode: string) => {
        if (!countryCode || countryCode === "Global") return null;
        // Basic mapping for major countries (using robust CDN)
        const map: Record<string, string> = {
            UK: "gb",
            USA: "us",
            Australia: "au",
            Canada: "ca",
        };
        const code =
            map[countryCode] || countryCode.toLowerCase().substring(0, 2);
        return `https://flagcdn.com/w20/${code}.png`;
    };
</script>

<div class="flex h-screen w-full bg-[#0a0f1c] relative overflow-hidden">
    <div
        class="absolute top-0 right-1/4 w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none mix-blend-screen mix-blend-color-dodge"
    ></div>

    <Sidebar />

    <main class="flex-1 flex flex-col min-w-0 z-10 h-screen">
        <header
            class="h-20 flex items-center justify-between px-8 border-b border-slate-800/60 bg-slate-900/40 backdrop-blur-md shrink-0"
        >
            <div>
                <h1
                    class="text-2xl font-bold tracking-tight text-white flex items-center gap-3"
                >
                    <Briefcase class="w-6 h-6 text-emerald-500" />
                    Capture Pipeline
                </h1>
            </div>

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
                    class="bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 px-4 h-10 rounded-lg text-sm font-semibold flex items-center gap-2 transition-all hover:scale-105 active:scale-95 duration-200"
                >
                    <Plus class="w-4 h-4 stroke-[3]" />
                    <span>New Opportunity</span>
                </button>
            </div>
        </header>

        <!-- Kanban Board Area -->
        <div class="flex-1 overflow-x-auto overflow-y-hidden p-6">
            <div class="flex gap-6 h-full items-start min-w-max">
                {#each STAGES as stage}
                    <!-- Kanban Column -->
                    <!-- svelte-ignore a11y-no-static-element-interactions -->
                    <div
                        class="w-80 flex flex-col h-full bg-slate-800/20 rounded-2xl border {dragOverStage ===
                        stage
                            ? getStageColor(stage)
                                  .split(' ')[0]
                                  .replace('/50', '') + ' bg-slate-800/40'
                            : 'border-slate-700/40'} p-3 shadow-inner shrink-0 transition-colors"
                        on:dragenter={(e) => handleDragEnter(e, stage)}
                        on:dragover={handleDragOver}
                        on:drop={(e) => handleDrop(e, stage)}
                    >
                        <!-- Column Header -->
                        <div
                            class="flex items-center justify-between mb-4 px-2 pt-2"
                        >
                            <div class="flex items-center gap-2">
                                <h3
                                    class="font-bold uppercase tracking-wider text-sm {getStageColor(
                                        stage,
                                    )
                                        .split(' ')
                                        .find((c) => c.startsWith('text-'))}"
                                >
                                    {stage}
                                </h3>
                                <span
                                    class="text-xs font-bold px-2 py-0.5 rounded-full {getStageColor(
                                        stage,
                                    )
                                        .split(' ')
                                        .find((c) =>
                                            c.startsWith('bg-'),
                                        )} {getStageColor(stage)
                                        .split(' ')
                                        .find((c) => c.startsWith('text-'))}"
                                    >{groupedOpportunities[stage].length}</span
                                >
                            </div>
                            <span
                                class="text-xs font-medium text-emerald-400/80"
                            >
                                {formatCurrency(
                                    computeColumnValue(
                                        stage,
                                        groupedOpportunities[stage],
                                    ),
                                )}
                            </span>
                        </div>

                        <!-- Column Body -->
                        <div
                            class="flex-1 overflow-y-auto space-y-3 pr-1 custom-scrollbar pb-4"
                        >
                            {#each groupedOpportunities[stage] as opp (opp.id)}
                                <!-- Kanban Card -->
                                <div
                                    draggable="true"
                                    on:dragstart={(e) =>
                                        handleDragStart(e, opp.id)}
                                    class="bg-slate-800/80 hover:bg-slate-700/80 backdrop-blur border {draggedOppId ===
                                    opp.id
                                        ? getStageColor(stage)
                                              .split(' ')[0]
                                              .replace('/50', '') +
                                          ' opacity-50'
                                        : 'border-slate-600/50'} {getStageColor(
                                        stage,
                                    )
                                        .split(' ')
                                        .find((c) =>
                                            c.startsWith('hover:'),
                                        )} rounded-xl p-4 cursor-grab active:cursor-grabbing transition-all group shadow-sm flex flex-col gap-2"
                                >
                                    <div
                                        class="flex justify-between items-start"
                                    >
                                        <div class="flex items-center gap-1.5">
                                            {#if getFlagUrl(opp.country || "")}
                                                <img
                                                    src={getFlagUrl(
                                                        opp.country || "",
                                                    )}
                                                    alt={opp.country}
                                                    class="w-4 h-3 rounded-[2px] shadow-sm object-cover"
                                                />
                                            {/if}
                                            <span
                                                class="text-[10px] uppercase font-bold tracking-widest text-slate-400 truncate max-w-[80px]"
                                            >
                                                {opp.country || "Global"}
                                            </span>
                                        </div>
                                        <div class="flex gap-1">
                                            {#if opp.domain}
                                                <span
                                                    class="text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border {getDomainColor(
                                                        opp.domain,
                                                    )}"
                                                >
                                                    {opp.domain}
                                                </span>
                                            {/if}
                                            {#if opp.probability != null && opp.probability > 0}
                                                <span
                                                    class="text-[10px] font-bold text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded shadow-sm"
                                                >
                                                    {opp.probability}%
                                                </span>
                                            {/if}
                                        </div>
                                    </div>

                                    <div>
                                        <h4
                                            class="text-sm font-semibold text-white leading-snug mb-1 group-hover:text-slate-200 transition-colors line-clamp-2"
                                        >
                                            {opp.title}
                                        </h4>
                                        <p
                                            class="text-xs text-slate-400 line-clamp-2 leading-relaxed"
                                        >
                                            {opp.description}
                                        </p>
                                    </div>

                                    <div
                                        class="flex items-center justify-between mt-auto border-t border-slate-700/50 pt-3"
                                    >
                                        {#if (stage === "Review" && opp.reviewValue) || (stage === "Bid" && opp.bidValue) || (stage === "Pursue" && opp.bidValue) || (stage === "Closed" && opp.awardValue)}
                                            <span
                                                class="text-xs font-bold text-slate-300"
                                            >
                                                {formatCurrency(
                                                    stage === "Review"
                                                        ? opp.reviewValue!
                                                        : stage === "Closed"
                                                          ? opp.awardValue!
                                                          : opp.bidValue!,
                                                )}
                                            </span>
                                        {:else}
                                            <span
                                                class="text-xs text-slate-500 font-medium tracking-wide"
                                                >Tbd Value</span
                                            >
                                        {/if}

                                        <!-- Placeholder Avatar -->
                                        <div
                                            class="w-6 h-6 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-[9px] font-bold text-slate-300"
                                            title="Unassigned"
                                        >
                                            {opp.ownerId ? "U" : "?"}
                                        </div>
                                    </div>
                                </div>
                            {/each}
                        </div>
                    </div>
                {/each}
            </div>
        </div>
    </main>
</div>

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
