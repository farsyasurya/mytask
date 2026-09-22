"use client";

import { useEffect } from "react";
import {
    X,
    BookOpen,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle2,
    PlayCircle,
    XCircle,
    FileText,
    Layers,
    Tag,
    Bell,
    Edit3,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { TASK_TYPES } from "@/constants/taskTypes";
import { TASK_STATUS } from "@/constants/taskStatus";

export default function TaskDetailModal({
    isOpen,
    onClose,
    task,
    onStatusChange,
    onEdit,
    onDelete,
    isAdmin = false
}) {
    // Close on Escape key press
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape") onClose();
        };
        if (isOpen) {
            window.addEventListener("keydown", handleKeyDown);
        }
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen || !task) return null;

    const deadlineDate = task.deadline?.seconds
        ? new Date(task.deadline.seconds * 1000)
        : task.deadline
            ? new Date(task.deadline)
            : null;

    const isDone = task.status === "done";
    const now = new Date();
    const isOverdue = deadlineDate && deadlineDate < now && !isDone;

    // Remaining time calculation
    const getRemainingText = () => {
        if (!deadlineDate || isNaN(deadlineDate.getTime())) return null;
        if (isDone) return { text: "Tugas Selesai", color: "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50" };
        if (isOverdue) return { text: "Melewati Deadline", color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50" };

        const diffMs = deadlineDate.getTime() - now.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffDays > 1) {
            return { text: `Tersisa ${diffDays} hari lagi`, color: "text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50" };
        } else if (diffDays === 1) {
            return { text: "Tersisa 1 hari lagi (Besok)", color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50" };
        } else if (diffHours > 0) {
            return { text: `Tersisa ${diffHours} jam lagi`, color: "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50" };
        } else {
            const diffMinutes = Math.floor(diffMs / (1000 * 60));
            return { text: `Tersisa ${Math.max(1, diffMinutes)} menit lagi!`, color: "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50" };
        }
    };

    const remaining = getRemainingText();

    const formatDate = (date) => {
        if (!date || isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("id-ID", {
            weekday: "long",
            day: "numeric",
            month: "long",
            year: "numeric"
        });
    };

    const formatTime = (date) => {
        if (!date || isNaN(date.getTime())) return "-";
        return date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        }) + " WIB";
    };

    const getTaskTypeLabel = (typeId) => {
        if (typeId === "lainnya" && task.jenis_tugas_lainnya) {
            return task.jenis_tugas_lainnya;
        }
        const found = TASK_TYPES?.find((t) => t.id === typeId);
        return found ? found.label : typeId;
    };

    const getStatusInfo = (statusKey) => {
        const key = statusKey?.toLowerCase();
        if (TASK_STATUS && TASK_STATUS[statusKey?.toUpperCase()]) {
            const s = TASK_STATUS[statusKey.toUpperCase()];
            return { label: s.label, color: s.color, icon: CheckCircle2 };
        }
        switch (key) {
            case "new":
                return { label: "New", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", icon: PlayCircle };
            case "on_progress":
                return { label: "On Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", icon: Clock };
            case "reject":
                return { label: "Reject", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", icon: XCircle };
            case "done":
                return { label: "Done", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", icon: CheckCircle2 };
            default:
                return { label: statusKey || "Unknown", color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300", icon: Clock };
        }
    };

    const currentStatus = getStatusInfo(task.status);
    const StatusIcon = currentStatus.icon;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                />

                {/* Dialog Content */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
                    className="relative w-full max-w-xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[90vh]"
                >
                    {/* Header */}
                    <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex flex-wrap items-center gap-2">
                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-100 dark:border-indigo-900/50">
                                    <BookOpen className="w-3.5 h-3.5 text-indigo-500" />
                                    {task.matkul}
                                </span>
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                    <Layers className="w-3.5 h-3.5 text-slate-400" />
                                    Pertemuan {task.pertemuan || "-"}
                                </span>
                            </div>

                            <button
                                onClick={onClose}
                                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                                aria-label="Tutup Dialog"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100 leading-snug">
                            {task.judul}
                        </h2>
                    </div>

                    {/* Scrollable Body */}
                    <div className="p-5 sm:p-6 overflow-y-auto space-y-5">
                        {/* Status & Remaining Banner */}
                        <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60">
                            <div className="flex items-center gap-2">
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${currentStatus.color}`}>
                                    <StatusIcon className="w-3.5 h-3.5" />
                                    {currentStatus.label}
                                </span>
                            </div>
                            {remaining && (
                                <span className={`inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full ${remaining.color}`}>
                                    {isOverdue && <AlertTriangle className="w-3.5 h-3.5" />}
                                    {isDone && <CheckCircle2 className="w-3.5 h-3.5" />}
                                    {!isOverdue && !isDone && <Clock className="w-3.5 h-3.5" />}
                                    {remaining.text}
                                </span>
                            )}
                        </div>

                        {/* Jenis Tugas */}
                        {task.jenis_tugas && task.jenis_tugas.length > 0 && (
                            <div>
                                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                                    <Tag className="w-3.5 h-3.5" />
                                    Jenis Tugas
                                </h3>
                                <div className="flex flex-wrap gap-1.5">
                                    {task.jenis_tugas.map((type, idx) => (
                                        <span
                                            key={idx}
                                            className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200/60 dark:border-slate-700/60"
                                        >
                                            <Tag className="w-3 h-3 text-indigo-500" />
                                            {getTaskTypeLabel(type)}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Deskripsi */}
                        <div>
                            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-2 flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5" />
                                Deskripsi & Instruksi
                            </h3>
                            <div className="bg-slate-50 dark:bg-slate-800/40 rounded-xl p-4 border border-slate-100 dark:border-slate-800 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line min-h-[70px]">
                                {task.deskripsi ? task.deskripsi : (
                                    <span className="text-slate-400 dark:text-slate-500 italic text-xs">
                                        Tidak ada deskripsi tambahan untuk tugas ini.
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Detail Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                            {/* Deadline Tanggal */}
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Calendar className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Tanggal Deadline</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                                        {formatDate(deadlineDate)}
                                    </p>
                                </div>
                            </div>

                            {/* Deadline Waktu */}
                            <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 shrink-0">
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Batas Jam</p>
                                    <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 truncate">
                                        {formatTime(deadlineDate)}
                                    </p>
                                </div>
                            </div>

                            {/* Waktu Pengingat */}
                            {task.waktu_pengingat && (
                                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <div className="p-2 rounded-lg bg-amber-50 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400 shrink-0">
                                        <Bell className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Waktu Pengingat</p>
                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5 capitalize">
                                            {task.waktu_pengingat.replace("_", " ")}
                                        </p>
                                    </div>
                                </div>
                            )}

                            {/* Kelas jika ada */}
                            {task.kelas && (
                                <div className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                                    <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 shrink-0">
                                        <Layers className="w-4 h-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Kelas</p>
                                        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 mt-0.5">
                                            {task.kelas}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Footer */}
                    <div className="p-4 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                        {/* Status Changer Quick Action */}
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Ubah Status:</span>
                            <select
                                value={task.status}
                                onChange={(e) => {
                                    if (onStatusChange) {
                                        onStatusChange(task.id, e.target.value);
                                    }
                                }}
                                className="text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                            >
                                <option value="new">New</option>
                                <option value="on_progress">On Progress</option>
                                <option value="reject">Reject</option>
                                <option value="done">Done</option>
                            </select>
                        </div>

                        {/* Action buttons */}
                        <div className="flex items-center justify-end gap-2">
                            {isAdmin && onEdit && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onEdit(task);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/50 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 rounded-lg transition-colors"
                                >
                                    <Edit3 className="w-3.5 h-3.5" />
                                    Edit
                                </button>
                            )}

                            {isAdmin && onDelete && (
                                <button
                                    onClick={() => {
                                        onClose();
                                        onDelete(task.id);
                                    }}
                                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/50 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition-colors"
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                    Hapus
                                </button>
                            )}

                            <button
                                onClick={onClose}
                                className="px-4 py-1.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            >
                                Tutup
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
