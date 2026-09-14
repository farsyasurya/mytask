"use client";

import { TASK_STATUS } from "@/constants/taskStatus";
import { TASK_TYPES } from "@/constants/taskTypes";
import { useAuth } from "@/hooks/useAuth";

export default function TaskCard({ task, onEdit, onDelete, onStatusChange, onDetail }) {
    const { userData } = useAuth();
    const isAdmin = userData?.role === "ADMIN";

    const isDone = task.status === "done";
    const deadlineDate = task.deadline?.seconds
        ? new Date(task.deadline.seconds * 1000)
        : new Date(task.deadline);

    const isOverdue = deadlineDate < new Date() && !isDone;

    const formatDate = (date) => {
        return date.toLocaleDateString("id-ID", {
            day: "numeric",
            month: "short",
            year: "numeric"
        });
    };

    const formatTime = (date) => {
        return date.toLocaleTimeString("id-ID", {
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getTaskTypeLabel = (typeId) => {
        if (typeId === "lainnya" && task.jenis_tugas_lainnya) {
            return task.jenis_tugas_lainnya;
        }
        const found = TASK_TYPES.find((t) => t.id === typeId);
        return found ? found.label : typeId;
    };

    // Fungsi pemeta warna status secara presisi
    const getStatusBadge = (statusKey) => {
        const key = statusKey?.toLowerCase();

        // 1. Cek jika terdefinisi di konstanta TASK_STATUS
        if (TASK_STATUS && TASK_STATUS[statusKey?.toUpperCase()]) {
            return TASK_STATUS[statusKey.toUpperCase()];
        }

        // 2. Fallback gaya warna default berdasarkan status
        switch (key) {
            case "new":
                return { label: "New", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" };
            case "on_progress":
                return { label: "On Progress", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300" };
            case "reject":
                return { label: "Reject", color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300" };
            case "done":
                return { label: "Done", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300" };
            default:
                return { label: statusKey || "Unknown", color: "bg-slate-100 text-slate-700" };
        }
    };

    const currentStatus = getStatusBadge(task.status);

    return (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
            <div>
                <div className="flex justify-between items-start mb-2 gap-2">
                    <span className="text-xs font-semibold px-2.5 py-1 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 rounded-md">
                        📚 {task.matkul}
                    </span>

                    {/* Badge Status Dinamis */}
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full transition-colors ${currentStatus.color}`}>
                        {currentStatus.label}
                    </span>
                </div>

                <h3
                    onClick={() => onDetail && onDetail(task)}
                    className="text-base font-bold text-slate-900 dark:text-slate-100 mb-1 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer line-clamp-2 transition-colors"
                >
                    {task.judul}
                </h3>

                <p className="text-xs text-slate-500 dark:text-slate-400 mb-3">Pertemuan {task.pertemuan}</p>

                <div className="flex flex-wrap gap-1 mb-4">
                    {task.jenis_tugas?.map((type, idx) => (
                        <span key={idx} className="text-[11px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-2 py-0.5 rounded">
                            ☑ {getTaskTypeLabel(type)}
                        </span>
                    ))}
                </div>
            </div>

            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="flex justify-between items-center mb-3 text-xs text-slate-600 dark:text-slate-400">
                    <div>
                        <span>📅 {formatDate(deadlineDate)}</span>
                        <span className="ml-2">⏰ {formatTime(deadlineDate)}</span>
                    </div>
                    {isOverdue && (
                        <span className="text-xs font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/50 dark:text-rose-400 px-2 py-0.5 rounded">
                            ⚠️ Terlambat
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5 flex-1">
                        <span className="text-[11px] font-medium text-slate-400 dark:text-slate-500">Status:</span>
                        <select
                            value={task.status}
                            onChange={(e) => onStatusChange && onStatusChange(task.id, e.target.value)}
                            className="text-xs font-semibold border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer transition-all"
                        >
                            <option value="new" className="dark:bg-slate-900">New</option>
                            <option value="on_progress" className="dark:bg-slate-900">On Progress</option>
                            <option value="reject" className="dark:bg-slate-900">Reject</option>
                            <option value="done" className="dark:bg-slate-900">Done</option>
                        </select>
                    </div>

                    {isAdmin && (
                        <div className="flex items-center gap-1">
                            {onEdit && (
                                <button
                                    onClick={() => onEdit(task)}
                                    className="text-xs font-medium px-2.5 py-1.5 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-lg transition-colors"
                                >
                                    Edit
                                </button>
                            )}
                            {onDelete && (
                                <button
                                    onClick={() => onDelete(task.id)}
                                    className="text-xs font-medium px-2.5 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                                >
                                    Hapus
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}