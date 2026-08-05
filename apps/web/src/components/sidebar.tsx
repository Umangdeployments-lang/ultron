"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    LayoutDashboard,
    Workflow,
    Activity,
    ShieldCheck,
    KeyRound,
    Sparkles,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
    { href: "/", label: "Dashboard", icon: LayoutDashboard },
    { href: "/workflows", label: "Workflows", icon: Workflow },
    { href: "/executions", label: "Executions", icon: Activity },
    { href: "/approvals", label: "Approvals", icon: ShieldCheck },
    { href: "/keys", label: "API Keys", icon: KeyRound },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col border-r border-white/10 bg-black/30 backdrop-blur-xl">
            {/* Brand */}
            <div className="flex items-center gap-3 px-5 py-6">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-primary via-cyan-500 to-violet-600 shadow-lg shadow-primary/25">
                    <Sparkles className="h-4 w-4 text-white" />
                </div>
                <div>
                    <div className="font-display text-base font-bold leading-tight tracking-tight">
                        ultron
                    </div>
                    <div className="text-[10px] font-medium uppercase tracking-widest text-muted-foreground">
                        AI OS for Business
                    </div>
                </div>
            </div>

            {/* Nav */}
            <nav className="mt-2 flex-1 space-y-1 px-3">
                {navItems.map((item) => {
                    const active =
                        item.href === "/"
                            ? pathname === "/"
                            : pathname.startsWith(item.href);
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            aria-current={active ? "page" : undefined}
                            className={clsx(
                                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary active:scale-[0.98]",
                                active
                                    ? "bg-primary/15 text-primary shadow-inner shadow-primary/5"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            <Icon
                                className={clsx(
                                    "h-4 w-4 transition-transform duration-150 group-hover:scale-110",
                                    active && "text-primary"
                                )}
                            />
                            {item.label}
                            {active && (
                                <span className="ml-auto h-1.5 w-1.5 rounded-full bg-primary" />
                            )}
                        </Link>
                    );
                })}
            </nav>

            {/* Plan card */}
            <div className="border-t border-white/10 p-4">
                <div className="card p-3.5">
                    <div className="flex items-center justify-between">
                        <div className="text-xs font-semibold">Free Plan</div>
                        <span className="badge status-running !px-2 !py-0.5 text-[10px]">
                            10 runs / mo
                        </span>
                    </div>
                    <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary to-emerald-500 transition-all duration-500" />
                    </div>
                    <button className="btn-secondary mt-3 w-full !py-1.5 text-xs">
                        Upgrade
                    </button>
                </div>
            </div>
        </aside>
    );
}