<script lang="ts">
    import type { Opportunity } from "$lib/modules/harvesters/types";
    import Badge from "../ui/Badge.svelte";
    import {
        Calendar,
        Globe2,
        Building2,
        ArrowRight,
        DollarSign,
    } from "lucide-svelte";

    export let data: Opportunity;

    // Format the dates
    $: publishDate = new Date(data.publishedAt || "").toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "short", year: "numeric" },
    );
    $: deadlineDate = new Date(data.deadlineAt || "").toLocaleDateString(
        "en-GB",
        { day: "numeric", month: "short", year: "numeric" },
    );

    // Format Currency
    $: formattedValue = data.valueExt
        ? new Intl.NumberFormat("en-US", {
              style: "currency",
              currency: data.valueCurrency || "USD",
              maximumSignificantDigits: 3,
          }).format(data.valueExt)
        : "TBD";
</script>

<div
    class="group relative flex flex-col bg-slate-900/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl p-5 hover:bg-slate-800/60 transition-all duration-300 overflow-hidden cursor-pointer"
>
    <!-- Subtle gradient hover glow effect -->
    <div
        class="absolute -inset-px bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 rounded-2xl opacity-0 group-hover:opacity-20 transition-opacity duration-500 blur-sm pointer-events-none"
    ></div>

    <!-- Header Section (Badges) -->
    <div class="flex justify-between items-start mb-4 relative z-10">
        <div class="flex flex-wrap gap-2">
            <!-- Domain Badge -->
            <Badge variant={data.domain || "multi"}>
                <span class="capitalize">{data.domain || "Multi-Domain"}</span>
            </Badge>

            <!-- Notice Type Badge -->
            <Badge variant={data.noticeType}>
                {data.noticeType}
            </Badge>
        </div>

        <!-- Stage / Urgency Indicator -->
        <Badge variant={data.workflowStage}>
            {data.workflowStage}
        </Badge>
    </div>

    <!-- Title & Description -->
    <div class="mb-5 relative z-10 flex-1">
        <h3
            class="text-lg font-semibold text-slate-100 mb-2 leading-tight group-hover:text-blue-400 transition-colors line-clamp-2"
        >
            {data.title}
        </h3>
        <p class="text-sm text-slate-400 line-clamp-3 leading-relaxed">
            {data.description}
        </p>
    </div>

    <!-- Meta Information -->
    <div class="space-y-3 mb-5 relative z-10">
        <div class="flex items-center gap-2 text-xs text-slate-300">
            <Building2 class="w-4 h-4 text-slate-500" />
            <span class="truncate">{data.organisation || "Unknown Agency"}</span
            >
        </div>
        <div class="flex items-center gap-2 text-xs text-slate-300">
            <Globe2 class="w-4 h-4 text-slate-500" />
            <span class="truncate">{data.country || "Global"}</span>
        </div>
        <div class="flex justify-between items-center text-xs">
            <div class="flex items-center gap-2 text-slate-300">
                <Calendar class="w-4 h-4 text-slate-500" />
                <span
                    >Closes: <span class="text-slate-200 font-medium"
                        >{deadlineDate}</span
                    ></span
                >
            </div>
            <div class="flex items-center gap-1.5 text-slate-300 font-medium">
                <span class="text-blue-400">{formattedValue}</span>
            </div>
        </div>
    </div>

    <!-- Action Footer -->
    <div
        class="pt-4 border-t border-slate-800/60 flex items-center justify-between relative z-10 mt-auto"
    >
        <div class="flex gap-1.5 overflow-hidden w-2/3">
            {#each data.keywords.slice(0, 3) as keyword}
                <span
                    class="text-[10px] uppercase font-semibold tracking-wider text-slate-500 bg-slate-800/50 px-2 py-1 rounded"
                >
                    {keyword}
                </span>
            {/each}
        </div>

        <button
            class="flex items-center gap-1.5 text-sm font-medium text-blue-400 group-hover:text-blue-300 transition-colors"
        >
            View
            <ArrowRight
                class="w-4 h-4 transition-transform group-hover:translate-x-1"
            />
        </button>
    </div>
</div>
