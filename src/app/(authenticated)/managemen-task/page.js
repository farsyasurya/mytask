"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MATA_KULIAH } from "@/constants/mataKuliah";
import { KELAS_OPTIONS } from "@/constants/kelas";
import {
    getAdminManagementTasks,
    updateAdminTaskGroup,
    deleteAdminTaskGroup
} from "@/services/taskService";
import TaskModal from "@/components/task/TaskModal";
import {
    ClipboardList,
    CheckCircle2,
    XCircle,
    Clock,
    Share2,
    Users,
    BookOpen,
    Layers,
    Search,
    AlertCircle,
    User,
    UserCheck,
    X,
    Calendar,
    FileText,
    Sparkles,
    Edit3,
    Trash2
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import PeriodFilter, { filterItemsByPeriod } from "@/components/common/PeriodFilter";
import Pagination from "@/components/common/Pagination";
import MobileFilterDialog from "@/components/common/MobileFilterDialog";

export default function ManagemenTaskPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();

    const [kelas, setKelas] = useState(KELAS_OPTIONS[0] || "");
    const [filterMatkul, setFilterMatkul] = useState("");
    const [filterPertemuan, setFilterPertemuan] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    // Period Filter State
    const [selectedPeriod, setSelectedPeriod] = useState("all");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(10);

    const [tasksData, setTasksData] = useState([]);
    const [loading, setLoading] = useState(true);

    // State untuk Modal Rincian Status Mahasiswa pada Tugas Spesifik
    const [selectedTaskModal, setSelectedTaskModal] = useState(null);

    // State untuk Modal Edit Tugas Admin
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);

    const handleEditTaskGroup = (taskGroup) => {
        setTaskToEdit({
            ...taskGroup,
            id: taskGroup.groupKey
        });
        setIsEditModalOpen(true);
    };

    const handleSaveEditedTaskGroup = async (formData) => {
        if (!taskToEdit) return;
        try {
            await updateAdminTaskGroup(
                taskToEdit.groupKey,
                taskToEdit.broadcast_id,
                taskToEdit.kelas || kelas,
                formData
            );
            setIsEditModalOpen(false);
            setTaskToEdit(null);
            await fetchData();
        } catch (err) {
            console.error("Gagal memperbarui tugas:", err);
            alert("Gagal memperbarui tugas: " + (err.message || err));
        }
    };

    const handleDeleteTaskGroup = async (taskGroup) => {
        const confirmMsg = `Hapus tugas "${taskGroup.judul}"?\n\nTugas ini beserta seluruh data pengerjaan mahasiswa kelas ${taskGroup.kelas || kelas} akan dihapus secara permanen.`;
        if (window.confirm(confirmMsg)) {
            try {
                await deleteAdminTaskGroup(
                    taskGroup.groupKey,
                    taskGroup.broadcast_id,
                    taskGroup.kelas || kelas
                );
                await fetchData();
            } catch (err) {
                console.error("Gagal menghapus tugas:", err);
                alert("Gagal menghapus tugas: " + (err.message || err));
            }
        }
    };

    // Reset page on filter changes
    useEffect(() => {
        setCurrentPage(1);
    }, [kelas, filterMatkul, filterPertemuan, searchQuery, selectedPeriod, customStartDate, customEndDate]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getAdminManagementTasks(kelas);
            setTasksData(data || []);
        } catch (err) {
            console.error("Gagal mengambil data rekap manajemen task:", err);
        } finally {
            setLoading(false);
        }
    }, [kelas]);

    useEffect(() => {
        if (userData?.role === "ADMIN") {
            fetchData();
        }
    }, [userData, fetchData]);

    // Sinkronkan default kelas ke kelas milik Admin
    useEffect(() => {
        if (userData?.kelas) {
            setKelas(userData.kelas);
        }
    }, [userData?.kelas]);

    // Filtering tugas berdasarkan Mata Kuliah, Pertemuan, Search Judul, dan Periode
    const initialFiltered = tasksData.filter((t) => {
        if (filterMatkul && t.matkul !== filterMatkul) return false;
        if (filterPertemuan && parseInt(t.pertemuan, 10) !== parseInt(filterPertemuan, 10)) return false;

        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase().trim();
            const match =
                t.judul.toLowerCase().includes(q) ||
                t.matkul.toLowerCase().includes(q) ||
                t.deskripsi.toLowerCase().includes(q);
            if (!match) return false;
        }

        return true;
    });

    const filteredTasks = filterItemsByPeriod(initialFiltered, selectedPeriod, (t) => t.deadline, customStartDate, customEndDate);
    const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
    const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const totalTasksCount = tasksData.length;

    // Helper Format Tanggal & Waktu Indonesia
    const formatDateTime = (rawDate) => {
        if (!rawDate) return "-";
        const dateObj = rawDate.seconds
            ? new Date(rawDate.seconds * 1000)
            : new Date(rawDate);

        return dateObj.toLocaleString("id-ID", {
            dateStyle: "medium",
            timeStyle: "short"
        });
    };

    // Helper Share Rekap WA per Tugas Spesifik
    const handleShareWATask = (taskGroup) => {
        const formattedDeadline = formatDateTime(taskGroup.deadline);

        const doneStudents = taskGroup.studentStatuses.filter((s) => s.status === "done");
        const pendingStudents = taskGroup.studentStatuses.filter((s) => s.status !== "done");

        const doneText = doneStudents.length > 0
            ? doneStudents.map((s, idx) => `${idx + 1}. ${s.name}`).join("\n")
            : "- Tidak ada -";

        const pendingText = pendingStudents.length > 0
            ? pendingStudents.map((s, idx) => {
                let statusLabel = "Belum dikerjakan (new)";
                if (s.status === "on_progress") statusLabel = "Sedang dikerjakan (on progress)";
                if (s.status === "reject") statusLabel = "Perlu perbaikan (reject)";

                const lastUpd = formatDateTime(s.updatedAt);
                return `${idx + 1}. ${s.name} [Status: ${statusLabel} | Update: ${lastUpd}]`;
            }).join("\n")
            : "- Semua mahasiswa sudah menyelesaikan! 🎉 -";

        const text =
            `📌 *REKAP TUGAS: ${taskGroup.judul}*\n` +
            `🏫 *Kelas:* ${taskGroup.kelas}\n` +
            `📚 *Mata Kuliah:* ${taskGroup.matkul}\n` +
            `📖 *Pertemuan:* Ke-${taskGroup.pertemuan}\n` +
            `⏰ *Deadline:* ${formattedDeadline} WIB\n` +
            `📈 *Progress Selesai:* ${taskGroup.doneCount}/${taskGroup.totalStudents} Mahasiswa (${taskGroup.progressPercent}%)\n` +
            `----------------------------------\n\n` +
            `✅ *SUDAH MENGERJAKAN (${doneStudents.length}):*\n${doneText}\n\n` +
            `❌ *BELUM MENGERJAKAN (${pendingStudents.length}):*\n${pendingText}\n\n` +
            `👉 *Diharapkan mahasiswa yang belum segera menyelesaikan tugas di aplikasi TASKIFY!* 🙏`;

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(waUrl, "_blank");
    };

    if (authLoading) {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
            </div>
        );
    }

    if (userData?.role !== "ADMIN") {
        return (
            <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center">
                <div className="p-4 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 mb-4">
                    <AlertCircle className="w-10 h-10" />
                </div>
                <h1 className="text-xl font-bold mb-2">Akses Ditolak</h1>
                <p className="text-sm text-slate-500 max-w-md mb-6">
                    Halaman Managemen Task ini khusus untuk **ADMIN**.
                </p>
                <button
                    onClick={() => router.push("/dashboard")}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition-colors"
                >
                    Kembali ke Beranda
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <ClipboardList className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Managemen Task Kelas (Admin)
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Daftar seluruh tugas yang ditambahkan Admin beserta rekap status pengerjaan mahasiswa
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => router.push("/task-admin")}
                        className="inline-flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white font-medium rounded-xl text-xs sm:text-sm transition-all shadow-md shadow-indigo-600/20"
                    >
                        + Tambah Tugas Baru
                    </button>
                </div>
            </div>

            {/* Filter Bar with Mobile Dialog Wrapper */}
            <div className="bg-white dark:bg-slate-900 p-4 sm:p-5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-4">
                <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        Filter & Pencarian Task
                    </span>
                    <MobileFilterDialog title="Filter" activeCount={(filterMatkul || filterPertemuan || selectedPeriod !== "all") ? 1 : 0}>
                        <div className="space-y-4">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-3 border-b border-slate-100 dark:border-slate-800">
                                <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                    Filter Periode Deadline:
                                </span>
                                <PeriodFilter
                                    selectedPeriod={selectedPeriod}
                                    onPeriodChange={setSelectedPeriod}
                                    customStartDate={customStartDate}
                                    customEndDate={customEndDate}
                                    onStartDateChange={setCustomStartDate}
                                    onEndDateChange={setCustomEndDate}
                                />
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                {/* Kelas Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                                        <Users className="w-3.5 h-3.5 text-indigo-500" /> Kelas Target
                                    </label>
                                    <select
                                        value={kelas}
                                        onChange={(e) => setKelas(e.target.value)}
                                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer font-medium"
                                    >
                                        {KELAS_OPTIONS.map((k) => (
                                            <option key={k} value={k} className="dark:bg-slate-900">
                                                Kelas {k}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Matkul Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                                        <BookOpen className="w-3.5 h-3.5 text-indigo-500" /> Filter Mata Kuliah
                                    </label>
                                    <select
                                        value={filterMatkul}
                                        onChange={(e) => setFilterMatkul(e.target.value)}
                                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer font-medium"
                                    >
                                        <option value="" className="dark:bg-slate-900">Semua Mata Kuliah</option>
                                        {MATA_KULIAH.map((m) => (
                                            <option key={m} value={m} className="dark:bg-slate-900">
                                                {m}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                {/* Pertemuan Filter */}
                                <div>
                                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5 flex items-center gap-1">
                                        <Layers className="w-3.5 h-3.5 text-indigo-500" /> Filter Pertemuan
                                    </label>
                                    <select
                                        value={filterPertemuan}
                                        onChange={(e) => setFilterPertemuan(e.target.value)}
                                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer font-medium"
                                    >
                                        <option value="" className="dark:bg-slate-900">Semua Pertemuan</option>
                                        {[...Array(14)].map((_, i) => (
                                            <option key={i + 1} value={i + 1} className="dark:bg-slate-900">
                                                Pertemuan {i + 1}
                                            </option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                    </MobileFilterDialog>
                </div>

                {/* Search Bar */}
                <div className="relative flex items-center pt-2 border-t border-slate-100 dark:border-slate-800">
                    <Search className="w-4 h-4 absolute left-3.5 text-slate-400" />
                    <input
                        type="text"
                        placeholder="Cari tugas berdasarkan judul atau deskripsi..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                </div>
            </div>

            {/* Management Tasks Table */}
            {loading ? (
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 animate-pulse space-y-4">
                    {[...Array(4)].map((_, i) => (
                        <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl w-full" />
                    ))}
                </div>
            ) : filteredTasks.length === 0 ? (
                <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center">
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mb-4">
                        Belum ada tugas yang ditambahkan Admin untuk Kelas {kelas}.
                    </p>
                    <button
                        onClick={() => router.push("/task-admin")}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        Buat Tugas Pertama
                    </button>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-4">
                    {/* DESKTOP VIEW: Table */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                                    <th className="py-3.5 px-4">Mata Kuliah & Judul Tugas</th>
                                    <th className="py-3.5 px-4">Pertemuan</th>
                                    <th className="py-3.5 px-4">Deadline</th>
                                    <th className="py-3.5 px-4">Kelas</th>
                                    <th className="py-3.5 px-4 text-center">Progress Selesai</th>
                                    <th className="py-3.5 px-4 text-right">Aksi</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                                {paginatedTasks.map((taskGroup) => {
                                    return (
                                        <tr key={taskGroup.groupKey} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                                            {/* Mata Kuliah & Judul Tugas */}
                                            <td className="py-3.5 px-4">
                                                <div className="font-bold text-slate-900 dark:text-slate-100">
                                                    {taskGroup.judul}
                                                </div>
                                                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                                    {taskGroup.matkul}
                                                </div>
                                            </td>

                                            {/* Pertemuan */}
                                            <td className="py-3.5 px-4 font-semibold text-slate-700 dark:text-slate-300">
                                                Pertemuan {taskGroup.pertemuan}
                                            </td>

                                            {/* Deadline */}
                                            <td className="py-3.5 px-4 text-rose-600 dark:text-rose-400 font-medium text-xs">
                                                {formatDateTime(taskGroup.deadline)}
                                            </td>

                                            {/* Kelas */}
                                            <td className="py-3.5 px-4 font-mono text-xs">
                                                {taskGroup.kelas}
                                            </td>

                                            {/* Progress Selesai */}
                                            <td className="py-3.5 px-4 text-center">
                                                <div className="inline-flex flex-col items-center gap-1">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                                                            <div
                                                                className={`h-full transition-all rounded-full ${taskGroup.progressPercent === 100
                                                                    ? "bg-emerald-500"
                                                                    : taskGroup.progressPercent > 0
                                                                        ? "bg-amber-500"
                                                                        : "bg-rose-500"
                                                                    }`}
                                                                style={{ width: `${taskGroup.progressPercent}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-bold text-xs font-mono">
                                                            {taskGroup.progressPercent}%
                                                        </span>
                                                    </div>
                                                    <span className="text-[10px] text-slate-400">
                                                        {taskGroup.doneCount} / {taskGroup.totalStudents} Mahasiswa
                                                    </span>
                                                </div>
                                            </td>

                                            {/* Aksi: User Check, Edit, Delete, Share WA */}
                                            <td className="py-3.5 px-4 text-right">
                                                <div className="inline-flex items-center gap-1.5 justify-end">
                                                    {/* Icon User Button */}
                                                    <button
                                                        onClick={() => setSelectedTaskModal(taskGroup)}
                                                        className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900 text-indigo-600 dark:text-indigo-400 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1 text-xs font-semibold"
                                                        title="Lihat Status Pengerjaan Mahasiswa"
                                                    >
                                                        <UserCheck className="w-4 h-4" />
                                                        <span className="hidden lg:inline">Status</span>
                                                    </button>

                                                    {/* Tombol Edit */}
                                                    <button
                                                        onClick={() => handleEditTaskGroup(taskGroup)}
                                                        className="p-2 rounded-xl bg-amber-50 dark:bg-amber-950/60 hover:bg-amber-100 dark:hover:bg-amber-900 text-amber-600 dark:text-amber-400 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1 text-xs font-semibold"
                                                        title="Edit Tugas Ini"
                                                    >
                                                        <Edit3 className="w-4 h-4" />
                                                        <span className="hidden lg:inline">Edit</span>
                                                    </button>

                                                    {/* Tombol Hapus */}
                                                    <button
                                                        onClick={() => handleDeleteTaskGroup(taskGroup)}
                                                        className="p-2 rounded-xl bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-400 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1 text-xs font-semibold"
                                                        title="Hapus Tugas Ini"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                        <span className="hidden lg:inline">Hapus</span>
                                                    </button>

                                                    {/* Tombol WA khusus Tugas Ini */}
                                                    <button
                                                        onClick={() => handleShareWATask(taskGroup)}
                                                        className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900 text-emerald-600 dark:text-emerald-400 transition-all active:scale-95 shadow-sm inline-flex items-center gap-1 text-xs font-semibold"
                                                        title="Bagikan Rekap Tugas ke WhatsApp Group"
                                                    >
                                                        <Share2 className="w-4 h-4" />
                                                        <span className="hidden lg:inline">Share WA</span>
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* MOBILE VIEW: Cards */}
                    <div className="block md:hidden space-y-3">
                        {paginatedTasks.map((taskGroup) => (
                            <div
                                key={taskGroup.groupKey}
                                className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                            >
                                <div className="flex justify-between items-start gap-2">
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                                                {taskGroup.matkul}
                                            </span>
                                            <span className="text-[10px] text-slate-400 font-mono">
                                                Pertemuan {taskGroup.pertemuan}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm">
                                            {taskGroup.judul}
                                        </h4>
                                    </div>

                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => setSelectedTaskModal(taskGroup)}
                                            className="p-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400"
                                            title="Status Mahasiswa"
                                        >
                                            <UserCheck className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEditTaskGroup(taskGroup)}
                                            className="p-1.5 rounded-xl bg-amber-50 dark:bg-amber-950 text-amber-600 dark:text-amber-400"
                                            title="Edit Tugas"
                                        >
                                            <Edit3 className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleDeleteTaskGroup(taskGroup)}
                                            className="p-1.5 rounded-xl bg-rose-50 dark:bg-rose-950 text-rose-600 dark:text-rose-400"
                                            title="Hapus Tugas"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Deadline:</span>
                                        <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                                            {formatDateTime(taskGroup.deadline)}
                                        </span>
                                    </div>

                                    <div className="flex justify-between items-center text-xs">
                                        <span className="text-slate-500">Progress Selesai:</span>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-14 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full rounded-full ${taskGroup.progressPercent === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                                                    style={{ width: `${taskGroup.progressPercent}%` }}
                                                />
                                            </div>
                                            <span className="font-bold text-xs font-mono">{taskGroup.progressPercent}%</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                    <span className="text-[10px] text-slate-400">
                                        {taskGroup.doneCount} / {taskGroup.totalStudents} Mahasiswa
                                    </span>
                                    <button
                                        onClick={() => handleShareWATask(taskGroup)}
                                        className="px-3 py-1.5 rounded-xl bg-emerald-600 text-white font-semibold text-xs inline-flex items-center gap-1 shadow-sm"
                                    >
                                        <Share2 className="w-3.5 h-3.5" />
                                        Share WA
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <Pagination
                        currentPage={currentPage}
                        totalPages={totalPages}
                        onPageChange={setCurrentPage}
                        pageSize={pageSize}
                        onPageSizeChange={setPageSize}
                        totalItems={filteredTasks.length}
                    />
                </div>
            )}

            {/* Dialog Modal Status Pengerjaan Mahasiswa pada Tugas Ini */}
            <AnimatePresence>
                {selectedTaskModal && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 p-6 max-w-3xl w-full shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto"
                        >
                            {/* Modal Header */}
                            <div className="flex justify-between items-start border-b border-slate-100 dark:border-slate-800 pb-4">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                                            {selectedTaskModal.matkul}
                                        </span>
                                        <span className="text-xs text-slate-400 font-mono">
                                            Pertemuan {selectedTaskModal.pertemuan}
                                        </span>
                                    </div>
                                    <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-slate-100">
                                        {selectedTaskModal.judul}
                                    </h2>
                                    <p className="text-xs text-slate-500 dark:text-slate-400">
                                        Kelas: <span className="font-semibold text-slate-800 dark:text-slate-200">{selectedTaskModal.kelas}</span> • Deadline: <span className="text-rose-600 dark:text-rose-400 font-medium">{formatDateTime(selectedTaskModal.deadline)} WIB</span>
                                    </p>
                                </div>

                                <button
                                    onClick={() => setSelectedTaskModal(null)}
                                    className="p-1.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Status Stats Summary */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-center">
                                <div>
                                    <p className="text-[11px] text-slate-500">Done (Selesai)</p>
                                    <p className="text-base font-bold text-emerald-600 dark:text-emerald-400">{selectedTaskModal.doneCount}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">On Progress</p>
                                    <p className="text-base font-bold text-amber-600 dark:text-amber-400">{selectedTaskModal.onProgressCount}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">New (Belum)</p>
                                    <p className="text-base font-bold text-blue-600 dark:text-blue-400">{selectedTaskModal.newCount}</p>
                                </div>
                                <div>
                                    <p className="text-[11px] text-slate-500">Reject</p>
                                    <p className="text-base font-bold text-rose-600 dark:text-rose-400">{selectedTaskModal.rejectCount}</p>
                                </div>
                            </div>

                            {/* Student List & Statuses */}
                            <div className="space-y-3">
                                <h3 className="text-sm font-bold flex items-center justify-between">
                                    <span className="flex items-center gap-2">
                                        <Users className="w-4 h-4 text-indigo-500" />
                                        Daftar Mahasiswa & Status Tugas
                                    </span>
                                    <span className="text-xs text-slate-500 font-normal">
                                        Total: {selectedTaskModal.totalStudents} Mahasiswa
                                    </span>
                                </h3>

                                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden max-h-72 overflow-y-auto">
                                    {selectedTaskModal.studentStatuses.map((st) => (
                                        <div
                                            key={st.uid}
                                            className="p-3.5 sm:px-4 bg-white dark:bg-slate-900 flex items-center justify-between gap-3 hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors"
                                        >
                                            <div className="min-w-0">
                                                <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate">
                                                    {st.name}
                                                </p>
                                                <p className="text-[10px] text-slate-400 font-mono truncate">
                                                    {st.nim}
                                                </p>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0 text-right">
                                                {/* Last Update */}
                                                <div className="text-[10px] text-slate-400 hidden sm:block">
                                                    <span className="block text-slate-500">Last Update</span>
                                                    <span>{formatDateTime(st.updatedAt)}</span>
                                                </div>

                                                {/* Status Badge */}
                                                <div>
                                                    {st.status === "done" && (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-flex items-center gap-1">
                                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                                            DONE
                                                        </span>
                                                    )}
                                                    {st.status === "on_progress" && (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 inline-flex items-center gap-1">
                                                            <Clock className="w-3.5 h-3.5" />
                                                            ON PROGRESS
                                                        </span>
                                                    )}
                                                    {st.status === "new" && (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                                                            NEW
                                                        </span>
                                                    )}
                                                    {st.status === "reject" && (
                                                        <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 inline-flex items-center gap-1">
                                                            <XCircle className="w-3.5 h-3.5" />
                                                            REJECT
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Modal Footer Actions */}
                            <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <button
                                    onClick={() => handleShareWATask(selectedTaskModal)}
                                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-2 shadow-sm"
                                >
                                    <Share2 className="w-4 h-4" />
                                    Share Rekap WA Tugas Ini
                                </button>

                                <button
                                    onClick={() => setSelectedTaskModal(null)}
                                    className="px-4 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-xl text-xs font-semibold transition-colors"
                                >
                                    Tutup
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
            {/* Task Modal Edit untuk Admin */}
            <TaskModal
                isOpen={isEditModalOpen}
                onClose={() => setIsEditModalOpen(false)}
                onSave={handleSaveEditedTaskGroup}
                taskToEdit={taskToEdit}
            />
        </div>
    );
}
