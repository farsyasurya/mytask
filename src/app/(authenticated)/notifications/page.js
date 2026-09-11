"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, ArrowRight, BookOpen, CheckCircle2, Megaphone, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserTasks } from "@/services/taskService";
import { getUpcomingTaskReminders } from "@/services/reminderCheckService";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";

export default function NotificationPage() {
    const { user } = useAuth();
    const router = useRouter();

    const [activeTab, setActiveTab] = useState("deadline");
    const [reminders, setReminders] = useState([]);
    const [adminAnnouncements, setAdminAnnouncements] = useState([]);
    const [loading, setLoading] = useState(true);

    // Tracking status dibaca (disimpan di localStorage agar persistent di client)
    const [readIds, setReadIds] = useState([]);

    useEffect(() => {
        const localRead = localStorage.getItem("read_notifications");
        if (localRead) {
            try {
                setReadIds(JSON.parse(localRead));
            } catch (e) {
                console.error("Error parsing read_notifications", e);
            }
        }
    }, []);

    const markAsRead = (id) => {
        if (!readIds.includes(id)) {
            const updated = [...readIds, id];
            setReadIds(updated);
            localStorage.setItem("read_notifications", JSON.stringify(updated));
        }
    };

    // 1. Fetch Task Reminders
    useEffect(() => {
        if (!user?.uid) return;

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

        loadReminders();
    }, [user?.uid]);

    // 2. Realtime listener pengumuman dari Admin Kelas
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

    const handleReminderClick = (notif) => {
        markAsRead(notif.id);
        if (notif.taskId) {
            router.push(`/tasks?id=${notif.taskId}`);
        } else {
            router.push("/tasks");
        }
    };

    const handleAdminClick = (announcement) => {
        markAsRead(announcement.id);
        if (announcement.link) {
            router.push(announcement.link);
        }
    };

    // Menghitung jumlah notifikasi yang BELUM DIBACA
    const unreadDeadlineCount = reminders.filter((r) => !readIds.includes(r.id)).length;
    const unreadAdminCount = adminAnnouncements.filter((a) => !readIds.includes(a.id)).length;

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
                        Pusat Notifikasi
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Pantau pengingat tenggat waktu tugas dan pengumuman resmi admin kelas
                    </p>
                </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-2 sm:gap-6 overflow-x-auto">
                <button
                    onClick={() => setActiveTab("deadline")}
                    className={`relative py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "deadline"
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                >
                    <BookOpen className="w-4 h-4" />
                    Mendekati Deadline
                    {unreadDeadlineCount > 0 && (
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                    )}
                </button>

                <button
                    onClick={() => setActiveTab("admin")}
                    className={`relative py-3 px-3 text-xs sm:text-sm font-semibold flex items-center gap-2 border-b-2 transition-all whitespace-nowrap ${activeTab === "admin"
                        ? "border-indigo-600 text-indigo-600 dark:text-indigo-400"
                        : "border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                        }`}
                >
                    <Megaphone className="w-4 h-4" />
                    Tugas Baru
                    {unreadAdminCount > 0 && (
                        <span className="flex h-2.5 w-2.5 relative">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75" />
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-rose-500" />
                        </span>
                    )}
                </button>
            </div>

            {/* Content Section */}
            <div className="space-y-3">
                {/* TAB 1: PENGINGAT DEADLINE */}
                {activeTab === "deadline" && (
                    <>
                        {reminders.length === 0 ? (
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
                            reminders.map((notif) => {
                                const isUnread = !readIds.includes(notif.id);
                                return (
                                    <div
                                        key={notif.id}
                                        onClick={() => handleReminderClick(notif)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${isUnread
                                            ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
                                            <div className="relative p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
                                                <BookOpen className="w-5 h-5" />
                                                {isUnread && (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                                                )}
                                            </div>

                                            <div className="min-w-0 space-y-1 w-full">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span
                                                        className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${notif.type === "reminder_h1"
                                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                                                            : notif.type === "reminder_h2"
                                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                                                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                                                            }`}
                                                    >
                                                        {notif.badge}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        {notif.task?.matkul}
                                                    </span>
                                                </div>

                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {notif.title}
                                                </h4>

                                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                                    {notif.message}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                                <span>
                                                    {notif.deadline
                                                        ? notif.deadline.toLocaleString("id-ID", {
                                                            dateStyle: "medium",
                                                            timeStyle: "short",
                                                        })
                                                        : "Mendekati Deadline"}
                                                </span>
                                            </div>

                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleReminderClick(notif);
                                                }}
                                                className="p-2 rounded-xl bg-indigo-600 text-white hover:bg-indigo-700 transition-colors shadow-sm"
                                                title="Lihat Detail Tugas"
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

                {/* TAB 2: PENGUMUMAN ADMIN */}
                {activeTab === "admin" && (
                    <>
                        {adminAnnouncements.length === 0 ? (
                            <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center space-y-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto">
                                    <Info className="w-6 h-6" />
                                </div>
                                <p className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                                    Belum Ada Pengumuman Admin
                                </p>
                                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto">
                                    Informasi penting atau pengumuman dari ketua kelas/admin akan tampil di sini.
                                </p>
                            </div>
                        ) : (
                            adminAnnouncements.map((item) => {
                                const isUnread = !readIds.includes(item.id);
                                return (
                                    <div
                                        key={item.id}
                                        onClick={() => handleAdminClick(item)}
                                        className={`p-4 rounded-2xl border transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group ${isUnread
                                            ? "bg-rose-50/30 dark:bg-rose-950/10 border-rose-200 dark:border-rose-900/50"
                                            : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-indigo-500 dark:hover:border-indigo-500"
                                            }`}
                                    >
                                        <div className="flex items-start gap-3.5 min-w-0 w-full sm:w-auto">
                                            <div className="relative p-2.5 rounded-xl bg-purple-50 dark:bg-purple-950 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5 sm:mt-0">
                                                <Megaphone className="w-5 h-5" />
                                                {isUnread && (
                                                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900" />
                                                )}
                                            </div>

                                            <div className="min-w-0 space-y-1 w-full">
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-purple-100 text-purple-700 dark:bg-purple-950/80 dark:text-purple-300">
                                                        {item.category || "Pengumuman Kelas"}
                                                    </span>
                                                    <span className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                                                        Oleh: {item.author || "Admin Kelas"}
                                                    </span>
                                                </div>

                                                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                    {item.title}
                                                </h4>

                                                <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                                                    {item.content || item.message}
                                                </p>
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between sm:justify-end w-full sm:w-auto gap-3 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100 dark:border-slate-800">
                                            <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                                <Clock className="w-3.5 h-3.5 text-purple-500" />
                                                <span>
                                                    {item.createdAt
                                                        ? new Date(item.createdAt).toLocaleDateString("id-ID", {
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
                                                    handleAdminClick(item);
                                                }}
                                                className="p-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 transition-colors shadow-sm"
                                                title="Lihat Detail"
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
            </div>
        </div>
    );
}