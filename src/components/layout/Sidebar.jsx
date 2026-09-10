"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
    LayoutDashboard,
    CheckSquare,
    Calendar,
    User,
    LogOut,
    ChevronLeft,
    ChevronRight,
    Sun,
    Moon,
    Bell
} from "lucide-react";
import { subscribeNotifications } from "@/services/notificationService";

export default function Sidebar({ isDarkMode: externalDarkMode, toggleDarkMode: externalToggleDarkMode }) {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, userData, user } = useAuth();

    // State Buka/Tutup Sidebar (Desktop)
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Fallback state jika prop tidak diberikan
    const [localDarkMode, setLocalDarkMode] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    const isDarkMode = externalDarkMode !== undefined ? externalDarkMode : localDarkMode;
    const toggleDarkMode = externalToggleDarkMode || (() => {
        setLocalDarkMode(!localDarkMode);
        document.documentElement.classList.toggle("dark");
    });

    useEffect(() => {
        const uid = user?.uid || userData?.id_user;
        if (uid) {
            const unsubscribe = subscribeNotifications(uid, (notifs) => {
                const unread = (notifs || []).filter(n => !n.read).length;
                setUnreadCount(unread);
            });
            return () => unsubscribe();
        }
    }, [user, userData]);

    const navItems = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Tasks", href: "/tasks", icon: CheckSquare },
        { label: "Calendar", href: "/calendar", icon: Calendar },
        { label: "Profile", href: "/profile", icon: User },
        { label: "Notification", href: "/notifications", icon: Bell }
    ];

    const handleLogout = async () => {
        await logout();
        router.push("/login");
    };

    return (
        <>
            {/* Desktop Sidebar */}
            <aside
                className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 p-4 shrink-0 transition-all duration-300 relative z-40 ${isCollapsed ? "w-20" : "w-64"
                    }`}
            >
                {/* Tombol Toggle Buka/Tutup (Collapse) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 p-1 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                    title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                {/* Logo Section */}
                <div className={`flex items-center gap-3 mb-6 px-2 overflow-hidden ${isCollapsed ? "justify-center" : ""}`}>
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0 shadow-sm">
                        M
                    </div>
                    {!isCollapsed && (
                        <span className="text-xl font-bold text-indigo-600 dark:text-indigo-400 whitespace-nowrap transition-opacity duration-300">
                            MyTask
                        </span>
                    )}
                </div>

                {/* User Info Box */}
                {userData && (
                    <div className={`bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl mb-6 border border-slate-100 dark:border-slate-800 transition-all ${isCollapsed ? "flex justify-center p-2" : ""
                        }`}>
                        {isCollapsed ? (
                            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300 font-bold flex items-center justify-center text-xs">
                                {userData.name ? userData.name.charAt(0).toUpperCase() : "U"}
                            </div>
                        ) : (
                            <div className="overflow-hidden">
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">{userData.name}</p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{userData.id_user || userData.email}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Navigation Items */}
                <nav className="flex-1 space-y-1.5">
                    {navItems.map((item) => {
                        const Icon = item.icon;
                        const isActive = pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                title={isCollapsed ? item.label : ""}
                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${isCollapsed ? "justify-center" : ""
                                    } ${isActive
                                        ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 font-semibold"
                                        : "text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-100"
                                    }`}
                            >
                                <div className="relative shrink-0">
                                    <Icon className={`w-5 h-5 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                                    {isCollapsed && item.label === "Notification" && unreadCount > 0 && (
                                        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 border border-white dark:border-slate-900" />
                                    )}
                                </div>
                                {!isCollapsed && (
                                    <span className="whitespace-nowrap transition-opacity duration-300 flex-1 flex items-center justify-between">
                                        {item.label}
                                        {item.label === "Notification" && unreadCount > 0 && (
                                            <span className="ml-1 inline-flex items-center justify-center px-2 py-0.5 rounded-full bg-red-600 text-xs font-medium text-white">
                                                {unreadCount}
                                            </span>
                                        )}
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                {/* Bottom Actions: Theme Toggle & Logout */}
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 space-y-1.5">
                    {/* Toggle Mode Siang / Malam with Animation */}
                    <button
                        onClick={toggleDarkMode}
                        title={isCollapsed ? (isDarkMode ? "Mode Siang" : "Mode Malam") : ""}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all w-full active:scale-95 ${isCollapsed ? "justify-center" : ""
                            }`}
                    >
                        <AnimatePresence mode="wait">
                            {isDarkMode ? (
                                <motion.div
                                    key="sun-sidebar"
                                    initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                                    exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="shrink-0"
                                >
                                    <Sun className="w-5 h-5 text-amber-500" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="moon-sidebar"
                                    initial={{ rotate: -90, scale: 0.5, opacity: 0 }}
                                    animate={{ rotate: 0, scale: 1, opacity: 1 }}
                                    exit={{ rotate: 90, scale: 0.5, opacity: 0 }}
                                    transition={{ duration: 0.25 }}
                                    className="shrink-0"
                                >
                                    <Moon className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                        {!isCollapsed && (
                            <span className="whitespace-nowrap flex-1 text-left">
                                {isDarkMode ? "Mode Siang" : "Mode Malam"}
                            </span>
                        )}
                    </button>

                    {/* Tombol Logout */}
                    <button
                        onClick={handleLogout}
                        title={isCollapsed ? "Keluar" : ""}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 w-full transition-all ${isCollapsed ? "justify-center" : ""
                            }`}
                    >
                        <LogOut className="w-5 h-5 shrink-0" />
                        {!isCollapsed && <span className="whitespace-nowrap">Keluar</span>}
                    </button>
                </div>
            </aside>

            {/* Mobile Bottom Navigation */}
            <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 z-50 px-2 py-2 flex justify-around items-center">
                {navItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = pathname === item.href;
                    return (
                        <Link
                            key={item.href}
                            href={item.href}
                            className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-lg transition-colors ${isActive
                                    ? "text-indigo-600 dark:text-indigo-400 font-bold"
                                    : "text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            <div className="relative">
                                <Icon className="w-5 h-5" />
                                {item.label === "Notification" && unreadCount > 0 && (
                                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-red-600 border border-white dark:border-slate-900" />
                                )}
                            </div>
                            {item.label}
                        </Link>
                    );
                })}
            </div>
        </>
    );
}