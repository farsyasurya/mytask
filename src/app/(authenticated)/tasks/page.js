"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Search, Filter, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

import TaskCard from "@/components/task/TaskCard";
import TaskModal from "@/components/task/TaskModal";
import PeriodFilter, { filterItemsByPeriod } from "@/components/common/PeriodFilter";
import Pagination from "@/components/common/Pagination";
import MobileFilterDialog from "@/components/common/MobileFilterDialog";
import { useAuth } from "@/hooks/useAuth";
import { MATA_KULIAH } from "@/constants/mataKuliah";
import {
    getUserTasks,
    createTask,
    updateTask,
    deleteTask,
    updateTaskStatus
} from "@/services/taskService";
import { checkAndUpdateTaskReminders } from "@/services/reminderCheckService";

function TasksContent() {
    const { user, userData, loading: authLoading } = useAuth();
    const router = useRouter();

    // Redirect ADMIN to /managemen-task
    useEffect(() => {
        if (!authLoading && userData?.role === "ADMIN") {
            router.replace("/managemen-task");
        }
    }, [userData, authLoading, router]);

    const [tasks, setTasks] = useState([]);
    const [filteredTasks, setFilteredTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [taskToEdit, setTaskToEdit] = useState(null);

    // Toast Alert State
    const [toast, setToast] = useState({ show: false, message: "", type: "success" });

    // Filters
    const searchParams = useSearchParams();
    const initialSearch = searchParams.get("search") || "";
    const taskIdParam = searchParams.get("id") || "";

    const [search, setSearch] = useState(initialSearch);
    const [filterMatkul, setFilterMatkul] = useState("");
    const [filterStatus, setFilterStatus] = useState("");

    // Period Filter State
    const [selectedPeriod, setSelectedPeriod] = useState("this_week");
    const [customStartDate, setCustomStartDate] = useState("");
    const [customEndDate, setCustomEndDate] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(12);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [search, filterMatkul, filterStatus, selectedPeriod, customStartDate, customEndDate]);

    // Sync search from URL query if changed from TopNav
    useEffect(() => {
        const querySearch = searchParams.get("search");
        if (querySearch !== null) {
            setSearch(querySearch);
        }
    }, [searchParams]);

    const showNotification = (message, type = "success") => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: "", type: "success" }), 3500);
    };

    const fetchTasks = useCallback(async () => {
        if (!user?.uid) return;
        try {
            setLoading(true);
            const data = await getUserTasks(user.uid);
            setTasks(data || []);
            setFilteredTasks(data || []);
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

    // Client-side filtering
    useEffect(() => {
        let result = [...tasks];

        if (taskIdParam) {
            result = result.filter((t) => t.id === taskIdParam || t.broadcast_id === taskIdParam || t.task_id === taskIdParam);
        } else {
            if (search.trim()) {
                result = result.filter((t) =>
                    t.judul?.toLowerCase().includes(search.toLowerCase().trim()) ||
                    t.matkul?.toLowerCase().includes(search.toLowerCase().trim()) ||
                    t.deskripsi?.toLowerCase().includes(search.toLowerCase().trim())
                );
            }

            if (filterMatkul) {
                result = result.filter((t) => t.matkul === filterMatkul);
            }

            if (filterStatus) {
                result = result.filter((t) => t.status === filterStatus);
            }

            result = filterItemsByPeriod(result, selectedPeriod, (t) => t.deadline, customStartDate, customEndDate);
        }

        setFilteredTasks(result);
    }, [search, filterMatkul, filterStatus, taskIdParam, tasks, selectedPeriod, customStartDate, customEndDate]);

    // Pagination calculations
    const totalPages = Math.ceil(filteredTasks.length / pageSize) || 1;
    const paginatedTasks = filteredTasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

    const handleSave = async (formData) => {
        if (!user) return;

        try {
            if (taskToEdit) {
                await updateTask(taskToEdit.id, formData);
                showNotification("Task berhasil diperbarui!", "success");
            } else {
                const userId = userData?.id_user || user.uid;
                await createTask(user.uid, userId, formData);
                showNotification("Task baru berhasil ditambahkan!", "success");
            }
            setIsModalOpen(false);
            await fetchTasks();
        } catch (err) {
            console.error("Gagal menyimpan task:", err);
            showNotification("Gagal menyimpan task.", "error");
        }
    };

    const handleDelete = async (docId) => {
        if (window.confirm("Hapus Task? Task ini akan dihapus secara permanen.")) {
            try {
                await deleteTask(docId);
                showNotification("Task telah dihapus.", "success");
                await fetchTasks();
            } catch (err) {
                console.error("Gagal menghapus task:", err);
                showNotification("Gagal menghapus task.", "error");
            }
        }
    };

    const handleStatusChange = async (docId, newStatus) => {
        try {
            await updateTaskStatus(docId, newStatus);
            showNotification("Status task diperbarui!", "success");
            await fetchTasks();
        } catch (err) {
            console.error("Gagal memperbarui status task:", err);
            showNotification("Gagal mengubah status.", "error");
        }
    };

    if (authLoading || loading || userData?.role === "ADMIN") {
        return (
            <div className="animate-pulse space-y-6">
                <div className="h-20 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                <div className="h-16 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4">
                    {[...Array(8)].map((_, i) => (
                        <div key={i} className="h-44 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Animated Toast Notification */}
            <AnimatePresence>
                {toast.show && (
                    <motion.div
                        initial={{ opacity: 0, y: -20, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -20, scale: 0.95 }}
                        transition={{ duration: 0.25 }}
                        className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3.5 rounded-2xl shadow-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800"
                    >
                        {toast.type === "success" ? (
                            <div className="p-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                                <CheckCircle2 className="w-5 h-5" />
                            </div>
                        ) : (
                            <div className="p-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-600 dark:text-rose-400">
                                <AlertCircle className="w-5 h-5" />
                            </div>
                        )}
                        <p className="text-xs sm:text-sm font-semibold">{toast.message}</p>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Header Page */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                        Daftar Tugas
                        <Sparkles className="w-5 h-5 text-indigo-500 fill-indigo-500/20" />
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Kelola dan pantau seluruh tugas kuliahmu
                    </p>
                </div>

                {/* Period Filter */}
                <MobileFilterDialog title="Filter" activeCount={(filterMatkul || filterStatus || selectedPeriod !== "all") ? 1 : 0}>
                    <div className="space-y-4">
                        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
                            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
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

                        {/* Filter Controls Bar */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                            {/* Filter Matkul Dropdown */}
                            <div className="relative flex items-center group">
                                <Filter className="w-4 h-4 absolute left-3.5 text-slate-400 group-focus-within:text-indigo-500 pointer-events-none transition-colors" />
                                <select
                                    value={filterMatkul}
                                    onChange={(e) => setFilterMatkul(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer active:scale-[0.99]"
                                >
                                    <option value="" className="dark:bg-slate-900">Semua Mata Kuliah</option>
                                    {MATA_KULIAH.map((m) => (
                                        <option key={m} value={m} className="dark:bg-slate-900">{m}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Filter Status Dropdown */}
                            <div className="relative flex items-center sm:col-span-2 md:col-span-1 group">
                                <Filter className="w-4 h-4 absolute left-3.5 text-slate-400 group-focus-within:text-indigo-500 pointer-events-none transition-colors" />
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all appearance-none cursor-pointer active:scale-[0.99]"
                                >
                                    <option value="" className="dark:bg-slate-900">Semua Status</option>
                                    <option value="new" className="dark:bg-slate-900">New</option>
                                    <option value="on_progress" className="dark:bg-slate-900">On Progress</option>
                                    <option value="reject" className="dark:bg-slate-900">Reject</option>
                                    <option value="done" className="dark:bg-slate-900">Done</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </MobileFilterDialog>
            </div>

            {/* Search Bar Input */}
            <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="relative flex items-center group">
                    <Search className="w-4 h-4 absolute left-3.5 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Cari tugas berdasarkan judul atau deskripsi..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-10 pr-3 py-2.5 text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all"
                    />
                </div>
            </div>

            {/* Animated Task Grid */}
            {filteredTasks.length === 0 ? (
                <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center"
                >
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Belum ada task yang sesuai dengan kriteria filter.
                    </p>
                </motion.div>
            ) : (
                <motion.div
                    layout
                    className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4 gap-4"
                >
                    <AnimatePresence>
                        {paginatedTasks.map((task) => (
                            <motion.div
                                key={task.id}
                                layout
                                initial={{ opacity: 0, y: 15 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                transition={{ duration: 0.2 }}
                            >
                                <TaskCard
                                    task={task}
                                    onEdit={(t) => {
                                        setTaskToEdit(t);
                                        setIsModalOpen(true);
                                    }}
                                    onDelete={handleDelete}
                                    onStatusChange={handleStatusChange}
                                />
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </motion.div>
            )}

            {/* Pagination Controls */}
            {filteredTasks.length > 0 && (
                <Pagination
                    currentPage={currentPage}
                    totalPages={totalPages}
                    onPageChange={setCurrentPage}
                    pageSize={pageSize}
                    onPageSizeChange={setPageSize}
                    totalItems={filteredTasks.length}
                />
            )}

            {/* Task Modal */}
            <TaskModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSave={handleSave}
                taskToEdit={taskToEdit}
            />
        </div>
    );
}

export default function TasksPage() {
    return (
        <Suspense fallback={<div className="h-40 animate-pulse bg-slate-200 dark:bg-slate-800 rounded-2xl" />}>
            <TasksContent />
        </Suspense>
    );
}
