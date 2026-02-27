<script lang="ts">
    import { page } from "$app/state";
    import {
        LayoutDashboard,
        Target,
        CalendarDays,
        Users,
        Settings,
        Activity,
        Briefcase,
    } from "lucide-svelte";

    const menuItems = [
        { name: "Opportunities", href: "/", icon: Target },
        { name: "Pipeline", href: "/pipeline", icon: Briefcase },
        { name: "Events", href: "/events", icon: CalendarDays },
        { name: "Intel Agents", href: "/agents", icon: Activity },
    ];
</script>

<aside
    class="w-64 h-full bg-slate-800/80 backdrop-blur-xl border-r border-slate-700/60 flex flex-col transition-all duration-300 relative z-20"
>
    <div
        class="min-h-[120px] flex items-center px-4 border-b border-slate-700/60 bg-white/5 py-4 shadow-sm"
    >
        <div class="flex items-center gap-4">
            <div
                class="w-[100px] h-[100px] flex items-center justify-center shrink-0"
            >
                <img
                    src="/gdip_icon_256.png"
                    alt="GDIP Logo"
                    class="w-full h-full object-contain drop-shadow-md brightness-110"
                />
            </div>
            <div class="flex flex-col">
                <span
                    class="font-bold text-xl text-slate-50 tracking-tight leading-none mb-1 font-sans"
                    >GDIP</span
                >
                <span
                    class="text-[10px] text-blue-300 font-semibold tracking-wider uppercase leading-snug max-w-[120px]"
                    >Global Defence Insight Platform</span
                >
            </div>
        </div>
    </div>

    <div class="flex-1 overflow-y-auto py-6 px-4 no-scrollbar">
        <p
            class="px-3 text-xs font-semibold text-slate-500 uppercase tracking-widest mb-4"
        >
            Architecture
        </p>

        <nav class="space-y-1.5 pt-1">
            {#each menuItems as item}
                {@const isActive = page?.url?.pathname === item.href}
                <a
                    href={item.href}
                    class="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all duration-200 group relative
                      {isActive
                        ? 'bg-blue-600/10 text-blue-400'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'}"
                >
                    {#if isActive}
                        <div
                            class="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-blue-500 rounded-r-full"
                        ></div>
                    {/if}
                    <svelte:component
                        this={item.icon}
                        class="w-5 h-5 transition-transform duration-200 group-hover:scale-110 {isActive
                            ? 'text-blue-500'
                            : ''}"
                        strokeWidth={isActive ? 2.5 : 2}
                    />
                    <span class="text-sm font-medium">{item.name}</span>
                </a>
            {/each}
        </nav>
    </div>

    <div class="p-4 border-t border-slate-800/60 mt-auto">
        <div
            class="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-800/50 transition-colors cursor-pointer group"
        >
            <div
                class="w-8 h-8 rounded-full bg-slate-700 flex items-center justify-center overflow-hidden border border-slate-600 group-hover:border-slate-500 transition-colors"
            >
                <span class="text-slate-300 text-xs font-medium">SM</span>
            </div>
            <div class="flex flex-col flex-1 overflow-hidden">
                <span class="text-sm font-medium text-slate-200 truncate"
                    >Stu Morris</span
                >
                <span class="text-xs text-slate-500 truncate">System Admin</span
                >
            </div>
        </div>
    </div>
</aside>

<style>
    /* Hide scrollbar for Chrome, Safari and Opera */
    .no-scrollbar::-webkit-scrollbar {
        display: none;
    }
    /* Hide scrollbar for IE, Edge and Firefox */
    .no-scrollbar {
        -ms-overflow-style: none; /* IE and Edge */
        scrollbar-width: none; /* Firefox */
    }
</style>
