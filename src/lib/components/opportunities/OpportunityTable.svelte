<script lang="ts">
    import { createEventDispatcher } from "svelte";
    import type { Opportunity } from "$lib/modules/harvesters/types";
    import Badge from "../ui/Badge.svelte";
    import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-svelte";

    export let data: Opportunity[] = [];
    export let activeId: string | null = null;

    const dispatch = createEventDispatcher();

    // Sorting state
    let sortColumn: keyof Opportunity | "" = "";
    let sortDirection: "asc" | "desc" = "asc";

    function handleSort(column: keyof Opportunity) {
        if (sortColumn === column) {
            sortDirection = sortDirection === "asc" ? "desc" : "asc";
        } else {
            sortColumn = column;
            sortDirection = "asc";
        }
    }

    $: sortedData = [...data].sort((a, b) => {
        if (!sortColumn) return 0;

        let valA = a[sortColumn];
        let valB = b[sortColumn];

        // Handle undefined or null values
        if (valA == null) valA = "";
        if (valB == null) valB = "";

        // Value comparisons
        if (valA < valB) return sortDirection === "asc" ? -1 : 1;
        if (valA > valB) return sortDirection === "asc" ? 1 : -1;
        return 0;
    });

    // Formatting helpers
    const formatDate = (dateValue: any) => {
        if (!dateValue) return "TBD";
        return new Date(dateValue).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
        });
    };

    const formatCurrency = (
        val: number | undefined,
        currency: string | undefined,
    ) => {
        if (val === undefined) return "TBD";
        return new Intl.NumberFormat("en-US", {
            style: "currency",
            currency: currency || "USD",
            maximumSignificantDigits: 3,
        }).format(val);
    };
    // Derive source from sourceUrl since DB IDs are auto-generated UUIDs
    const getSource = (row: any): { label: string; color: string } => {
        const url = (row.sourceUrl || "").toLowerCase();
        if (url.includes("ted.europa.eu"))
            return { label: "🇪🇺 TED", color: "text-blue-400" };
        if (url.includes("contractsfinder"))
            return { label: "🇬🇧 UK CF", color: "text-red-400" };
        if (url.includes("nspa") || url.includes("nato"))
            return { label: "🌐 NATO", color: "text-cyan-400" };
        if (url.includes("sam.gov"))
            return { label: "🇺🇸 SAM", color: "text-indigo-400" };
        if (url.includes("tenders.gov.au"))
            return { label: "🇦🇺 AusTender", color: "text-yellow-400" };
        if (url.includes("canadabuys") || url.includes("canada.ca"))
            return { label: "🇨🇦 Canada", color: "text-orange-400" };
        return { label: "—", color: "text-slate-500" };
    };
</script>

<div
    class="bg-slate-900/50 backdrop-blur-sm border border-slate-800/60 rounded-2xl overflow-hidden shadow-2xl"
>
    <div class="overflow-x-auto">
        <table class="w-full text-left text-sm whitespace-nowrap">
            <thead
                class="bg-slate-800/80 border-b border-slate-700/60 text-slate-300 font-semibold uppercase tracking-wider text-[11px]"
            >
                <tr>
                    <th
                        class="px-6 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors group"
                        on:click={() => handleSort("title")}
                    >
                        <div class="flex items-center gap-1.5">
                            Title
                            {#if sortColumn === "title"}
                                {#if sortDirection === "asc"}<ArrowUp
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{:else}<ArrowDown
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{/if}
                            {:else}
                                <ArrowUpDown
                                    class="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            {/if}
                        </div>
                    </th>
                    <th class="px-6 py-4">Source</th>
                    <th
                        class="px-6 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors group"
                        on:click={() => handleSort("country")}
                    >
                        <div class="flex items-center gap-1.5">
                            Country
                            {#if sortColumn === "country"}
                                {#if sortDirection === "asc"}<ArrowUp
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{:else}<ArrowDown
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{/if}
                            {:else}
                                <ArrowUpDown
                                    class="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            {/if}
                        </div>
                    </th>
                    <th
                        class="px-6 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors group"
                        on:click={() => handleSort("domain")}
                    >
                        <div class="flex items-center gap-1.5">
                            Domain
                            {#if sortColumn === "domain"}
                                {#if sortDirection === "asc"}<ArrowUp
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{:else}<ArrowDown
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{/if}
                            {:else}
                                <ArrowUpDown
                                    class="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            {/if}
                        </div>
                    </th>
                    <th class="px-6 py-4">Notice Type</th>
                    <th
                        class="px-6 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors group"
                        on:click={() => handleSort("deadlineAt")}
                    >
                        <div class="flex items-center gap-1.5">
                            Due Date
                            {#if sortColumn === "deadlineAt"}
                                {#if sortDirection === "asc"}<ArrowUp
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{:else}<ArrowDown
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{/if}
                            {:else}
                                <ArrowUpDown
                                    class="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            {/if}
                        </div>
                    </th>
                    <th
                        class="px-6 py-4 cursor-pointer hover:bg-slate-700/50 transition-colors group text-right"
                        on:click={() => handleSort("valueExt")}
                    >
                        <div class="flex items-center justify-end gap-1.5">
                            Est. Value
                            {#if sortColumn === "valueExt"}
                                {#if sortDirection === "asc"}<ArrowUp
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{:else}<ArrowDown
                                        class="w-3.5 h-3.5 text-blue-400"
                                    />{/if}
                            {:else}
                                <ArrowUpDown
                                    class="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity"
                                />
                            {/if}
                        </div>
                    </th>
                </tr>
            </thead>
            <tbody class="text-slate-200 divide-y divide-slate-800/60">
                {#each sortedData as row}
                    <tr
                        class="hover:bg-slate-800/40 transition-colors group cursor-pointer {activeId ===
                        row.id
                            ? 'bg-blue-900/20 border-l-2 border-blue-500'
                            : ''}"
                        on:click={() => dispatch("select", row)}
                    >
                        <td
                            class="px-6 py-4 max-w-xs truncate font-medium group-hover:text-blue-400 transition-colors"
                            title={row.title}
                        >
                            {row.title}
                        </td>
                        <td class="px-6 py-4">
                            <span
                                class="{getSource(row)
                                    .color} text-xs font-semibold whitespace-nowrap"
                                >{getSource(row).label}</span
                            >
                        </td>
                        <td class="px-6 py-4 flex items-center gap-3">
                            {#if row.country}
                                <img
                                    src={`https://flagcdn.com/w20/${row.country.toLowerCase()}.png`}
                                    srcset={`https://flagcdn.com/w40/${row.country.toLowerCase()}.png 2x`}
                                    width="20"
                                    alt={row.country}
                                    class="rounded shadow-sm object-cover h-auto"
                                />
                                <span
                                    class="text-slate-300 font-medium uppercase text-xs"
                                    >{row.country}</span
                                >
                            {:else}
                                <span class="text-slate-500">Global</span>
                            {/if}
                        </td>
                        <td class="px-6 py-4">
                            <Badge variant={row.domain || "multi"}>
                                <span
                                    class="capitalize text-[10px] uppercase tracking-wider"
                                    >{row.domain || "Multi"}</span
                                >
                            </Badge>
                        </td>
                        <td class="px-6 py-4 text-slate-400">
                            {row.noticeType}
                        </td>
                        <td class="px-6 py-4 text-slate-300">
                            {formatDate(row.deadlineAt)}
                        </td>
                        <td
                            class="px-6 py-4 text-right font-medium text-slate-300 group-hover:text-white transition-colors"
                        >
                            {formatCurrency(row.valueExt, row.valueCurrency)}
                        </td>
                    </tr>
                {/each}
            </tbody>
        </table>
    </div>
</div>
