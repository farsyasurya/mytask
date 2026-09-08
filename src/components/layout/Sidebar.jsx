"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
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
    Bell,
    Search
} from "lucide-react";
import { subscribeNotifications } from "@/services/notificationService";

export default function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();
    const { logout, userData, user } = useAuth();

    // State Buka/Tutup Sidebar (Desktop)
    const [isCollapsed, setIsCollapsed] = useState(false);

    // State Dark Mode
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [unreadCount, setUnreadCount] = useState(0);

    // State User Dropdown
    const [isUserDropdownOpen, setIsUserDropdownOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Cek tema & notification count
    useEffect(() => {
        if (document.documentElement.classList.contains("dark")) {
            setIsDarkMode(true);
        }

        const uid = user?.uid || userData?.id_user;
        if (uid) {
            const unsubscribe = subscribeNotifications(uid, (notifs) => {
                const unread = notifs.filter((n) => !n.read).length;
                setUnreadCount(unread);
            });
            return () => unsubscribe();
        }
    }, [user, userData]);

    // Close dropdown saat klik di luar area profil
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsUserDropdownOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleDarkMode = () => {
        setIsDarkMode(!isDarkMode);
        document.documentElement.classList.toggle("dark");
    };

    const navItems = [
        { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
        { label: "Tasks", href: "/tasks", icon: CheckSquare },
        { label: "Calendar", href: "/calendar", icon: Calendar },
        { label: "Profile", href: "/profile", icon: User },
        { label: "Notification", href: "/notifications", icon: Bell }
    ];

    const handleLogout = async () => {
        setIsUserDropdownOpen(false);
        await logout();
        router.push("/login");
    };

    return (
        <>
            {/* TOP HEADER (Absolute/Fixed di bagian atas layar) */}
            <header className="fixed top-0 left-0 right-0 h-16 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 z-30 flex items-center justify-between px-4 md:px-6 transition-all">
                {/* Space penyeimbang di desktop agar tidak tertutup logo sidebar */}
                <div className={`hidden md:block transition-all duration-300 ${isCollapsed ? "w-16" : "w-56"}`} />

                {/* Mobile Logo */}
                <div className="flex items-center gap-2 md:hidden">
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-bold text-base">
                        M
                    </div>
                    <span className="font-bold text-indigo-600 dark:text-indigo-400 text-lg">MyTask</span>
                </div>

                {/* Search Bar Input */}
                <div className="relative w-40 sm:w-64 md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari sesuatu..."
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 placeholder-slate-400 rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                    />
                </div>

                {/* Top Header Controls (Mode, Bell, & Avatar Logout Dropdown) */}
                <div className="flex items-center gap-1 sm:gap-2">
                    {/* Toggle Mode Siang/Malam */}
                    <button
                        onClick={toggleDarkMode}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title={isDarkMode ? "Mode Siang" : "Mode Malam"}
                    >
                        {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
                    </button>

                    {/* Lonceng Notifikasi */}
                    <Link
                        href="/notifications"
                        className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        title="Notifikasi"
                    >
                        <Bell className="w-5 h-5" />
                        {unreadCount > 0 && (
                            <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[10px] font-bold text-white">
                                {unreadCount > 9 ? "9+" : unreadCount}
                            </span>
                        )}
                    </Link>

                    {/* User Profile Avatar & Absolute Dropdown Logout */}
                    <div className="relative ml-1" ref={dropdownRef}>
                        <button
                            onClick={() => setIsUserDropdownOpen(!isUserDropdownOpen)}
                            className="flex items-center gap-2 p-1 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        >
                            <div className="w-8 h-8 rounded-full bg-indigo-600 text-white font-bold flex items-center justify-center text-xs shadow-sm">
                                {userData?.name ? userData.name.charAt(0).toUpperCase() : "U"}
                            </div>
                        </button>

                        {/* Absolute Dropdown Popup */}
                        {isUserDropdownOpen && (
                            <div className="absolute right-0 mt-2 w-52 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xl py-2 z-50">
                                {userData && (
                                    <div className="px-4 py-2 border-b border-slate-100 dark:border-slate-800">
                                        <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                                            {userData.name}
                                        </p>
                                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                            {userData.id_user || userData.email}
                                        </p>
                                    </div>
                                )}

                                <Link
                                    href="/profile"
                                    onClick={() => setIsUserDropdownOpen(false)}
                                    className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <User className="w-4 h-4" />
                                    Profil Saya
                                </Link>

                                <button
                                    onClick={handleLogout}
                                    className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                                >
                                    <LogOut className="w-4 h-4" />
                                    Keluar (Logout)
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            {/* Desktop Sidebar */}
            <aside
                className={`hidden md:flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 h-screen sticky top-0 p-4 shrink-0 transition-all duration-300 relative z-40 ${isCollapsed ? "w-20" : "w-64"
                    }`}
            >
                {/* Tombol Toggle Buka/Tutup (Collapse) */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className="absolute -right-3 top-7 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 p-1 rounded-full shadow-md hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors z-50"
                    title={isCollapsed ? "Buka Sidebar" : "Tutup Sidebar"}
                >
                    {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>

                {/* Logo Section */}
                <div className={`flex items-center gap-3 mb-6 px-2 overflow-hidden ${isCollapsed ? "justify-center" : ""}`}>
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-lg shrink-0">
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
                    <div
                        className={`bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl mb-6 border border-slate-100 dark:border-slate-800 transition-all ${isCollapsed ? "flex justify-center p-2" : ""
                            }`}
                    >
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
                                <Icon className={`w-5 h-5 shrink-0 ${isActive ? "text-indigo-600 dark:text-indigo-400" : ""}`} />
                                {!isCollapsed && (
                                    <span className="whitespace-nowrap transition-opacity duration-300">
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
                    <button
                        onClick={toggleDarkMode}
                        title={isCollapsed ? (isDarkMode ? "Mode Siang" : "Mode Malam") : ""}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all w-full ${isCollapsed ? "justify-center" : ""
                            }`}
                    >
                        {isDarkMode ? <Sun className="w-5 h-5 text-amber-500 shrink-0" /> : <Moon className="w-5 h-5 shrink-0" />}
                        {!isCollapsed && <span className="whitespace-nowrap">{isDarkMode ? "Mode Siang" : "Mode Malam"}</span>}
                    </button>

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
                            className={`flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 rounded-lg transition-colors ${isActive ? "text-indigo-600 dark:text-indigo-400 font-bold" : "text-slate-500 dark:text-slate-400"
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
                <button
                    onClick={toggleDarkMode}
                    className="flex flex-col items-center gap-1 text-[10px] font-medium py-1 px-3 text-slate-500 dark:text-slate-400"
                >
                    {isDarkMode ? <Sun className="w-5 h-5 text-amber-500" /> : <Moon className="w-5 h-5" />}
                    Tema
                </button>
            </div>
        </>
    );
}