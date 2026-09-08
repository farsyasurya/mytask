"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import Sidebar from "@/components/layout/Sidebar";
import { useAuth } from "@/hooks/useAuth";
import { getUserTasks } from "@/services/taskService";
import { TASK_STATUS } from "@/constants/taskStatus";

export default function CalendarPage() {
    const { user, loading: authLoading } = useAuth();
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [selectedTask, setSelectedTask] = useState(null);
    const router = useRouter();

    const fetchTasks = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const data = await getUserTasks(user.uid);
            setTasks(data || []);
        } catch (err) {
            console.error("Gagal mengambil data task kalender:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.uid]);

    useEffect(() => {
        if (!authLoading && !user) {
            router.push("/login");
        } else if (user) {
            fetchTasks();
        }
    }, [user, authLoading, router, fetchTasks]);

    // Kalkulasi jumlah hari & hari pertama
    const daysInMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
    ).getDate();

    const firstDayIndex = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth(),
        1
    ).getDay();

    const monthNames = [
        "Januari", "Februari", "Maret", "April", "Mei", "Juni",
        "Juli", "Agustus", "September", "Oktober", "November", "Desember"
    ];

    const changeMonth = (direction) => {
        setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + direction, 1));
    };

    const today = new Date();
    const isToday = (day) => {
        return (
            day === today.getDate() &&
            currentDate.getMonth() === today.getMonth() &&
            currentDate.getFullYear() === today.getFullYear()
        );
    };

    // Fungsi utilitas helper format tanggal lokal (mencegah bug offset timezone ISO)
    const getTaskDateStr = (deadline) => {
        if (!deadline) return "";
        const d = deadline.seconds ? new Date(deadline.seconds * 1000) : new Date(deadline);
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, "0");
        const date = String(d.getDate()).padStart(2, "0");
        return `${year}-${month}-${date}`;
    };

    // Helper warna badge tugas berdasarkan status
    const getTaskBadgeStyle = (status) => {
        switch (status?.toLowerCase()) {
            case "done":
                return "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800";
            case "on_progress":
                return "bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300 border-amber-200 dark:border-amber-800";
            case "reject":
                return "bg-rose-50 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800";
            default:
                return "bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800";
        }
    };

    if (authLoading || loading) {
        return (
            <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100">
                <Sidebar />
                <main className="flex-1 p-4 sm:p-6 md:p-8 w-full min-w-0 animate-pulse space-y-6">
                    <div className="h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                    <div className="h-[500px] bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-200 pb-20 md:pb-0">
            <Sidebar />

            <main className="flex-1 p-4 sm:p-6 md:p-8 w-full min-w-0 space-y-6">

                {/* Header Navbar Kalender */}
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all">
                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                            <CalendarIcon className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                            Kalender Deadline
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Lihat dan pantau jadwal tenggat waktu tugas kamu
                        </p>
                    </div>

                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800/60 p-1.5 rounded-xl border border-slate-200 dark:border-slate-700">
                        <button
                            onClick={() => changeMonth(-1)}
                            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                            title="Bulan Sebelumnya"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>

                        <span className="text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-200 px-3 min-w-[140px] text-center">
                            {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
                        </span>

                        <button
                            onClick={() => changeMonth(1)}
                            className="p-2 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-600 dark:text-slate-300 transition-all active:scale-95"
                            title="Bulan Berikutnya"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Calendar Grid Container */}
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-6 shadow-sm overflow-x-auto">
                    {/* Header Nama Hari */}
                    <div className="grid grid-cols-7 gap-2 text-center font-bold text-xs text-slate-500 dark:text-slate-400 mb-3 min-w-[600px]">
                        <div className="text-rose-500 dark:text-rose-400">Min</div>
                        <div>Sen</div>
                        <div>Sel</div>
                        <div>Rab</div>
                        <div>Kam</div>
                        <div>Jum</div>
                        <div className="text-indigo-500 dark:text-indigo-400">Sab</div>
                    </div>

                    {/* Grid Sel Hari */}
                    <div className="grid grid-cols-7 gap-2 min-w-[600px]">
                        {/* Slot Kosong Sebelum Tanggal 1 */}
                        {Array.from({ length: firstDayIndex }).map((_, i) => (
                            <div key={`empty-${i}`} className="h-28 sm:h-32 bg-slate-50/50 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-100 dark:border-slate-800/50" />
                        ))}

                        {/* Tanggal dalam Bulan */}
                        {Array.from({ length: daysInMonth }).map((_, i) => {
                            const day = i + 1;
                            const monthStr = String(currentDate.getMonth() + 1).padStart(2, "0");
                            const dayStr = String(day).padStart(2, "0");
                            const currentDateStr = `${currentDate.getFullYear()}-${monthStr}-${dayStr}`;

                            const dayTasks = tasks.filter((t) => getTaskDateStr(t.deadline) === currentDateStr);
                            const currentDayIsToday = isToday(day);

                            return (
                                <div
                                    key={day}
                                    className={`h-28 sm:h-32 border rounded-xl p-2 flex flex-col justify-between transition-all duration-200 hover:border-indigo-300 dark:hover:border-indigo-700 ${currentDayIsToday
                                            ? "bg-indigo-50/40 dark:bg-indigo-950/20 border-indigo-500 dark:border-indigo-500 shadow-sm"
                                            : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800"
                                        }`}
                                >
                                    {/* Nomor Tanggal */}
                                    <div className="flex justify-between items-center">
                                        <span
                                            className={`text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full ${currentDayIsToday
                                                    ? "bg-indigo-600 text-white shadow-sm"
                                                    : "text-slate-700 dark:text-slate-300"
                                                }`}
                                        >
                                            {day}
                                        </span>
                                        {dayTasks.length > 0 && (
                                            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
                                                {dayTasks.length} task
                                            </span>
                                        )}
                                    </div>

                                    {/* List Task dalam Hari */}
                                    <div className="space-y-1 overflow-y-auto max-h-20 pr-0.5 scrollbar-thin">
                                        {dayTasks.map((t) => (
                                            <div
                                                key={t.id}
                                                onClick={() => setSelectedTask(t)}
                                                className={`text-[10px] sm:text-[11px] p-1.5 rounded-lg border font-medium truncate cursor-pointer transition-all active:scale-95 ${getTaskBadgeStyle(
                                                    t.status
                                                )}`}
                                                title={`${t.judul} (${t.matkul || 'Tugas'})`}
                                            >
                                                {t.judul}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Task Quick Detail Modal Overlay */}
                {selectedTask && (
                    <div
                        onClick={() => setSelectedTask(null)}
                        className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-200"
                    >
                        <div
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-5 shadow-2xl space-y-4"
                        >
                            <div className="flex justify-between items-start">
                                <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 rounded-md">
                                    📚 {selectedTask.matkul || "Mata Kuliah"}
                                </span>
                                <button
                                    onClick={() => setSelectedTask(null)}
                                    className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-sm font-bold"
                                >
                                    ✕
                                </button>
                            </div>

                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                                    {selectedTask.judul}
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                                    Pertemuan {selectedTask.pertemuan || 1}
                                </p>
                            </div>

                            {selectedTask.deskripsi && (
                                <p className="text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-xl border border-slate-200/60 dark:border-slate-700/60">
                                    {selectedTask.deskripsi}
                                </p>
                            )}

                            <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 pt-2 border-t border-slate-100 dark:border-slate-800">
                                <Clock className="w-4 h-4 text-slate-400" />
                                <span>
                                    Deadline:{" "}
                                    {selectedTask.deadline?.seconds
                                        ? new Date(selectedTask.deadline.seconds * 1000).toLocaleString("id-ID", {
                                            dateStyle: "medium",
                                            timeStyle: "short"
                                        })
                                        : selectedTask.deadline}
                                </span>
                            </div>

                            <button
                                onClick={() => setSelectedTask(null)}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl text-xs transition-all active:scale-95"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}