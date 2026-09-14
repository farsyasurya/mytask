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
    ExternalLink,
    CheckCircle2,
    BookOpen
} from "lucide-react";
import { getUserTasks, getAdminManagementTasks } from "@/services/taskService";
import { getUpcomingTaskReminders } from "@/services/reminderCheckService";
import { subscribeNotifications, cleanupAdminNotifications } from "@/services/notificationService";

export default function TopNav({ isDarkMode, toggleDarkMode }) {
    const router = useRouter();
    const { user, userData, logout } = useAuth();

    // Dropdown states
    const [isProfileOpen, setIsProfileOpen] = useState(false);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    // Search state
    const [searchQuery, setSearchQuery] = useState("");
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [allTasks, setAllTasks] = useState([]);
    const [searchResults, setSearchResults] = useState([]);

    // Notification / Reminder state
    const [notifications, setNotifications] = useState([]);
    const [unreadCount, setUnreadCount] = useState(0);

    // Click outside refs
    const profileRef = useRef(null);
    const notifRef = useRef(null);
    const searchRef = useRef(null);

    // Load tasks for search & subscribe realtime unread notifications
    useEffect(() => {
        if (!user?.uid) return;

        const loadData = async () => {
            try {
                const tasks = await getUserTasks(user.uid);
                setAllTasks(tasks || []);
            } catch (err) {
                console.error("Gagal memuat data di navigasi atas:", err);
            }
        };

        loadData();

        if (userData?.role === "ADMIN") {
            cleanupAdminNotifications(user.uid);

            const loadAdminAttention = async () => {
                try {
                    const classTasks = await getAdminManagementTasks(userData.kelas);
                    const now = new Date();
                    const threeDays = 3 * 24 * 60 * 60 * 1000;
                    const attentionList = (classTasks || []).filter((t) => {
                        if (t.progressPercent >= 100) return false;
                        const d = t.deadline?.seconds ? new Date(t.deadline.seconds * 1000) : new Date(t.deadline);
                        const diff = d - now;
                        return diff > 0 && diff <= threeDays;
                    });
                    setUnreadCount(attentionList.length);
                } catch (err) {
                    console.error("Gagal memuat count perhatian admin:", err);
                }
            };
            loadAdminAttention();
        } else {
            const unsubscribe = subscribeNotifications(user.uid, (notifs) => {
                const unread = notifs.filter((n) => !n.read).length;
                setUnreadCount(unread);
            });

            return () => unsubscribe();
        }
    }, [user?.uid, userData?.role, userData?.kelas]);

    // Live search filter (YouTube-style suggestion dropdown)
    useEffect(() => {
        if (!searchQuery.trim()) {
            setSearchResults([]);
            return;
        }

        const q = searchQuery.toLowerCase().trim();
        const matches = allTasks.filter(
            (t) =>
                t.judul?.toLowerCase().includes(q) ||
                t.matkul?.toLowerCase().includes(q) ||
                t.deskripsi?.toLowerCase().includes(q)
        );
        setSearchResults(matches.slice(0, 5)); // Limit to top 5 results
    }, [searchQuery, allTasks]);

    // Close dropdowns on click outside
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (profileRef.current && !profileRef.current.contains(e.target)) {
                setIsProfileOpen(false);
            }
            if (notifRef.current && !notifRef.current.contains(e.target)) {
                setIsNotifOpen(false);
            }
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setIsSearchFocused(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchSubmit = (e) => {
        e.preventDefault();
        if (searchQuery.trim()) {
            router.push(`/tasks?search=${encodeURIComponent(searchQuery.trim())}`);
            setIsSearchFocused(false);
        }
    };

    const handleSelectSearchItem = (task) => {
        setSearchQuery("");
        setIsSearchFocused(false);
        router.push(`/tasks?id=${task.id}`);
    };

    const handleNotificationClick = (notif) => {
        setIsNotifOpen(false);
        const targetId = notif.taskId || notif.task_id || notif.broadcast_id;
        if (targetId) {
            router.push(`/tasks?id=${targetId}`);
        } else {
            router.push("/tasks");
        }
    };

    const handleLogout = async () => {
        setIsProfileOpen(false);
        await logout();
        router.push("/login");
    };

    // User name helper
    const displayName = userData?.name || user?.displayName || user?.email?.split("@")[0] || "Pengguna";
    const userInitial = displayName.charAt(0).toUpperCase();

    // Helper status badge dalam Bahasa Indonesia
    const getStatusBadge = (status) => {
        switch (status) {
            case "done":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-300">Selesai</span>;
            case "on_progress":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-300">Dalam Proses</span>;
            case "reject":
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300">Ditolak</span>;
            default:
                return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">Baru</span>;
        }
    };

    return (
        <header className="sticky top-0 z-30 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 px-4 sm:px-6 py-3 transition-colors duration-200">
            <div className="flex items-center justify-between gap-4">

                {/* Search Bar with YouTube-Style Suggestion Dropdown */}
                <div className="relative flex-1 max-w-md" ref={searchRef}>
                    <form onSubmit={handleSearchSubmit} className="relative">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
                        <input
                            type="text"
                            placeholder="Cari tugas kuliah..."
                            value={searchQuery}
                            onFocus={() => setIsSearchFocused(true)}
                            onChange={(e) => {
                                setSearchQuery(e.target.value);
                                setIsSearchFocused(true);
                            }}
                            className="w-full pl-10 pr-8 py-2 text-xs sm:text-sm bg-slate-100 dark:bg-slate-800/70 text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 rounded-xl border border-transparent focus:border-indigo-500 dark:focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:outline-none transition-all duration-200"
                        />
                        {searchQuery && (
                            <button
                                type="button"
                                onClick={() => {
                                    setSearchQuery("");
                                    setIsSearchFocused(false);
                                }}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </form>

                    {/* YouTube-Style Live Search Results Popover */}
                    {isSearchFocused && searchQuery.trim() && (
                        <div className="absolute left-0 right-0 mt-2 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in duration-200">
                            <div className="p-2 border-b border-slate-100 dark:border-slate-800 text-[11px] font-semibold text-slate-400 dark:text-slate-500 px-3">
                                Hasil Pencarian Tugas
                            </div>

                            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                {searchResults.length === 0 ? (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                        Tidak ada tugas yang cocok dengan "{searchQuery}"
                                    </div>
                                ) : (
                                    searchResults.map((task) => (
                                        <div
                                            key={task.id}
                                            onClick={() => handleSelectSearchItem(task)}
                                            className="p-3 text-xs cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/60 transition-colors flex items-center justify-between gap-3"
                                        >
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                    <BookOpen className="w-4 h-4" />
                                                </div>
                                                <div className="min-w-0">
                                                    <p className="font-bold text-slate-900 dark:text-slate-100 truncate">
                                                        {task.judul}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                                        {task.matkul} • Pertemuan {task.pertemuan || 1}
                                                    </p>
                                                </div>
                                            </div>

                                            <div className="shrink-0 text-right">
                                                {getStatusBadge(task.status)}
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {searchResults.length > 0 && (
                                <div className="p-2 bg-slate-50 dark:bg-slate-800/40 text-center border-t border-slate-100 dark:border-slate-800">
                                    <button
                                        onClick={handleSearchSubmit}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline"
                                    >
                                        Lihat semua hasil untuk "{searchQuery}"
                                    </button>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Right Action Menu: Theme Toggle, Notifications & Profile */}
                <div className="flex items-center gap-2 sm:gap-3">

                    {/* Mode Siang/Malam Quick Toggle Button */}
                    <motion.button
                        whileTap={{ scale: 0.85 }}
                        whileHover={{ scale: 1.05 }}
                        onClick={toggleDarkMode}
                        className="p-2 rounded-xl text-slate-600 dark:text-slate-300 bg-slate-100/80 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors focus:outline-none overflow-hidden relative"
                        title={isDarkMode ? "Ganti ke Mode Siang" : "Ganti ke Mode Malam"}
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

                    {/* Lonceng / Notifikasi Dropdown */}
                    <div className="relative" ref={notifRef}>
                        <button
                            onClick={() => {
                                setIsNotifOpen(!isNotifOpen);
                                setIsProfileOpen(false);
                                router.push('/notifications');
                            }}
                            className="relative p-2 rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors focus:outline-none"
                            title="Notifikasi Pengingat"
                        >
                            <Bell className="w-5 h-5" />
                            {unreadCount > 0 && (
                                <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-500 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900 animate-in zoom-in-50 duration-200">
                                    {unreadCount > 9 ? "9+" : unreadCount}
                                </span>
                            )}
                        </button>

                        {/* Notification Popover
                        {isNotifOpen && (
                            <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/30">
                                    <div className="flex items-center gap-2">
                                        <Bell className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                                        <h3 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-100">
                                            Pengingat Tugas
                                        </h3>
                                    </div>
                                    {unreadCount > 0 && (
                                        <span className="text-[10px] font-semibold bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 px-2 py-0.5 rounded-full border border-rose-100 dark:border-rose-900">
                                            {unreadCount} Tugas Mendekati Deadline
                                        </span>
                                    )}
                                </div>

                                <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                                    {notifications.length === 0 ? (
                                        <div className="p-6 text-center text-slate-400 dark:text-slate-500 text-xs">
                                            🎉 Tidak ada pengingat deadline saat ini
                                        </div>
                                    ) : (
                                        notifications.slice(0, 5).map((notif) => (
                                            <div
                                                key={notif.id}
                                                onClick={() => handleNotificationClick(notif)}
                                                className="p-3 text-xs cursor-pointer transition-colors flex items-start gap-3 hover:bg-slate-50 dark:hover:bg-slate-800/60 bg-indigo-50/20 dark:bg-indigo-950/20"
                                            >
                                                <div className="mt-0.5 p-1.5 rounded-lg shrink-0 bg-indigo-100 text-indigo-600 dark:bg-indigo-900 dark:text-indigo-300">
                                                    <Clock className="w-3.5 h-3.5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-1.5 mb-0.5">
                                                        <span className="text-[9px] font-bold px-1.5 py-0.5 bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-300 rounded">
                                                            {notif.badge}
                                                        </span>
                                                    </div>
                                                    <p className="text-slate-800 dark:text-slate-200 font-semibold line-clamp-1">
                                                        {notif.title}
                                                    </p>
                                                    <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mt-0.5">
                                                        {notif.message}
                                                    </p>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>

                                <div className="p-2.5 border-t border-slate-100 dark:border-slate-800 text-center bg-slate-50/50 dark:bg-slate-800/30">
                                    <Link
                                        href="/tasks"
                                        onClick={() => setIsNotifOpen(false)}
                                        className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline inline-flex items-center gap-1"
                                    >
                                        Kelola Semua Tugas
                                        <ExternalLink className="w-3 h-3" />
                                    </Link>
                                </div>
                            </div>
                        )} */}
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
                                {displayName}
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
                                                {displayName}
                                            </p>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                                                {userData?.email || user?.email || "user@taskify.com"}
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
                                        Keluar
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
