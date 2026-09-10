"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ArrowRight, X, Clock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useAuth } from "@/hooks/useAuth";
import { getUserTasks } from "@/services/taskService";
import { getUpcomingTaskReminders } from "@/services/reminderCheckService";

export default function ReminderModal() {
    const { user } = useAuth();
    const router = useRouter();
    const [reminders, setReminders] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const [dismissed, setDismissed] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        const checkReminders = async () => {
            try {
                const tasks = await getUserTasks(user.uid);
                const activeReminders = getUpcomingTaskReminders(tasks);
                setReminders(activeReminders);

                // Buka popup jika ada tugas yang membutuhkan pengingat dan modal belum ditutup
                if (activeReminders.length > 0 && !dismissed) {
                    setIsOpen(true);
                }
            } catch (err) {
                console.error("Gagal memeriksa pengingat tugas:", err);
            }
        };

        checkReminders();
    }, [user?.uid, dismissed]);

    const handleClose = () => {
        setDismissed(true);
        setIsOpen(false);
    };

    const handleReminderClick = (rem) => {
        handleClose();
        if (rem.taskId) {
            router.push(`/tasks?id=${rem.taskId}`);
        } else {
            router.push("/tasks");
        }
    };

    if (!isOpen || reminders.length === 0) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0, scale: 0.9, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: 20 }}
                    transition={{ duration: 0.25, type: "spring", stiffness: 300, damping: 25 }}
                    className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-5"
                >
                    {/* Header Modal */}
                    <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                            <div className="w-11 h-11 rounded-2xl bg-indigo-100 dark:bg-indigo-950/80 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                                <Bell className="w-6 h-6 animate-bounce" />
                            </div>
                            <div>
                                <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    Pengingat Tugas!
                                    <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-500 text-white">
                                        {reminders.length}
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Tugas kuliah mendekati tenggat waktu
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={handleClose}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                            title="Tutup Modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* List Notifikasi / Pengingat */}
                    <div className="max-h-72 overflow-y-auto space-y-3 pr-1 scrollbar-thin">
                        {reminders.slice(0, 4).map((rem) => (
                            <div
                                key={rem.id}
                                onClick={() => handleReminderClick(rem)}
                                className="p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-950/80 bg-indigo-50/50 dark:bg-indigo-950/30 hover:border-indigo-500 dark:hover:border-indigo-500 cursor-pointer transition-all space-y-1.5 group"
                            >
                                <div className="flex justify-between items-center">
                                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                                        rem.type === "reminder_h1"
                                            ? "bg-rose-100 text-rose-700 dark:bg-rose-950/80 dark:text-rose-300"
                                            : rem.type === "reminder_h2"
                                            ? "bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300"
                                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/80 dark:text-indigo-300"
                                    }`}>
                                        {rem.badge}
                                    </span>
                                    <span className="text-[10px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        Mendekati Deadline
                                    </span>
                                </div>

                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                    {rem.title}
                                </h4>
                                <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {rem.message}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                        <button
                            onClick={handleClose}
                            className="flex-1 py-2.5 px-3 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl text-xs transition-all active:scale-95 text-center"
                        >
                            Tutup
                        </button>
                        <button
                            onClick={() => {
                                handleClose();
                                router.push("/tasks");
                            }}
                            className="flex-1 py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-1.5 active:scale-95 shadow-md shadow-indigo-500/20"
                        >
                            Lihat Semua Tasks
                            <ArrowRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}