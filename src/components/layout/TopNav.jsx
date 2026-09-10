"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Bell,
    Sun,
    Moon,
    LogOut,
    User,
    ChevronDown,
    Clock,
    X,
    ExternalLink
} from "lucide-react";
import { subscribeNotifications, markAsRead } from "@/services/notificationService";

export default function TopNav({ isDarkMode, toggleDarkMode }) {
    const router = useRouter();
    const { user, userData, logout } = useAuth();

    // Dropdown states
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");

    // Notification state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Click outside refs
    const profileRef = useRef(null);
    const notifRef = useRef(null);

    // Realtime notification listener
    useEffect(() => {
        const uid = user?.uid || userData?.id_user;
        if (uid) {
            const unsubscribe = subscribeNotifications(uid, (notifs) => {
                setNotifications(notifs || []);
                const unread = (notifs || []).filter((n) => !n.read).length;
                setUnreadCount(unread);
            });
            return () => unsubscribe();
        }
    }, [user, userData]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setIsProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setIsNotifOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
            setSearchQuery("");
        }
    };

    const handleNotificationClick = async (notif) => {
        if (!notif.read) {
            await markAsRead(notif.id);
        }
        setIsNotifOpen(false);
        if (notif.taskId) {
            router.push(`/tasks?id=${notif.taskId}`);
        } else {
            router.push("/notifications");
        }
    };

    const handleLogout = async () => {
        setIsProfileOpen(false);
        await logout();
        router.push("/login");
    };

    const userInitial = userData?.name ? userData.name.charAt(0).toUpperCase() : "U";

    return (
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors duration-200">
            <div className="flex items-center justify-between gap-4">
                
                {/* Search Bar */}
                <form onSubmit={handleSearchSubmit} className="relative flex-1 max-w-md">
                    <div className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari tugas..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl border border-transparent focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all duration-200"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => setSearchQuery("")}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>
                </form>

                {/* Right Action Menu: Theme Toggle Quick Button, Notifications & Profile */}
                <div className="flex items-center gap-2 sm:gap-3">

                    {/* Quick Day / Night Mode Animated Toggle Button */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={toggleDarkMode}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none overflow-hidden relative"
                        title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
                    >
                        <AnimatePresence mode="wait">
                            {isDarkMode ? (
                                <motion.div
                                    key="sun"
                                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <Sun className="w-5 h-5 text-amber-500" />
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="moon"
                                    initial={{ y: -20, opacity: 0, rotate: -90 }}
                                    animate={{ y: 0, opacity: 1, rotate: 0 }}
                                    exit={{ y: 20, opacity: 0, rotate: 90 }}
                                    transition={{ duration: 0.25 }}
                                >
                                    <Moon className="w-5 h-5 text-indigo-600" />
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </motion.button>
                    
                    {/* Lonceng / Notification Dropdown */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => {
                                setIsNotifOpen(!isNotifOpen);
                                setIsProfileOpen(false);
                            }}
                            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                            title="Notifikasi"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-in zoom-in-50 duration-200">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Popover */}
                        {isNotifOpen && (
                            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                                            Notifikasi
                                        </h3>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full border border-indigo-100 dark:border-indigo-900">
                                            {unreadCount} Baru
                                        </span>
                                    )}
                                </div>

                                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                                            Belum ada notifikasi
                                        </div>
                                    ) : (
                                        notifications.slice(0, 5).map((notif) => (
                                            <div
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className={`p-3 text-xs cursor-pointer transition-colors flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 ${
                                                    !notif.read ? "bg-indigo-50/30 dark:bg-indigo-950/20" : ""
                                                }`}
                                            >
                                                <div className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                                                    !notif.read
                                                        ? "bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300"
                                                        : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                                }`}>
                                                    <Clock className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-slate-800 dark:text-slate-200 line-clamp-2 ${!notif.read ? "font-semibold" : "font-normal"}`}>
                                                        {notif.pesan || notif.message}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-1 block">
                                                        {notif.createdAt?.seconds
                                                            ? new Date(notif.createdAt.seconds * 1000).toLocaleString("id-ID", {
                                                                  dateStyle: "short",
                                                                  timeStyle: "short"
                                                              })
                                                            : "Baru saja"}
                                                    </span>
                                                </div>
                                                {!notif.read && (
                                                    <span className="w-2 h-2 rounded-full bg-indigo-600 shrink-0 mt-1.5" />
                                                )}
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/30">
                                    <Link
                                        href="/notifications"
                                        onClick={() => setIsNotifOpen(false)}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                                    >
                                        Lihat Semua Notifikasi
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Profile Dropdown */}
                    <div className="relative" ref={profileRef}>
                        <button
                            onClick={() => {
                                setIsProfileOpen(!isProfileOpen);
                                setIsNotifOpen(false);
                            }}
                            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                        >
                            <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                {userInitial}
                            </div>
                            <span className="hidden md:inline-block text-xs font-semibold text-slate-800 dark:text-slate-200 max-w-[120px] truncate">
                                {userData?.name || "User"}
                            </span>
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden md:inline-block" />
                        </button>

                        {/* Profile Dropdown Menu */}
                        {isProfileOpen && (
                            <div className="absolute right-0 mt-2 w-64 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                {/* Header */}
                                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center">
                                            {userInitial}
                                        </div>
                                        <div className="overflow-hidden">
                                            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                                {userData?.name || "User"}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {userData?.email || user?.email || "user@mytask.com"}
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Menu Items */}
                                <div className="p-2 space-y-1 text-xs font-medium">
                                    {/* Link Profil */}
                                    <Link
                                        href="/profile"
                                        onClick={() => setIsProfileOpen(false)}
                                        className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                    >
                                        <User className="w-4 h-4 text-slate-500" />
                                        Pengaturan Profil
                                    </Link>

                                    {/* Mode Siang / Malam Button with Switch Animation */}
                                    <button
                                        onClick={() => {
                                            toggleDarkMode();
                                        }}
                                        className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors group"
                                    >
                                        <div className="flex items-center gap-3">
                                            <AnimatePresence mode="wait">
                                                {isDarkMode ? (
                                                    <motion.div
                                                        key="sun-icon"
                                                        initial={{ rotate: -90, scale: 0.6 }}
                                                        animate={{ rotate: 0, scale: 1 }}
                                                        exit={{ rotate: 90, scale: 0.6 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Sun className="w-4 h-4 text-amber-500" />
                                                    </motion.div>
                                                ) : (
                                                    <motion.div
                                                        key="moon-icon"
                                                        initial={{ rotate: -90, scale: 0.6 }}
                                                        animate={{ rotate: 0, scale: 1 }}
                                                        exit={{ rotate: 90, scale: 0.6 }}
                                                        transition={{ duration: 0.2 }}
                                                    >
                                                        <Moon className="w-4 h-4 text-indigo-500" />
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                            <span>{isDarkMode ? "Mode Siang" : "Mode Malam"}</span>
                                        </div>

                                        {/* Animated Switch Pill */}
                                        <div className={`w-8 h-4 rounded-full p-0.5 transition-colors duration-300 flex items-center ${isDarkMode ? "bg-indigo-600 justify-end" : "bg-slate-300 dark:bg-slate-700 justify-start"}`}>
                                            <motion.div
                                                layout
                                                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                                                className="w-3 h-3 rounded-full bg-white shadow-sm"
                                            />
                                        </div>
                                    </button>
                                </div>

                                {/* Logout Section */}
                                <div className="p-2 border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={handleLogout}
                                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 text-xs font-semibold transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" />
                                        Keluar (Logout)
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </header>
    );
}
