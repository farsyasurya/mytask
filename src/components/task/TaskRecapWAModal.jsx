"use client";

import { useState, useEffect, useMemo } from "react";
import {
    X,
    MessageSquare,
    Copy,
    Check,
    Share2,
    Calendar,
    Clock,
    BookOpen,
    Users,
    CheckSquare,
    Square,
    Filter,
    FileText,
    Send,
    AlertCircle,
    CheckCircle2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskRecapWAModal({
    isOpen,
    onClose,
    tasks = [],
    initialSelectedKeys = [],
    kelas = "01TPLE002"
}) {
    // Selected task keys
    const [selectedKeys, setSelectedKeys] = useState([]);
    const [includeDeadlines, setIncludeDeadlines] = useState(true);
    const [includeProgress, setIncludeProgress] = useState(true);
    const [includePendingStudents, setIncludePendingStudents] = useState(true);
    const [includeAppUrl, setIncludeAppUrl] = useState(true);
    const [customNote, setCustomNote] = useState("Mohon bagi yang belum agar segera menyelesaikan tugas di aplikasi TASKIFY! 🙏");
    const [copied, setCopied] = useState(false);
    const [activeTab, setActiveTab] = useState("selection"); // "selection" | "preview" for mobile
    const [searchFilter, setSearchFilter] = useState("");

    // Initialize selection when opened
    useEffect(() => {
        if (isOpen) {
            if (initialSelectedKeys && initialSelectedKeys.length > 0) {
                setSelectedKeys(initialSelectedKeys);
            } else {
                // Default: select all tasks
                setSelectedKeys(tasks.map((t) => t.groupKey));
            }
            setActiveTab("selection");
            setCopied(false);
        }
    }, [isOpen, initialSelectedKeys, tasks]);

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

    // Filter tasks based on internal search filter
    const displayedTasks = useMemo(() => {
        if (!searchFilter.trim()) return tasks;
        const q = searchFilter.toLowerCase().trim();
        return tasks.filter(
            (t) =>
                t.judul?.toLowerCase().includes(q) ||
                t.matkul?.toLowerCase().includes(q) ||
                String(t.pertemuan).includes(q)
        );
    }, [tasks, searchFilter]);

    // Toggle individual task selection
    const handleToggleTask = (key) => {
        setSelectedKeys((prev) =>
            prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
        );
    };

    // Quick selection helpers
    const handleSelectAll = () => {
        setSelectedKeys(tasks.map((t) => t.groupKey));
    };

    const handleSelectIncompleteOnly = () => {
        const incomplete = tasks.filter((t) => t.progressPercent < 100).map((t) => t.groupKey);
        setSelectedKeys(incomplete);
    };

    const handleDeselectAll = () => {
        setSelectedKeys([]);
    };

    // Format Date & Time helper
    const formatDateTime = (rawDate) => {
        if (!rawDate) return "-";
        const dateObj = rawDate.seconds
            ? new Date(rawDate.seconds * 1000)
            : new Date(rawDate);

        return dateObj.toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short"
        }) + " WIB";
    };

    // Generate WhatsApp text
    const waText = useMemo(() => {
        const selectedTasks = tasks.filter((t) => selectedKeys.includes(t.groupKey));
        if (selectedTasks.length === 0) {
            return "Pilih minimal 1 tugas untuk membuat rekap WhatsApp.";
        }

        const todayStr = new Intl.DateTimeFormat("id-ID", {
            dateStyle: "full",
            timeStyle: "short",
            timeZone: "Asia/Jakarta"
        }).format(new Date()) + " WIB";

        let text = `📢 *REKAP TUGAS KELAS ${kelas.toUpperCase()}*\n`;
        text += `🗓️ ${todayStr}\n`;
        text += `📊 Total: ${selectedTasks.length} Tugas Dipilih\n`;
        text += `═══════════════════════\n\n`;

        selectedTasks.forEach((t, index) => {
            text += `📌 *${index + 1}. ${t.matkul.toUpperCase()}*\n`;
            text += `📝 *Tugas:* ${t.judul}\n`;
            text += `📖 *Pertemuan:* Ke-${t.pertemuan}\n`;

            if (includeDeadlines && t.deadline) {
                text += `⏰ *Deadline:* ${formatDateTime(t.deadline)}\n`;
            }

            if (includeProgress) {
                text += `📈 *Progress:* ${t.doneCount}/${t.totalStudents} Mahasiswa (${t.progressPercent}%)\n`;
            }

            if (includePendingStudents) {
                const pending = (t.studentStatuses || []).filter((s) => s.status !== "done");
                if (pending.length === 0) {
                    text += `✅ *Status:* Semua mahasiswa sudah mengumpulkan! 🎉\n`;
                } else {
                    text += `❌ *Belum Selesai (${pending.length} Mahasiswa):*\n`;
                    pending.forEach((p, pIdx) => {
                        let statusNote = "";
                        if (p.status === "on_progress") statusNote = " [on progress]";
                        if (p.status === "reject") statusNote = " [perlu perbaikan]";
                        text += `  • ${p.name}${statusNote}\n`;
                    });
                }
            }

            text += `\n───────────────────────\n\n`;
        });

        if (customNote.trim()) {
            text += `💬 *Pesan Admin:*\n${customNote.trim()}\n\n`;
        }

        if (includeAppUrl) {
            text += `📲 *Akses Aplikasi TASKIFY:*\nhttps://fartaskify.netlify.app/tasks\n`;
        }

        return text.trim();
    }, [
        tasks,
        selectedKeys,
        kelas,
        includeDeadlines,
        includeProgress,
        includePendingStudents,
        includeAppUrl,
        customNote
    ]);

    // Action handlers
    const handleSendWA = () => {
        if (selectedKeys.length === 0) {
            alert("Pilih minimal satu tugas terlebih dahulu.");
            return;
        }
        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(waText)}`;
        window.open(waUrl, "_blank");
    };

    const handleCopy = async () => {
        if (selectedKeys.length === 0) return;
        try {
            await navigator.clipboard.writeText(waText);
            setCopied(true);
            setTimeout(() => setCopied(false), 2500);
        } catch (err) {
            console.error("Gagal menyalin teks:", err);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                />

                {/* Modal Window */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 15 }}
                    transition={{ type: "spring", duration: 0.3, bounce: 0.1 }}
                    className="relative w-full max-w-4xl bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden z-10 flex flex-col max-h-[92vh]"
                >
                    {/* Header */}
                    <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                <MessageSquare className="w-5 h-5" />
                            </div>
                            <div>
                                <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    Pilih Rekap Tugas & Kirim via WhatsApp
                                </h2>
                                <p className="text-xs text-slate-500 dark:text-slate-400">
                                    Kelas <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">{kelas}</span> • {selectedKeys.length} dari {tasks.length} tugas dipilih
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Mobile Switch Tab (Pilih Tugas vs Preview) */}
                    <div className="flex md:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900">
                        <button
                            onClick={() => setActiveTab("selection")}
                            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${activeTab === "selection"
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800/50"
                                : "border-transparent text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            Pilih Tugas & Opsi ({selectedKeys.length})
                        </button>
                        <button
                            onClick={() => setActiveTab("preview")}
                            className={`flex-1 py-2.5 text-xs font-semibold text-center border-b-2 transition-colors ${activeTab === "preview"
                                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-white dark:bg-slate-800/50"
                                : "border-transparent text-slate-500 dark:text-slate-400"
                                }`}
                        >
                            Preview Pesan WA
                        </button>
                    </div>

                    {/* Content Body: 2 Columns on Desktop */}
                    <div className="flex-1 overflow-hidden grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
                        {/* LEFT COLUMN: Task Checklist & Options */}
                        <div
                            className={`md:col-span-6 lg:col-span-7 flex flex-col h-full overflow-hidden ${activeTab === "preview" ? "hidden md:flex" : "flex"
                                }`}
                        >
                            {/* Quick selection bar */}
                            <div className="p-3.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-2.5">
                                <div className="flex flex-wrap items-center justify-between gap-2">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                        Pilih Tugas ({selectedKeys.length}/{tasks.length})
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={handleSelectAll}
                                            className="px-2 py-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 rounded-md transition-colors"
                                        >
                                            Pilih Semua
                                        </button>
                                        <button
                                            onClick={handleSelectIncompleteOnly}
                                            className="px-2 py-1 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 rounded-md transition-colors"
                                        >
                                            Belum 100%
                                        </button>
                                        <button
                                            onClick={handleDeselectAll}
                                            className="px-2 py-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-md transition-colors"
                                        >
                                            Batal
                                        </button>
                                    </div>
                                </div>

                                {/* Internal search filter */}
                                <input
                                    type="text"
                                    placeholder="Cari tugas di daftar..."
                                    value={searchFilter}
                                    onChange={(e) => setSearchFilter(e.target.value)}
                                    className="w-full text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                                />
                            </div>

                            {/* Task List Scrollable */}
                            <div className="flex-1 overflow-y-auto p-3.5 space-y-2 max-h-[300px] md:max-h-[360px]">
                                {displayedTasks.length === 0 ? (
                                    <div className="text-center py-8 text-xs text-slate-400">
                                        Tidak ada tugas yang sesuai.
                                    </div>
                                ) : (
                                    displayedTasks.map((task) => {
                                        const isSelected = selectedKeys.includes(task.groupKey);
                                        const isComplete = task.progressPercent >= 100;

                                        return (
                                            <div
                                                key={task.groupKey}
                                                onClick={() => handleToggleTask(task.groupKey)}
                                                className={`p-3 rounded-xl border transition-all cursor-pointer flex items-start gap-3 select-none ${isSelected
                                                    ? "border-emerald-400 bg-emerald-50/40 dark:border-emerald-500/50 dark:bg-emerald-950/20"
                                                    : "border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                                                    }`}
                                            >
                                                <div className="pt-0.5">
                                                    {isSelected ? (
                                                        <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-slate-400 shrink-0" />
                                                    )}
                                                </div>

                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-0.5">
                                                        <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 truncate">
                                                            {task.matkul}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 font-mono">
                                                            P-{task.pertemuan}
                                                        </span>
                                                    </div>

                                                    <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug truncate">
                                                        {task.judul}
                                                    </h4>

                                                    <div className="flex items-center justify-between gap-2 mt-1.5 text-[11px]">
                                                        <span className="text-slate-500 dark:text-slate-400 text-[10px]">
                                                            Deadline: {task.deadline ? formatDateTime(task.deadline).split("WIB")[0] : "-"}
                                                        </span>

                                                        <span
                                                            className={`font-semibold font-mono text-[10px] px-1.5 py-0.5 rounded ${isComplete
                                                                ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300"
                                                                : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                                                                }`}
                                                        >
                                                            {task.doneCount}/{task.totalStudents} ({task.progressPercent}%)
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })
                                )}
                            </div>

                            {/* Options section */}
                            <div className="p-3.5 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/20 space-y-3">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block">
                                    Opsi Format Pesan WhatsApp:
                                </span>

                                <div className="grid grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={includeDeadlines}
                                            onChange={(e) => setIncludeDeadlines(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Sertakan Deadline</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={includeProgress}
                                            onChange={(e) => setIncludeProgress(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Sertakan Progress (%)</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={includePendingStudents}
                                            onChange={(e) => setIncludePendingStudents(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Daftar Mahasiswa Belum</span>
                                    </label>

                                    <label className="flex items-center gap-2 cursor-pointer select-none">
                                        <input
                                            type="checkbox"
                                            checked={includeAppUrl}
                                            onChange={(e) => setIncludeAppUrl(e.target.checked)}
                                            className="rounded text-emerald-600 focus:ring-emerald-500"
                                        />
                                        <span>Sertakan Link App</span>
                                    </label>
                                </div>

                                {/* Custom Note */}
                                <div>
                                    <label className="block text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1">
                                        Catatan Tambahan untuk Mahasiswa:
                                    </label>
                                    <textarea
                                        rows={2}
                                        value={customNote}
                                        onChange={(e) => setCustomNote(e.target.value)}
                                        placeholder="Tulis pesan pengingat..."
                                        className="w-full text-xs p-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500 text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* RIGHT COLUMN: WhatsApp Live Preview */}
                        <div
                            className={`md:col-span-6 lg:col-span-5 flex flex-col h-full bg-slate-100/70 dark:bg-slate-950/60 overflow-hidden ${activeTab === "selection" ? "hidden md:flex" : "flex"
                                }`}
                        >
                            <div className="p-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <MessageSquare className="w-3.5 h-3.5 text-emerald-500" />
                                    Live Preview WhatsApp
                                </span>
                                <span className="text-[11px] text-slate-400">
                                    {selectedKeys.length} tugas termuat
                                </span>
                            </div>

                            {/* WhatsApp bubble mockup */}
                            <div className="flex-1 p-3 sm:p-4 overflow-y-auto">
                                <div className="bg-[#DCF8C6] dark:bg-emerald-950/70 text-slate-900 dark:text-slate-100 rounded-2xl rounded-tr-none p-3.5 sm:p-4 shadow-sm border border-emerald-200/60 dark:border-emerald-800/50 text-xs font-sans whitespace-pre-wrap leading-relaxed select-text">
                                    {waText}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Modal Footer Actions */}
                    <div className="p-3.5 sm:p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-wrap items-center justify-between gap-2">
                        <div className="text-xs text-slate-500 dark:text-slate-400">
                            {selectedKeys.length === 0 ? (
                                <span className="text-rose-500 font-medium">⚠️ Pilih minimal 1 tugas untuk dikirim</span>
                            ) : (
                                <span>Siap dikirim ke WhatsApp Group Kelas <strong>{kelas}</strong></span>
                            )}
                        </div>

                        <div className="flex items-center gap-2 ml-auto">
                            <button
                                onClick={handleCopy}
                                disabled={selectedKeys.length === 0}
                                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-all disabled:opacity-50"
                            >
                                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
                                <span>{copied ? "Tersalin!" : "Salin Teks"}</span>
                            </button>

                            <button
                                onClick={handleSendWA}
                                disabled={selectedKeys.length === 0}
                                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 active:scale-95 rounded-xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:pointer-events-none"
                            >
                                <Send className="w-3.5 h-3.5" />
                                <span>Kirim via WA</span>
                            </button>
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
