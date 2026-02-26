<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Opportunity } from "$lib/modules/harvesters/types";
    import Badge from "../ui/Badge.svelte";
    import {
        X,
        Globe2,
        Building2,
        Calendar,
        DollarSign,
        Tag,
        ExternalLink,
        Clock,
        CheckCircle2,
        TrendingUp,
        Save,
        Loader2,
        MessageSquare,
        Phone,
        Users,
        Flag,
        Plus,
        Send,
    } from "lucide-svelte";

    export let opportunity: Opportunity | null = null;
    export let isOpen = false;

    const dispatch = createEventDispatcher();

    // CRM Form State
    let crmProbability = 0;
    let crmReviewValue: number | null = null;
    let crmBidValue: number | null = null;
    let crmAwardValue: number | null = null;
    let isSaving = false;
    let saveStatus: "idle" | "success" | "error" = "idle";

    // Activity Feed State
    interface Activity {
        id: string;
        type: string;
        title: string;
        description: string | null;
        status: string;
        dueDate: string | null;
        createdAt: string;
    }
    let activityList: Activity[] = [];
    let isLoadingActivities = false;
    let showAddActivity = false;
    let newActivityType = "task";
    let newActivityTitle = "";
    let newActivityDescription = "";
    let newActivityDueDate = "";
    let isAddingActivity = false;

    const activityTypes = [
        {
            value: "task",
            label: "Task",
            icon: CheckCircle2,
            color: "text-blue-400",
        },
        {
            value: "meeting",
            label: "Meeting",
            icon: Users,
            color: "text-purple-400",
        },
        { value: "call", label: "Call", icon: Phone, color: "text-amber-400" },
        {
            value: "milestone",
            label: "Milestone",
            icon: Flag,
            color: "text-emerald-400",
        },
        {
            value: "note",
            label: "Note",
            icon: MessageSquare,
            color: "text-slate-400",
        },
    ];

    async function loadActivities(entityId: string) {
        isLoadingActivities = true;
        try {
            const res = await fetch(
                `/api/activities?entityId=${entityId}&entityType=opportunity`,
            );
            if (res.ok) {
                const result = await res.json();
                activityList = result.data || [];
            }
        } catch (e) {
            console.error("Failed to load activities:", e);
        } finally {
            isLoadingActivities = false;
        }
    }

    async function addActivity() {
        if (!opportunity || !newActivityTitle.trim()) return;
        isAddingActivity = true;
        try {
            const res = await fetch("/api/activities", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    entityId: opportunity.id,
                    entityType: "opportunity",
                    type: newActivityType,
                    title: newActivityTitle.trim(),
                    description: newActivityDescription.trim() || null,
                    dueDate: newActivityDueDate || null,
                }),
            });
            if (res.ok) {
                const result = await res.json();
                activityList = [result.data, ...activityList];
                // Reset form
                newActivityTitle = "";
                newActivityDescription = "";
                newActivityDueDate = "";
                showAddActivity = false;
            }
        } catch (e) {
            console.error("Failed to add activity:", e);
        } finally {
            isAddingActivity = false;
        }
    }

    // Sync CRM form state AND load activities when opportunity changes
    $: if (opportunity) {
        crmProbability = opportunity.probability ?? 0;
        crmReviewValue = opportunity.reviewValue ?? null;
        crmBidValue = opportunity.bidValue ?? null;
        crmAwardValue = opportunity.awardValue ?? null;
        saveStatus = "idle";
        loadActivities(opportunity.id);
    }

    function closePanel() {
        dispatch("close");
    }

    function updateStage(newStage: string) {
        if (opportunity) {
            dispatch("updateStage", { id: opportunity.id, stage: newStage });
        }
    }

    async function saveCrmData() {
        if (!opportunity) return;
        isSaving = true;
        saveStatus = "idle";
        try {
            const res = await fetch("/api/opportunities", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    id: opportunity.id,
                    updates: {
                        probability: crmProbability,
                        reviewValue: crmReviewValue,
                        bidValue: crmBidValue,
                        awardValue: crmAwardValue,
                    },
                }),
            });
            if (!res.ok) throw new Error("Save failed");
            saveStatus = "success";

            dispatch("crmUpdate", {
                id: opportunity.id,
                updates: {
                    probability: crmProbability,
                    reviewValue: crmReviewValue,
                    bidValue: crmBidValue,
                    awardValue: crmAwardValue,
                },
            });

            setTimeout(() => {
                saveStatus = "idle";
            }, 2500);
        } catch (e) {
            console.error("CRM save error:", e);
            saveStatus = "error";
        } finally {
            isSaving = false;
        }
    }

    // Activity helpers
    const getActivityIcon = (type: string) =>
        activityTypes.find((t) => t.value === type) || activityTypes[4];
    const formatTimeAgo = (dateStr: string) => {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    };

    // Formatting helpers
    $: publishDate = opportunity?.publishedAt
        ? new Date(opportunity.publishedAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : "Unknown";
    $: deadlineDate = opportunity?.deadlineAt
        ? new Date(opportunity.deadlineAt).toLocaleDateString("en-GB", {
              day: "numeric",
              month: "long",
              year: "numeric",
          })
        : "TBD";
    $: formattedValue = opportunity?.valueExt
        ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: opportunity.valueCurrency || "USD",
          }).format(opportunity.valueExt)
        : "TBD";

    const stages = ["New", "Review", "Bid", "Pursue", "Closed"];
</script>

<!-- Backdrop overlay -->
{#if isOpen}
    <!-- svelte-ignore a11y-click-events-have-key-events -->
    <div
        role="button"
        tabindex="0"
        class="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-40 transition-opacity"
        on:click={closePanel}
        on:keydown={(e) => e.key === "Escape" && closePanel()}
    ></div>
{/if}

<!-- Sliding Panel -->
<div
    class="fixed top-0 right-0 h-screen w-full md:w-[600px] xl:w-[700px] bg-slate-900 border-l border-slate-700/60 shadow-2xl z-50 transform transition-transform duration-500 ease-in-out flex flex-col {isOpen
        ? 'translate-x-0'
        : 'translate-x-full'}"
>
    {#if opportunity}
        <!-- Panel Header -->
        <div
            class="px-8 py-6 border-b border-slate-800/80 bg-slate-800/20 flex flex-col gap-4 relative"
        >
            <button
                on:click={closePanel}
                class="absolute top-6 right-8 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
            >
                <X class="w-5 h-5" />
            </button>

            <div class="flex flex-wrap gap-2 pr-12">
                <Badge variant={opportunity.domain || "multi"}>
                    <span class="capitalize font-bold"
                        >{opportunity.domain || "Multi-Domain"}</span
                    >
                </Badge>
                <Badge variant={opportunity.noticeType}>
                    {opportunity.noticeType}
                </Badge>
            </div>

            <h2
                class="text-2xl font-bold text-white tracking-tight leading-tight pr-8"
            >
                {opportunity.title}
            </h2>

            <div class="flex items-center gap-2 text-sm text-slate-400">
                <span
                    class="font-mono text-xs bg-slate-800 px-2 py-0.5 rounded text-slate-500"
                    >{opportunity.id}</span
                >
                <span>•</span>
                <a
                    href={opportunity.sourceUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    class="flex items-center gap-1 hover:text-blue-400 transition-colors"
                >
                    Original Source <ExternalLink class="w-3.5 h-3.5" />
                </a>
            </div>
        </div>

        <!-- Scrollable Body -->
        <div class="flex-1 overflow-y-auto w-full no-scrollbar relative p-8">
            <!-- Key Meta Data Grid -->
            <div
                class="grid grid-cols-2 gap-y-6 gap-x-8 mb-10 pb-8 border-b border-slate-800/60"
            >
                <div class="flex gap-4">
                    <div
                        class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0"
                    >
                        <Building2 class="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <p
                            class="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1"
                        >
                            Agency
                        </p>
                        <p class="text-sm font-medium text-slate-200">
                            {opportunity.organisation}
                        </p>
                    </div>
                </div>

                <div class="flex gap-4">
                    <div
                        class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0"
                    >
                        <Globe2 class="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <p
                            class="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1"
                        >
                            Location
                        </p>
                        <div class="flex items-center gap-2">
                            {#if opportunity.country}
                                <img
                                    src={`https://flagcdn.com/w20/${opportunity.country.toLowerCase()}.png`}
                                    alt={opportunity.country}
                                    class="rounded-sm w-5 h-auto"
                                />
                            {/if}
                            <p class="text-sm font-medium text-slate-200">
                                {opportunity.region || "Global"}, {opportunity.country ||
                                    "N/A"}
                            </p>
                        </div>
                    </div>
                </div>

                <div class="flex gap-4">
                    <div
                        class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0"
                    >
                        <DollarSign class="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <p
                            class="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1"
                        >
                            Est. Value
                        </p>
                        <p class="text-sm font-bold text-blue-400">
                            {formattedValue}
                        </p>
                    </div>
                </div>

                <div class="flex gap-4">
                    <div
                        class="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center shrink-0"
                    >
                        <Clock class="w-5 h-5 text-slate-400" />
                    </div>
                    <div>
                        <p
                            class="text-xs text-slate-500 uppercase font-semibold tracking-wider mb-1"
                        >
                            Timeline
                        </p>
                        <p class="text-[13px] font-medium text-slate-300">
                            Pub: {publishDate}
                        </p>
                        <p class="text-[13px] font-bold text-orange-400 mt-0.5">
                            Due: {deadlineDate}
                        </p>
                    </div>
                </div>
            </div>

            <!-- Full Description -->
            <div class="mb-10">
                <h3
                    class="text-sm font-bold text-white uppercase tracking-wider mb-4 flex items-center gap-2"
                >
                    <div class="w-1 h-4 bg-blue-500 rounded-full"></div>
                    Intelligence Overview
                </h3>
                <p
                    class="text-slate-300 leading-relaxed text-[15px] whitespace-pre-wrap"
                >
                    {opportunity.description}
                </p>
            </div>

            <!-- CRM & Strategy Section -->
            <div class="mb-10 pb-8 border-b border-slate-800/60">
                <h3
                    class="text-sm font-bold text-white uppercase tracking-wider mb-5 flex items-center gap-2"
                >
                    <div class="w-1 h-4 bg-emerald-500 rounded-full"></div>
                    <TrendingUp class="w-4 h-4 text-emerald-400" />
                    CRM & Strategy
                </h3>

                <!-- Probability Slider -->
                <div class="mb-6">
                    <label
                        class="block text-xs text-slate-400 uppercase tracking-wider font-semibold mb-2"
                    >
                        Win Probability
                        <span class="text-emerald-400 font-bold ml-1"
                            >{crmProbability}%</span
                        >
                    </label>
                    <input
                        type="range"
                        min="0"
                        max="100"
                        step="5"
                        bind:value={crmProbability}
                        class="w-full h-2 rounded-full appearance-none cursor-pointer accent-emerald-500"
                        style="background: linear-gradient(to right, #10b981 0%, #10b981 {crmProbability}%, #334155 {crmProbability}%, #334155 100%)"
                    />
                    <div
                        class="flex justify-between text-[10px] text-slate-500 mt-1"
                    >
                        <span>0%</span>
                        <span>25%</span>
                        <span>50%</span>
                        <span>75%</span>
                        <span>100%</span>
                    </div>
                </div>

                <!-- Financial Inputs Grid -->
                <div class="grid grid-cols-3 gap-3 mb-5">
                    <div>
                        <label
                            class="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5"
                            >Review Value</label
                        >
                        <div class="relative">
                            <span
                                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
                                >$</span
                            >
                            <input
                                type="number"
                                bind:value={crmReviewValue}
                                placeholder="0"
                                class="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 pl-6 py-2.5 text-sm text-white placeholder-slate-600 focus:border-purple-500 focus:ring-1 focus:ring-purple-500/30 outline-none transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            class="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5"
                            >Bid Value</label
                        >
                        <div class="relative">
                            <span
                                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
                                >$</span
                            >
                            <input
                                type="number"
                                bind:value={crmBidValue}
                                placeholder="0"
                                class="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 pl-6 py-2.5 text-sm text-white placeholder-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500/30 outline-none transition-colors"
                            />
                        </div>
                    </div>
                    <div>
                        <label
                            class="block text-[10px] text-slate-500 uppercase tracking-wider font-semibold mb-1.5"
                            >Award Value</label
                        >
                        <div class="relative">
                            <span
                                class="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-xs"
                                >$</span
                            >
                            <input
                                type="number"
                                bind:value={crmAwardValue}
                                placeholder="0"
                                class="w-full bg-slate-800 border border-slate-700/60 rounded-lg px-3 pl-6 py-2.5 text-sm text-white placeholder-slate-600 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30 outline-none transition-colors"
                            />
                        </div>
                    </div>
                </div>

                <!-- Save Button -->
                <button
                    on:click={saveCrmData}
                    disabled={isSaving}
                    class="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200
                        {saveStatus === 'success'
                        ? 'bg-emerald-600/20 border border-emerald-500 text-emerald-400'
                        : saveStatus === 'error'
                          ? 'bg-red-600/20 border border-red-500 text-red-400'
                          : 'bg-slate-800 border border-slate-700/60 text-slate-300 hover:bg-slate-700 hover:text-white'}"
                >
                    {#if isSaving}
                        <Loader2 class="w-4 h-4 animate-spin" /> Saving...
                    {:else if saveStatus === "success"}
                        <CheckCircle2 class="w-4 h-4" /> Saved!
                    {:else if saveStatus === "error"}
                        <X class="w-4 h-4" /> Failed — Retry
                    {:else}
                        <Save class="w-4 h-4" /> Save CRM Data
                    {/if}
                </button>
            </div>

            <!-- Keywords List -->
            {#if opportunity.keywords && opportunity.keywords.length > 0}
                <div>
                    <h3
                        class="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2"
                    >
                        <Tag class="w-3.5 h-3.5" /> Indexed Tags
                    </h3>
                    <div class="flex flex-wrap gap-2">
                        {#each opportunity.keywords as tag}
                            <span
                                class="px-3 py-1.5 bg-slate-800 text-slate-300 text-xs font-medium rounded-lg border border-slate-700/60"
                            >
                                {tag}
                            </span>
                        {/each}
                    </div>
                </div>
            {/if}

            <!-- Activity Feed Section -->
            <div class="mb-10">
                <div class="flex items-center justify-between mb-5">
                    <h3
                        class="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2"
                    >
                        <div class="w-1 h-4 bg-purple-500 rounded-full"></div>
                        <MessageSquare class="w-4 h-4 text-purple-400" />
                        Activity Feed
                    </h3>
                    <button
                        on:click={() => (showAddActivity = !showAddActivity)}
                        class="text-xs font-semibold flex items-center gap-1 px-3 py-1.5 rounded-lg transition-all
                            {showAddActivity
                            ? 'bg-purple-600/20 border border-purple-500 text-purple-400'
                            : 'bg-slate-800 border border-slate-700/60 text-slate-400 hover:text-white hover:bg-slate-700'}"
                    >
                        <Plus class="w-3.5 h-3.5" /> Add
                    </button>
                </div>

                <!-- Add Activity Form -->
                {#if showAddActivity}
                    <div
                        class="bg-slate-800/60 border border-slate-700/40 rounded-xl p-4 mb-5 space-y-3"
                    >
                        <!-- Type Selector -->
                        <div class="flex gap-1.5">
                            {#each activityTypes as aType}
                                <button
                                    on:click={() =>
                                        (newActivityType = aType.value)}
                                    class="flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded-lg border transition-all
                                        {newActivityType === aType.value
                                        ? `bg-slate-700 border-slate-600 ${aType.color}`
                                        : 'bg-transparent border-slate-700/40 text-slate-500 hover:text-slate-300'}"
                                >
                                    {aType.label}
                                </button>
                            {/each}
                        </div>
                        <!-- Title Input -->
                        <input
                            type="text"
                            bind:value={newActivityTitle}
                            placeholder="Activity title..."
                            class="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 outline-none transition-colors"
                        />
                        <!-- Description -->
                        <textarea
                            bind:value={newActivityDescription}
                            placeholder="Notes (optional)..."
                            rows="2"
                            class="w-full bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-600 focus:border-purple-500 outline-none transition-colors resize-none"
                        ></textarea>
                        <!-- Due Date + Submit -->
                        <div class="flex gap-2">
                            <input
                                type="date"
                                bind:value={newActivityDueDate}
                                class="flex-1 bg-slate-900 border border-slate-700/60 rounded-lg px-3 py-2 text-sm text-white focus:border-purple-500 outline-none transition-colors"
                            />
                            <button
                                on:click={addActivity}
                                disabled={isAddingActivity ||
                                    !newActivityTitle.trim()}
                                class="px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-1.5 transition-all
                                    {isAddingActivity
                                    ? 'bg-slate-700 text-slate-400'
                                    : 'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20'}"
                            >
                                {#if isAddingActivity}
                                    <Loader2 class="w-3.5 h-3.5 animate-spin" />
                                {:else}
                                    <Send class="w-3.5 h-3.5" />
                                {/if}
                                Add
                            </button>
                        </div>
                    </div>
                {/if}

                <!-- Activity Timeline -->
                {#if isLoadingActivities}
                    <div class="flex items-center justify-center py-8">
                        <Loader2 class="w-5 h-5 animate-spin text-slate-500" />
                    </div>
                {:else if activityList.length === 0}
                    <div class="text-center py-8">
                        <MessageSquare
                            class="w-8 h-8 text-slate-600 mx-auto mb-2"
                        />
                        <p class="text-sm text-slate-500">No activities yet</p>
                        <p class="text-xs text-slate-600">
                            Add a task, meeting, or note to get started
                        </p>
                    </div>
                {:else}
                    <div class="space-y-1">
                        {#each activityList as activity (activity.id)}
                            {@const aInfo = getActivityIcon(activity.type)}
                            <div
                                class="flex gap-3 p-3 rounded-lg hover:bg-slate-800/40 transition-colors group"
                            >
                                <!-- Icon -->
                                <div
                                    class="w-8 h-8 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center shrink-0 mt-0.5"
                                >
                                    <svelte:component
                                        this={aInfo.icon}
                                        class="w-3.5 h-3.5 {aInfo.color}"
                                    />
                                </div>
                                <!-- Content -->
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center gap-2 mb-0.5">
                                        <span
                                            class="text-[10px] uppercase font-bold tracking-wider {aInfo.color}"
                                            >{activity.type}</span
                                        >
                                        <span class="text-[10px] text-slate-600"
                                            >{formatTimeAgo(
                                                activity.createdAt,
                                            )}</span
                                        >
                                        {#if activity.status === "completed"}
                                            <span
                                                class="text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-bold"
                                                >Done</span
                                            >
                                        {/if}
                                    </div>
                                    <p
                                        class="text-sm text-slate-200 font-medium leading-snug"
                                    >
                                        {activity.title}
                                    </p>
                                    {#if activity.description}
                                        <p
                                            class="text-xs text-slate-400 mt-1 leading-relaxed line-clamp-2"
                                        >
                                            {activity.description}
                                        </p>
                                    {/if}
                                    {#if activity.dueDate}
                                        <p
                                            class="text-[10px] text-orange-400 mt-1 flex items-center gap-1"
                                        >
                                            <Clock class="w-3 h-3" />
                                            Due: {new Date(
                                                activity.dueDate,
                                            ).toLocaleDateString("en-GB", {
                                                day: "numeric",
                                                month: "short",
                                                year: "numeric",
                                            })}
                                        </p>
                                    {/if}
                                </div>
                            </div>
                        {/each}
                    </div>
                {/if}
            </div>
        </div>

        <!-- CRM Footer Workflow -->
        <div
            class="bg-slate-900 border-t border-slate-800 p-6 z-10 sticky bottom-0"
        >
            <p
                class="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2"
            >
                <CheckCircle2 class="w-4 h-4 text-emerald-500" />
                Manage Pipeline Stage
            </p>
            <div class="grid grid-cols-5 gap-2">
                {#each stages as stage}
                    <button
                        on:click={() => updateStage(stage)}
                        class="py-2.5 px-2 rounded-xl text-xs font-semibold transition-all duration-200 border {opportunity.workflowStage ===
                        stage
                            ? 'bg-blue-600/20 border-blue-500 text-blue-400 scale-105'
                            : 'bg-slate-800 border-slate-700/60 text-slate-400 hover:bg-slate-700 hover:text-slate-200'}"
                    >
                        {stage}
                    </button>
                {/each}
            </div>
        </div>
    {/if}
</div>
