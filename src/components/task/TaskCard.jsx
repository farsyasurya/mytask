"use client";

import { useState } from "react";
import {
    BookOpen,
    Calendar,
    Clock,
    AlertTriangle,
    CheckCircle2,
    PlayCircle,
    XCircle,
    Layers,
    Tag,
    Eye,
    Edit3,
    Trash2
} from "lucide-react";
import { TASK_STATUS } from "@/constants/taskStatus";
import { TASK_TYPES } from "@/constants/taskTypes";
import { useAuth } from "@/hooks/useAuth";
import TaskDetailModal from "./TaskDetailModal";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, onDetail }) {
    const { userData } = useAuth();
    const isAdmin = userData?.role === "ADMIN";
    const [isDetailOpen, setIsDetailOpen] = useState(false);

    const isDone = task.status === "done";
    const deadlineDate = task.deadline?.seconds
        ? new Date(task.deadline.seconds * 1000)
        : task.deadline
            ? new Date(task.deadline)
            : null;

    const isOverdue = deadlineDate && deadlineDate < new Date() && !isDone;

    const formatDate = (date) => {
        if (!date || isNaN(date.getTime())) return "-";
        return date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const formatTime = (date) => {
        if (!date || isNaN(date.getTime())) return "-";
        return date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getTaskTypeLabel = (typeId) => {
        if (typeId === "lainnya" && task.jenis_tugas_lainnya) {
            return task.jenis_tugas_lainnya;
        }
        const found = TASK_TYPES?.find((t) => t.id === typeId);
        return found ? found.label : typeId;
    };

    // Fungsi pemeta warna dan ikon status secara presisi
    const getStatusInfo = (statusKey) => {
        const key = statusKey?.toLowerCase();

        if (TASK_STATUS && TASK_STATUS[statusKey?.toUpperCase()]) {
            const s = TASK_STATUS[statusKey.toUpperCase()];
            return { label: s.label, color: s.color, icon: CheckCircle2 };
        }

        switch (key) {
            case "new":
                return {
                    label: "New",
                    color: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/50",
                    icon: PlayCircle
                };
            case "on_progress":
                return {
                    label: "On Progress",
                    color: "bg-amber-50 text-amber-700 border-amber-200/60 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/50",
                    icon: Clock
                };
            case "reject":
                return {
                    label: "Reject",
                    color: "bg-rose-50 text-rose-700 border-rose-200/60 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/50",
                    icon: XCircle
                };
            case "done":
                return {
                    label: "Done",
                    color: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/50",
                    icon: CheckCircle2
                };
            default:
                return {
                    label: statusKey || "Unknown",
                    color: "bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700",
                    icon: Clock
                };
        }
    };

    const currentStatus = getStatusInfo(task.status);
    const StatusIcon = currentStatus.icon;

    const handleOpenDetail = () => {
        setIsDetailOpen(true);
        if (onDetail) {
            onDetail(task);
        }
    };

    return (
        <>
            <div className="group bg-white dark:bg-slate-900/90 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-5 shadow-sm hover:shadow-md hover:border-indigo-300/80 dark:hover:border-indigo-500/50 transition-all duration-200 flex flex-col justify-between">
                <div>
                    {/* Top Row: Course & Status */}
                    <div className="flex items-start justify-between gap-2 mb-3">
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-lg border border-indigo-100/80 dark:border-indigo-900/40">
                            <BookOpen className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[170px]">{task.matkul}</span>
                        </span>

                        {/* Status Badge */}
                        <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full border transition-colors ${currentStatus.color}`}>
                            <StatusIcon className="w-3 h-3 shrink-0" />
                            {currentStatus.label}
                        </span>
                    </div>

                    {/* Judul Task */}
                    <h3
                        onClick={handleOpenDetail}
                        className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1.5 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-2 transition-colors group-hover:text-indigo-600 dark:group-hover:text-indigo-400"
                        title={task.judul}
                    >
                        {task.judul}
                    </h3>

                    {/* Pertemuan */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 mb-3">
                        <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>Pertemuan {task.pertemuan || "-"}</span>
                    </div>

                    {/* Jenis Tugas Badges */}
                    {task.jenis_tugas && task.jenis_tugas.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-4">
                            {task.jenis_tugas.map((type, idx) => (
                                <span
                                    key={idx}
                                    className="inline-flex items-center gap-1 text-[11px] font-medium bg-slate-100/80 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded-md border border-slate-200/50 dark:border-slate-700/50"
                                >
                                    <Tag className="w-2.5 h-2.5 text-indigo-500/80 shrink-0" />
                                    {getTaskTypeLabel(type)}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer Section */}
                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80">
                    {/* Deadline & Overdue Warning */}
                    <div className="flex items-center justify-between mb-3 text-xs text-slate-600 dark:text-slate-400">
                        <div className="flex items-center gap-3">
                            <span className="inline-flex items-center gap-1 text-slate-600 dark:text-slate-400">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {formatDate(deadlineDate)}
                            </span>
                            <span className="inline-flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                {formatTime(deadlineDate)}
                            </span>
                        </div>

                        {isOverdue && (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 px-2 py-0.5 rounded-md border border-rose-100 dark:border-rose-900/40">
                                <AlertTriangle className="w-3 h-3 shrink-0" />
                                Terlambat
                            </span>
                        )}
                    </div>

                    {/* Bottom Action Controls */}
                    <div className="flex items-center justify-between gap-2">
                        {/* Status Select */}
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                            <select
                                value={task.status}
                                onChange={(e) => onStatusChange && onStatusChange(task.id, e.target.value)}
                                className="w-full text-xs font-semibold border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all hover:bg-slate-100 dark:hover:bg-slate-800"
                            >
                                <option value="new" className="dark:bg-slate-900">New</option>
                                <option value="on_progress" className="dark:bg-slate-900">On Progress</option>
                                <option value="reject" className="dark:bg-slate-900">Reject</option>
                                <option value="done" className="dark:bg-slate-900">Done</option>
                            </select>
                        </div>

                        {/* Action Buttons: Detail + Edit/Delete */}
                        <div className="flex items-center gap-1 shrink-0">
                            <button
                                onClick={handleOpenDetail}
                                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1.5 text-slate-700 dark:text-slate-200 bg-slate-100/90 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 rounded-lg transition-all"
                                title="Lihat Rincian Tugas"
                            >
                                <Eye className="w-3.5 h-3.5 text-indigo-500" />
                                <span>Detail</span>
                            </button>

                            {isAdmin && (
                                <>
                                    {onEdit && (
                                        <button
                                            onClick={() => onEdit(task)}
                                            className="p-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                                            title="Edit Tugas"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                    {onDelete && (
                                        <button
                                            onClick={() => onDelete(task.id)}
                                            className="p-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                            title="Hapus Tugas"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Task Detail Dialog Modal */}
            <TaskDetailModal
                isOpen={isDetailOpen}
                onClose={() => setIsDetailOpen(false)}
                task={task}
                onStatusChange={onStatusChange}
                onEdit={onEdit}
                onDelete={onDelete}
                isAdmin={isAdmin}
            />
        </>
    );
}