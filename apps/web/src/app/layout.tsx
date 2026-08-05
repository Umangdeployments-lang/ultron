import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
    title: "Ultron — AI-Native Operating System for Business",
    description:
        "Build AI-powered automations with a visual canvas. Webhook → AI → Action in minutes.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className="dark">
            <body className="min-h-screen bg-background text-foreground antialiased">
                <div className="flex min-h-screen">
                    <Sidebar />
                    <main className="relative flex-1 overflow-hidden md:pl-60">
                        {/* Ambient glow background */}
                        <div className="pointer-events-none fixed inset-0 z-0">
                            <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/15 blur-3xl" />
                            <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
                            <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-emerald-500/10 blur-3xl" />
                            <div className="absolute top-20 left-1/2 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl" />
                        </div>
                        <div className="relative z-10">{children}</div>
                    </main>
                </div>
            </body>
        </html>
    );
}