"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock, Calendar, ArrowRight, BookOpen, CheckCircle2 } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getUserTasks } from "@/services/taskService";
import { getUpcomingTaskReminders } from "@/services/reminderCheckService";

export default function NotificationPage() {
    const { user } = useAuth();
    const [reminders, setReminders] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    useEffect(() => {
        if (!user?.uid) return;

        const loadData = async () => {
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

        loadData();
    }, [user?.uid]);

    const handleReminderClick = (notif) => {
        if (notif.taskId) {
            router.push(`/tasks?id=${notif.taskId}`);
        } else {
            router.push("/tasks");
        }
    };

    if (loading) {
        return (
            <div className="max-w-4xl w-full space-y-6 animate-pulse">
                <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                <div className="space-y-3">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl w-full space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Pusat Notifikasi & Pengingat Tugas
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Daftar seluruh tugas yang mendekati tenggat waktu (belum selesai)
                    </p>
                </div>

                {reminders.length > 0 && (
                    <span className="px-3 py-1 bg-rose-50 dark:bg-rose-950/80 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 rounded-full text-xs font-bold shrink-0">
                        {reminders.length} Tugas Mendekati Deadline
                    </span>
                )}
            </div>

            <div className="space-y-3">
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
                    reminders.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => handleReminderClick(notif)}
                            className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-950/80 bg-white dark:bg-slate-900 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 hover:border-indigo-500 dark:hover:border-indigo-500 transition-all cursor-pointer shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 group"
                        >
                            <div className="flex items-start gap-3.5 min-w-0">
                                <div className="p-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5 sm:mt-0">
                                    <BookOpen className="w-5 h-5" />
                                </div>

                                <div className="min-w-0 space-y-1">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${notif.type === "reminder_h1"
                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                                            : notif.type === "reminder_h2"
                                                ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                                                : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                                            }`}>
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

                            <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                                <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-800">
                                    <Clock className="w-3.5 h-3.5 text-indigo-500" />
                                    <span>
                                        {notif.deadline
                                            ? notif.deadline.toLocaleString("id-ID", {
                                                dateStyle: "medium",
                                                timeStyle: "short"
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
                    ))
                )}
            </div>
        </div>
    );
}
