<script lang="ts">
    export let variant: string = "default";
    // Base styling for all badges
    const baseClasses =
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ring-1 ring-inset backdrop-blur-sm transition-colors";

    // Compute color scheme based on variant
    $: colorClasses = (() => {
        switch (variant?.toLowerCase()) {
            case "air":
                return "bg-sky-500/10 text-sky-400 ring-sky-500/20";
            case "sea":
                return "bg-blue-500/10 text-blue-400 ring-blue-500/20";
            case "land":
                return "bg-emerald-500/10 text-emerald-400 ring-emerald-500/20";
            case "cyber":
                return "bg-fuchsia-500/10 text-fuchsia-400 ring-fuchsia-500/20";
            case "space":
                return "bg-indigo-500/10 text-indigo-400 ring-indigo-500/20";
            case "multi":
                return "bg-slate-500/10 text-slate-300 ring-slate-500/20 relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent before:-translate-x-full hover:before:animate-[shimmer_1.5s_infinite]";
            case "tender":
                return "bg-orange-500/10 text-orange-400 ring-orange-500/20";
            case "request for information (rfi)": // mapped from RFI in props if needed
            case "rfi":
                return "bg-yellow-500/10 text-yellow-500 ring-yellow-500/20";
            case "request for proposal (rfp)":
            case "rfp":
                return "bg-amber-500/10 text-amber-500 ring-amber-500/20";
            case "contract award":
            case "award":
                return "bg-green-500/10 text-green-400 ring-green-500/20";
            case "new":
                return "bg-teal-500/10 text-teal-400 ring-teal-500/20";
            case "closed":
                return "bg-red-500/10 text-red-400 ring-red-500/20";
            default:
                return "bg-slate-800 text-slate-300 ring-slate-700"; // Fallback
        }
    })();
</script>

<span class="{baseClasses} {colorClasses}">
    <slot />
</span>
