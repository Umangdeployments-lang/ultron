"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
    Workflow,
    Activity,
    ShieldCheck,
    KeyRound,
    Zap,
} from "lucide-react";
import { clsx } from "clsx";

const navItems = [
    { href: "/", label: "Dashboard", icon: Zap },
    { href: "/workflows", label: "Workflows", icon: Workflow },
    { href: "/executions", label: "Executions", icon: Activity },
    { href: "/approvals", label: "Approvals", icon: ShieldCheck },
    { href: "/keys", label: "API Keys", icon: KeyRound },
];

export function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="fixed left-0 top-0 z-20 flex h-screen w-60 flex-col border-r border-white/10 bg-black/20 backdrop-blur-xl">
            <div className="flex items-center gap-2 px-5 py-5">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-violet-600 text-sm font-bold text-white">
                    O
                </div>
                <div>
                    <div className="text-sm font-semibold tracking-tight">
                        ultron
                    </div>
                    <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        AI OS for Business
                    </div>
                </div>
            </div>

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
                            className={clsx(
                                "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                                active
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                            )}
                        >
                            <Icon className="h-4 w-4" />
                            {item.label}
                        </Link>
                    );
                })}
            </nav>

            <div className="border-t border-white/10 p-4">
                <div className="glass-card p-3">
                    <div className="text-xs font-medium">Free Plan</div>
                    <div className="mt-1 text-[10px] text-muted-foreground">
                        10 runs / month
                    </div>
                    <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-1/3 rounded-full bg-primary" />
                    </div>
                </div>
            </div>
        </aside>
    );
}
