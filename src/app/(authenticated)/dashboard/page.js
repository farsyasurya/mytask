"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    Clock,
    AlertTriangle,
    ListTodo,
    Sparkles,
    ArrowRight,
    Calendar
} from "lucide-react";

import TaskCard from "@/components/task/TaskCard";
import { useAuth } from "@/hooks/useAuth";
import { getUserTasks, updateTaskStatus, deleteTask } from "@/services/taskService";
import { checkAndUpdateTaskReminders } from "@/services/reminderCheckService";

export default function DashboardPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const router = useRouter();

    const fetchTasks = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const data = await getUserTasks(user.uid);
            setTasks(data || []);
            // Run check for mandatory & custom reminders
            await checkAndUpdateTaskReminders(user.uid);
        } catch (err) {
            console.error("Gagal mengambil data task:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (user) {
            fetchTasks();
        }
    }, [user, fetchTasks]);

    const handleStatusChange = async (docId, newStatus) => {
        try {
            await updateTaskStatus(docId, newStatus);
            await fetchTasks();
        } catch (err) {
            console.error("Gagal memperbarui status:", err);
        }
    };

    const handleDelete = async (docId) => {
        if (window.confirm("Hapus Task? Task ini akan dihapus secara permanen.")) {
            try {
                await deleteTask(docId);
                await fetchTasks();
            } catch (err) {
                console.error("Gagal menghapus task:", err);
            }
        }
    };

    // Kalkulasi Statistik
    const totalTasks = tasks.length;
    const newTasks = tasks.filter((t) => t.status === "new").length;
    const onProgressTasks = tasks.filter((t) => t.status === "on_progress").length;
    const doneTasks = tasks.filter((t) => t.status === "done").length;

    const now = new Date();
    const overdueTasks = tasks.filter((t) => {
        if (!t.deadline) return false;
        const d = t.deadline?.seconds ? new Date(t.deadline.seconds * 1000) : new Date(t.deadline);
        return d < now && t.status !== "done";
    });

    const upcomingTasks = tasks
        .filter((t) => t.status !== "done")
        .sort((a, b) => {
            const da = a.deadline?.seconds ? a.deadline.seconds * 1000 : new Date(a.deadline).getTime();
            const db = b.deadline?.seconds ? b.deadline.seconds * 1000 : new Date(b.deadline).getTime();
            return da - db;
        });

    if (authLoading || loading) {
        return (
            <div className="space-y-6 md:space-y-8 animate-pulse">
                <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-24 bg-slate-200 dark:bg-slate-800 rounded-xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header Welcome */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-100 dark:border-indigo-900">
                        {userData?.name ? userData.name.charAt(0).toUpperCase() : "U"}
                    </div>
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                            Selamat datang, {userData?.name || "User"}
                            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Ringkasan dan tenggat waktu tugas kuliahmu
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <button
                        onClick={() => router.push("/tasks")}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-sm"
                    >
                        Kelola Task
                        <ArrowRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Metrics Grid */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Total Task</p>
                        <p className="text-xl sm:text-2xl font-bold mt-1">{totalTasks}</p>
                    </div>
                    <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-600 dark:text-slate-400">
                        <ListTodo className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Baru</p>
                        <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{newTasks}</p>
                    </div>
                    <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
                        <Clock className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Dalam Proses</p>
                        <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{onProgressTasks}</p>
                    </div>
                    <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
                        <Calendar className="w-5 h-5" />
                    </div>
                </div>

                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                    <div>
                        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Selesai</p>
                        <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{doneTasks}</p>
                    </div>
                    <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="w-5 h-5" />
                    </div>
                </div>
            </div>

            {/* Overdue Section */}
            {overdueTasks.length > 0 && (
                <div className="space-y-3">
                    <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400">
                        <AlertTriangle className="w-5 h-5" />
                        <h2 className="text-base sm:text-lg font-bold">
                            Task Terlambat ({overdueTasks.length})
                        </h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {overdueTasks.map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDelete}
                                onEdit={() => router.push("/tasks")}
                                onDetail={() => router.push("/tasks")}
                            />
                        ))}
                    </div>
                </div>
            )}

            {/* Upcoming Deadlines */}
            <div className="space-y-3">
                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold">
                        Deadline Terdekat
                    </h2>
                    {upcomingTasks.length > 6 && (
                        <button
                            onClick={() => router.push("/tasks")}
                            className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                            Lihat Semua
                        </button>
                    )}
                </div>

                {upcomingTasks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            🎉 Tidak ada task yang perlu dikerjakan saat ini.
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {upcomingTasks.slice(0, 6).map((task) => (
                            <TaskCard
                                key={task.id}
                                task={task}
                                onStatusChange={handleStatusChange}
                                onDelete={handleDelete}
                                onEdit={() => router.push("/tasks")}
                                onDetail={() => router.push("/tasks")}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
