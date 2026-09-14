"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, ArrowRight, BookOpen, CheckCircle2, Megaphone, Info, AlertTriangle } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserTasks, getAdminManagementTasks } from "@/services/taskService";
import { getUpcomingTaskReminders } from "@/services/reminderCheckService";
import { subscribeNotifications, markAsRead, cleanupAdminNotifications } from "@/services/notificationService";
import { collection, query, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import PeriodFilter, { filterItemsByPeriod } from "@/components/common/PeriodFilter";
import Pagination from "@/components/common/Pagination";

export default function NotificationPage() {
    const { user, userData } = useAuth();
    const router = useRouter();

    const isAdmin = userData?.role === "ADMIN";

    const [activeTab, setActiveTab] = useState(isAdmin ? "admin_attention" : "deadline");
    const [reminders, setReminders] = useState([]);
    const [taskNotifications, setTaskNotifications] = useState([]);
    const [adminAnnouncements, setAdminAnnouncements] = useState([]);
    const [adminAttentionTasks, setAdminAttentionTasks] = useState([]);
    const [loading, setLoading] = useState(true);

    // Period Filter State
    const [selectedPeriod, setSelectedPeriod] = useState("all");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    // Reset pagination on tab / filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab, selectedPeriod, customStartDate, customEndDate]);

    // Set default tab on load based on role
    useEffect(() => {
        if (isAdmin && activeTab === "deadline") {
            setActiveTab("admin_attention");
        }
    }, [isAdmin]);

    // 1. Student Realtime Notifications (Tugas Baru) & Reminders
    useEffect(() => {
        if (!user?.uid) return;

        const unsubscribe = subscribeNotifications(user.uid, (notifs) => {
            setTaskNotifications(notifs || []);
        });

        const loadReminders = async () => {
            try {
                setLoading(true);
                const tasks = await getUserTasks(user.uid);
                const activeReminders = getUpcomingTaskReminders(tasks || []);
                setReminders(activeReminders);
            } catch (err) {
                console.error("Gagal mengambil data pengingat:", err);
            } finally {
                setLoading(false);
            }
        };

        if (!isAdmin) {
            loadReminders();
        }

        return () => unsubscribe();
    }, [user?.uid, isAdmin]);

    // 2. Admin Attention Tasks (Tasks with deadline approaching and progress < 100%)
    useEffect(() => {
        if (!isAdmin || !userData?.kelas || !user?.uid) return;

        cleanupAdminNotifications(user.uid);

        const loadAdminAttention = async () => {
            try {
                setLoading(true);
                const classTasks = await getAdminManagementTasks(userData.kelas);
                const now = new Date();
                const threeDays = 3 * 24 * 60 * 60 * 1000;

                const attentionList = (classTasks || []).filter((t) => {
                    if (t.progressPercent >= 100) return false;
                    const d = t.deadline?.seconds ? new Date(t.deadline.seconds * 1000) : new Date(t.deadline);
                    const diff = d - now;
                    return diff > 0 && diff <= threeDays;
                });

                setAdminAttentionTasks(attentionList);
            } catch (err) {
                console.error("Gagal memuat tugas perhatian admin:", err);
            } finally {
                setLoading(false);
            }
        };

        loadAdminAttention();
    }, [isAdmin, userData?.kelas, user?.uid]);

    // 3. Realtime listener announcements
    useEffect(() => {
        if (!user?.uid) return;

        const q = query(collection(db, "announcements"));
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const announcementsData = snapshot.docs.map((doc) => ({
                    id: doc.id,
                    ...doc.data(),
                    createdAt: doc.data().createdAt?.toDate
                        ? doc.data().createdAt.toDate()
                        : new Date(doc.data().createdAt || Date.now()),
                }));
                setAdminAnnouncements(announcementsData);
            },
            (error) => {
                console.error("Gagal mengambil pengumuman admin:", error);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    // Handling click on notification item -> Firestore markAsRead
    const handleNotifClick = async (notif) => {
        if (notif.id && !notif.read) {
            await markAsRead(notif.id);
        }
        const targetId = notif.taskId || notif.task_id || notif.broadcast_id;
        if (targetId) {
            router.push(`/tasks?id=${targetId}`);
        } else {
            router.push("/tasks");
        }
    };

    const handleAdminAttentionClick = (task) => {
        router.push("/managemen-task");
    };

    // Filter by period
    const getFilteredList = () => {
        let rawList = [];

        if (isAdmin) {
            if (activeTab === "admin_attention") {
                rawList = adminAttentionTasks;
                return filterItemsByPeriod(rawList, selectedPeriod, (item) => item.deadline, customStartDate, customEndDate);
            } else {
                rawList = adminAnnouncements;
                return filterItemsByPeriod(rawList, selectedPeriod, (item) => item.createdAt, customStartDate, customEndDate);
            }
        } else {
            if (activeTab === "deadline") {
                rawList = reminders;
                return filterItemsByPeriod(rawList, selectedPeriod, (item) => item.deadline, customStartDate, customEndDate);
            } else {
                rawList = taskNotifications;
                return filterItemsByPeriod(rawList, selectedPeriod, (item) => item.createdAt, customStartDate, customEndDate);
            }
        }
    };

    const filteredItems = getFilteredList();
    const totalPages = Math.ceil(filteredItems.length / pageSize) || 1;
    const paginatedItems = filteredItems.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    // Unread Counts
    const unreadStudentNotifCount = taskNotifications.filter((n) => !n.read).length;

    if (loading) {
        return (
            <div className="w-full space-y-6 animate-pulse">
                <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                <div className="h-12 bg-slate-200 dark:bg-slate-800 rounded-xl w-full max-w-md" />
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="w-full space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Pusat Notifikasi {isAdmin ? "(Admin)" : ""}
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {isAdmin
                            ? "Pantau tugas kelas yang mendekati deadline dan belum 100% selesai"
                            : "Pantau pengingat tenggat waktu tugas dan pemberitahuan tugas baru"}
                    </p>
                </div>

                {/* Period Filter */}
                <PeriodFilter
                    selectedPeriod={selectedPeriod}
                    onPeriodChange={setSelectedPeriod}
                    customStartDate={customStartDate}
                    customEndDate={customEndDate}
                    onStartDateChange={setCustomStartDate}
                    onEndDateChange={setCustomEndDate}
                />
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 overflow-x-auto">
                {isAdmin ? (
                    <>
                        <button
                            onClick={() => setActiveTab("admin_attention")}
                            className={`relative py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "admin_attention"
                                ? "border-amber-600 text-amber-600 dark:text-amber-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <AlertTriangle className="w-4 h-4 text-amber-500" />
                            Perhatian Admin (Tugas Belum 100%)
                            {adminAttentionTasks.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 text-xs font-bold">
                                    {adminAttentionTasks.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab("admin_announcements")}
                            className={`relative py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "admin_announcements"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <Megaphone className="w-4 h-4" />
                            Pengumuman Kelas
                        </button>
                    </>
                ) : (
                    <>
                        <button
                            onClick={() => setActiveTab("deadline")}
                            className={`relative py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "deadline"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <BookOpen className="w-4 h-4" />
                            Mendekati Deadline
                            {reminders.length > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400 text-xs font-bold">
                                    {reminders.length}
                                </span>
                            )}
                        </button>

                        <button
                            onClick={() => setActiveTab("new_tasks")}
                            className={`relative py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "new_tasks"
                                ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                                : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                                }`}
                        >
                            <Megaphone className="w-4 h-4" />
                            Tugas Baru (Notifikasi)
                            {unreadStudentNotifCount > 0 && (
                                <span className="ml-1 px-2 py-0.5 rounded-full bg-rose-600 text-white text-xs font-bold animate-pulse">
                                    {unreadStudentNotifCount}
                                </span>
                            )}
                        </button>
                    </>
                )}
            </div>

            {/* Content Section */}
            <div className="space-y-3">
                {/* ADMIN TAB 1: PERHATIAN ADMIN */}
                {isAdmin && activeTab === "admin_attention" && (
                    <>
                        {paginatedItems.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    🎉 Semua Tugas Kelas Aman
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Tidak ada tugas mendekati deadline (≤3 hari) yang belum 100% dikerjakan mahasiswa.
                                </p>
                            </div>
                        ) : (
                            paginatedItems.map((task) => (
                                <div
                                    key={task.groupKey}
                                    onClick={() => handleAdminAttentionClick(task)}
                                    className="p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group bg-amber-50/30 dark:bg-amber-950/10 border-amber-200 dark:border-amber-900/50 hover:border-amber-500"
                                >
                                    <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
                                        <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-950 text-amber-600 dark:text-amber-400 shrink-0">
                                            <AlertTriangle className="w-5 h-5" />
                                        </div>

                                        <div className="min-w-0 space-y-1 w-full">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300">
                                                    Mendekati Deadline (Progress {task.progressPercent}%)
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                    {task.matkul} • Pertemuan {task.pertemuan}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-amber-600 transition-colors">
                                                {task.judul}
                                            </h4>

                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                Masih ada <span className="font-bold text-rose-600">{task.totalStudents - task.doneCount} mahasiswa</span> yang belum menyelesaikan tugas ini.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                                            <span>
                                                {task.deadline
                                                    ? (task.deadline.seconds
                                                        ? new Date(task.deadline.seconds * 1000)
                                                        : new Date(task.deadline)
                                                    ).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })
                                                    : "-"}
                                            </span>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAdminAttentionClick(task);
                                            }}
                                            className="p-2 rounded-xl bg-amber-600 text-white hover:bg-amber-700 transition-colors shadow-sm"
                                            title="Buka Managemen Task"
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {/* MAHASISWA TAB 1: PENGINGAT DEADLINE */}
                {!isAdmin && activeTab === "deadline" && (
                    <>
                        {paginatedItems.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                                    <CheckCircle2 className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    🎉 Tidak Ada Pengingat Deadline Saat Ini
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Seluruh tugas kamu aman dan tidak ada yang mendekati tenggat waktu 2 hari ke depan.
                                </p>
                            </div>
                        ) : (
                            paginatedItems.map((notif) => (
                                <div
                                    key={notif.id}
                                    onClick={() => router.push(`/tasks?id=${notif.taskId}`)}
                                    className="p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500"
                                >
                                    <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
                                        <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                                            <BookOpen className="w-5 h-5" />
                                        </div>

                                        <div className="min-w-0 space-y-1 w-full">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <span
                                                    className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${notif.type === "reminder_h1"
                                                        ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                                                        : "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                                                        }`}
                                                >
                                                    {notif.badge}
                                                </span>
                                                <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                    {notif.task?.matkul}
                                                </span>
                                            </div>

                                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                                                {notif.title}
                                            </h4>

                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {notif.message}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                            <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                            <span>
                                                {notif.deadline
                                                    ? new Date(notif.deadline).toLocaleString("id-ID", {
                                                        dateStyle: "medium",
                                                        timeStyle: "short",
                                                    })
                                                    : "Mendekati Deadline"}
                                            </span>
                                        </div>

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                router.push(`/tasks?id=${notif.taskId}`);
                                            }}
                                            className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                        >
                                            <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}

                {/* MAHASISWA TAB 2: TUGAS BARU (NOTIFIKASI FIRESTORE) */}
                {!isAdmin && activeTab === "new_tasks" && (
                    <>
                        {paginatedItems.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                                    <Info className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Belum Ada Notifikasi Tugas Baru
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Ketika Admin menambahkan tugas baru untuk kelas kamu, notifikasi akan otomatis muncul di sini.
                                </p>
                            </div>
                        ) : (
                            paginatedItems.map((item) => {
                                const isUnread = !item.read;
                                return (
                                    <div
                                        key={item.id || item.taskId}
                                        onClick={() => handleNotifClick(item)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${isUnread
                                            ? "bg-rose-50/40 dark:bg-rose-950/20 border-rose-200 dark:border-rose-900/60"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
                                            <div className="relative p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0">
                                                <Megaphone className="w-5 h-5" />
                                                {isUnread && (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                                                )}
                                            </div>

                                            <div className="min-w-0 space-y-1 w-full">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300">
                                                        {item.category || "Tugas Baru"}
                                                    </span>
                                                    {isUnread && (
                                                        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                                                            BELUM DIBACA
                                                        </span>
                                                    )}
                                                </div>

                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                                                    {item.title}
                                                </h4>

                                                <p className="text-xs text-slate-600 dark:text-slate-400">
                                                    {item.message}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>
                                                    {item.createdAt
                                                        ? (item.createdAt.seconds
                                                            ? new Date(item.createdAt.seconds * 1000)
                                                            : new Date(item.createdAt)
                                                        ).toLocaleDateString("id-ID", {
                                                            day: "numeric",
                                                            month: "short",
                                                            year: "numeric",
                                                        })
                                                        : "-"}
                                                </span>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleNotifClick(item);
                                                }}
                                                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                );
                            })
                        )}
                    </>
                )}

                {/* ADMIN TAB 2: PENGUMUMAN KELAS */}
                {isAdmin && activeTab === "admin_announcements" && (
                    <>
                        {paginatedItems.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                                    <Info className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Belum Ada Pengumuman
                                </p>
                            </div>
                        ) : (
                            paginatedItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="p-4 rounded-2xl border bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                                >
                                    <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
                                        <div className="p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0">
                                            <Megaphone className="w-5 h-5" />
                                        </div>

                                        <div className="min-w-0 space-y-1 w-full">
                                            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                {item.title}
                                            </h4>
                                            <p className="text-xs text-slate-600 dark:text-slate-400">
                                                {item.content || item.message}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </>
                )}
            </div>

            {/* Pagination Controls */}
            {filteredItems.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    totalItems={filteredItems.length}
                />
            )}
        </div>
    );
}