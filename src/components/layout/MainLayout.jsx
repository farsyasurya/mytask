"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import Sidebar from "@/components/layout/Sidebar";
import TopNav from "@/components/layout/TopNav";

export default function MainLayout({ children }) {
    const { user, loading } = useAuth();
    const router = useRouter();

    // Shared Dark Mode State across MainLayout, TopNav & Sidebar
    const [isDarkMode, setIsDarkMode] = useState(false);

    useEffect(() => {
        if (typeof window !== "undefined") {
            const savedTheme = localStorage.getItem("theme");
            const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
            const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
            
            setIsDarkMode(shouldBeDark);
            if (shouldBeDark) {
                document.documentElement.classList.add("dark");
            } else {
                document.documentElement.classList.remove("dark");
            }
        }
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode((prev) => {
            const nextMode = !prev;
            if (nextMode) {
                document.documentElement.classList.add("dark");
                localStorage.setItem("theme", "dark");
            } else {
                document.documentElement.classList.remove("dark");
                localStorage.setItem("theme", "light");
            }
            return nextMode;
        });
    };

    // Redirect user ke login jika belum diautentikasi
    useEffect(() => {
        if (!loading && !user) {
            router.push("/login");
        }
    }, [user, loading, router]);

    // Loading Skeleton Layar Penuh
    if (loading || (!user && typeof window !== "undefined")) {
        return (
            <div className="flex h-screen w-full items-center justify-center bg-slate-50 dark:bg-slate-950">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                    <p className="text-xs text-slate-500 font-medium">Memuat MyTask...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">
            {/* Left Sidebar for Desktop & Bottom Nav for Mobile */}
            <Sidebar isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />

            {/* Main Content Area with TopNav */}
            <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
                <TopNav isDarkMode={isDarkMode} toggleDarkMode={toggleDarkMode} />
                <main className="flex-1 p-4 sm:p-6 md:p-8 w-full min-w-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
