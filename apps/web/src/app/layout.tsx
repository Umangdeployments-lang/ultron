import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/sidebar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "ultron — AI-Native Operating System for Business",
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
            <body className={`${inter.className} min-h-screen bg-background text-foreground antialiased`}>
                <div className="flex min-h-screen">
                    <Sidebar />
                    <main className="relative flex-1 overflow-hidden">
                        {/* Ambient glow background */}
                        <div className="pointer-events-none fixed inset-0 z-0">
                            <div className="absolute -top-40 -left-40 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
                            <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full bg-cyan-500/10 blur-3xl" />
                            <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-violet-500/10 blur-3xl" />
                        </div>
                        <div className="relative z-10">{children}</div>
                    </main>
                </div>
            </body>
        </html>
    );
}
