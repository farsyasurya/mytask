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
    Calendar,
    Users,
    ClipboardList,
    PlusCircle,
    BookOpen
} from "lucide-react";

import TaskCard from "@/components/task/TaskCard";
import { useAuth } from "@/hooks/useAuth";
import { getUserTasks, updateTaskStatus, deleteTask, getAdminManagementTasks } from "@/services/taskService";
import { checkAndUpdateTaskReminders } from "@/services/reminderCheckService";
import TaskChart from "@/components/dashboard/TaskChart";
import AdminTaskChart from "@/components/dashboard/AdminTaskChart";
import Pagination from "@/components/common/Pagination";
import PeriodFilter, { filterItemsByPeriod } from "@/components/common/PeriodFilter";
import MobileFilterDialog from "@/components/common/MobileFilterDialog";

export default function DashboardPage() {
    const { user, userData, loading: authLoading } = useAuth();
    const router = useRouter();

    const isAdmin = userData?.role === "ADMIN";

    // User Task State
    const [tasks, setTasks] = useState([]);

    // Admin Task Group State
    const [adminTaskGroups, setAdminTaskGroups] = useState([]);

    const [loading, setLoading] = useState(true);

    // Period Filter State
    const [period, setPeriod] = useState("all");
    const [customStart, setCustomStart] = useState("");
    const [customEnd, setCustomEnd] = useState("");

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(6);

    const fetchData = useCallback(async () => {
        if (!user?.uid) return;
        setLoading(true);
        try {
            if (isAdmin) {
                const kelas = userData?.kelas || "";
                const groups = await getAdminManagementTasks(kelas);
                setAdminTaskGroups(groups || []);
            } else {
                const userTasks = await getUserTasks(user.uid);
                setTasks(userTasks || []);
                await checkAndUpdateTaskReminders(user.uid);
            }
        } catch (err) {
            console.error("Gagal mengambil data dashboard:", err);
        } finally {
            setLoading(false);
        }
    }, [user?.uid, isAdmin, userData?.kelas]);

    useEffect(() => {
        if (user) {
            fetchData();
        }
    }, [user, fetchData]);

    // Reset pagination on filter change
    useEffect(() => {
        setCurrentPage(1);
    }, [period, customStart, customEnd, pageSize]);

    const handleStatusChange = async (docId, newStatus) => {
        try {
            await updateTaskStatus(docId, newStatus);
            await fetchData();
        } catch (err) {
            console.error("Gagal memperbarui status:", err);
        }
    };

    const handleDelete = async (docId) => {
        if (window.confirm("Hapus Task? Task ini akan dihapus secara permanen.")) {
            try {
                await deleteTask(docId);
                await fetchData();
            } catch (err) {
                console.error("Gagal menghapus task:", err);
            }
        }
    };

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

    // ==========================================
    // RENDER DASHBOARD ADMIN
    // ==========================================
    if (isAdmin) {
        const filteredAdminGroups = filterItemsByPeriod(
            adminTaskGroups,
            period,
            (item) => item.deadline,
            customStart,
            customEnd
        );

        const totalClassTasks = adminTaskGroups.length;
        const totalStudentsCount = adminTaskGroups[0]?.totalStudents || 0;
        const totalAvgProgress = totalClassTasks > 0
            ? Math.round(adminTaskGroups.reduce((acc, curr) => acc + curr.progressPercent, 0) / totalClassTasks)
            : 0;
        const incompleteTasksCount = adminTaskGroups.filter((t) => t.progressPercent < 100).length;

        // Pagination for Admin Table
        const totalPages = Math.ceil(filteredAdminGroups.length / pageSize) || 1;
        const paginatedAdminGroups = filteredAdminGroups.slice(
            (currentPage - 1) * pageSize,
            currentPage * pageSize
        );

        return (
            <div className="space-y-6 md:space-y-8">
                {/* Header Welcome Admin */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-amber-500 text-white flex items-center justify-center font-bold text-lg border border-amber-600 shadow-sm">
                            {userData?.name ? userData.name.charAt(0).toUpperCase() : "A"}
                        </div>

                        <div>
                            <div className="flex items-center gap-2">
                                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
                                    Selamat datang, {userData?.name || "Admin"}
                                </h1>
                            </div>
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">
                                Ringkasan penugasan & progres pengerjaan mahasiswa Kelas {userData?.kelas || ""}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                        <button
                            onClick={() => router.push("/task-admin")}
                            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs sm:text-sm transition-colors shadow-sm"
                        >
                            <PlusCircle className="w-4 h-4" />
                            Tambah Tugas Kelas
                        </button>
                    </div>
                </div>

                {/* Metrics Grid Admin */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tugas Didistribusikan</p>
                            <p className="text-xl sm:text-2xl font-bold mt-1">{totalClassTasks}</p>
                        </div>
                        <div className="p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl text-indigo-600 dark:text-indigo-400">
                            <BookOpen className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Rata-rata Progress Kelas</p>
                            <p className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{totalAvgProgress}%</p>
                        </div>
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 rounded-xl text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Tugas Belum 100%</p>
                            <p className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{incompleteTasksCount}</p>
                        </div>
                        <div className="p-3 bg-amber-50 dark:bg-amber-950/50 rounded-xl text-amber-600 dark:text-amber-400">
                            <Clock className="w-5 h-5" />
                        </div>
                    </div>

                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex items-center justify-between shadow-sm">
                        <div>
                            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">Mahasiswa di Kelas</p>
                            <p className="text-xl sm:text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{totalStudentsCount}</p>
                        </div>
                        <div className="p-3 bg-blue-50 dark:bg-blue-950/50 rounded-xl text-blue-600 dark:text-blue-400">
                            <Users className="w-5 h-5" />
                        </div>
                    </div>
                </div>

                {/* Admin Task Chart */}
                <AdminTaskChart adminTaskGroups={filteredAdminGroups} />

                {/* Task Progress Section Admin */}
                <div className="space-y-4">
                    <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                        <div>
                            <h2 className="text-base sm:text-lg font-bold flex items-center gap-2">
                                Status Penugasan Kelas {userData?.kelas || "01TPLE002"}
                            </h2>
                            <p className="text-xs text-slate-500">
                                Ringkasan kelengkapan pengerjaan tugas mahasiswa per mata kuliah
                            </p>
                        </div>

                        {/* Mobile Filter Dialog Wrapper */}
                        <MobileFilterDialog title="Filter Periode" activeCount={period !== "all" ? 1 : 0}>
                            <PeriodFilter
                                selectedPeriod={period}
                                onPeriodChange={setPeriod}
                                customStartDate={customStart}
                                customEndDate={customEnd}
                                onStartDateChange={setCustomStart}
                                onEndDateChange={setCustomEnd}
                            />
                        </MobileFilterDialog>
                    </div>

                    {filteredAdminGroups.length === 0 ? (
                        <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-12 text-center">
                            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                Tidak ada tugas kelas pada periode ini.
                            </p>
                        </div>
                    ) : (
                        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 space-y-4">
                            {/* DESKTOP VIEW: Table */}
                            <div className="hidden md:block overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-200 dark:border-slate-800 text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                                            <th className="py-3 px-3">Mata Kuliah & Judul</th>
                                            <th className="py-3 px-3">Pertemuan</th>
                                            <th className="py-3 px-3">Deadline</th>
                                            <th className="py-3 px-3 text-center">Progress Selesai</th>
                                            <th className="py-3 px-3 text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs sm:text-sm">
                                        {paginatedAdminGroups.map((group) => (
                                            <tr key={group.groupKey} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                                <td className="py-3 px-3">
                                                    <div className="font-bold text-slate-900 dark:text-slate-100">{group.judul}</div>
                                                    <div className="text-[11px] text-slate-500">{group.matkul}</div>
                                                </td>
                                                <td className="py-3 px-3 font-semibold">Pertemuan {group.pertemuan}</td>
                                                <td className="py-3 px-3 text-rose-600 dark:text-rose-400 font-medium text-xs">
                                                    {group.deadline ? new Date(group.deadline.seconds ? group.deadline.seconds * 1000 : group.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : "-"}
                                                </td>
                                                <td className="py-3 px-3 text-center">
                                                    <div className="inline-flex items-center gap-2">
                                                        <div className="w-16 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden shrink-0">
                                                            <div
                                                                className={`h-full rounded-full ${group.progressPercent === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                                                                style={{ width: `${group.progressPercent}%` }}
                                                            />
                                                        </div>
                                                        <span className="font-bold font-mono text-xs">{group.progressPercent}%</span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-3 text-right">
                                                    <button
                                                        onClick={() => router.push("/managemen-task")}
                                                        className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-semibold text-xs hover:bg-indigo-100 transition-colors inline-flex items-center gap-1"
                                                    >
                                                        Detail Managemen
                                                        <ArrowRight className="w-3.5 h-3.5" />
                                                    </button>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>

                            {/* MOBILE VIEW: Cards */}
                            <div className="block md:hidden space-y-3">
                                {paginatedAdminGroups.map((group) => (
                                    <div
                                        key={group.groupKey}
                                        className="p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3"
                                    >
                                        <div className="flex justify-between items-start gap-2">
                                            <div>
                                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-300">
                                                    {group.matkul}
                                                </span>
                                                <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm mt-1">
                                                    {group.judul}
                                                </h4>
                                                <p className="text-xs text-slate-500 mt-0.5">Pertemuan {group.pertemuan}</p>
                                            </div>

                                            <button
                                                onClick={() => router.push("/managemen-task")}
                                                className="p-2 rounded-xl bg-indigo-600 text-white shadow-sm"
                                            >
                                                <ArrowRight className="w-4 h-4" />
                                            </button>
                                        </div>

                                        <div className="flex items-center justify-between pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                                            <span className="text-rose-600 dark:text-rose-400 font-medium text-[11px]">
                                                {group.deadline ? new Date(group.deadline.seconds ? group.deadline.seconds * 1000 : group.deadline).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : "-"}
                                            </span>

                                            <div className="flex items-center gap-1.5">
                                                <div className="w-14 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full ${group.progressPercent === 100 ? "bg-emerald-500" : "bg-amber-500"}`}
                                                        style={{ width: `${group.progressPercent}%` }}
                                                    />
                                                </div>
                                                <span className="font-bold text-xs font-mono">{group.progressPercent}%</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                pageSize={pageSize}
                                onPageSizeChange={setPageSize}
                                totalItems={filteredAdminGroups.length}
                            />
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // ==========================================
    // RENDER DASHBOARD MAHASISWA (USER)
    // ==========================================
    const filteredUserTasks = filterItemsByPeriod(
        tasks,
        period,
        (item) => item.deadline,
        customStart,
        customEnd
    );

    // Kalkulasi Statistik User
    const totalTasks = filteredUserTasks.length;
    const newTasks = filteredUserTasks.filter((t) => t.status === "new").length;
    const onProgressTasks = filteredUserTasks.filter((t) => t.status === "on_progress").length;
    const doneTasks = filteredUserTasks.filter((t) => t.status === "done").length;

    const now = new Date();
    const overdueTasks = filteredUserTasks.filter((t) => {
        if (!t.deadline) return false;
        const d = t.deadline?.seconds ? new Date(t.deadline.seconds * 1000) : new Date(t.deadline);
        return d < now && t.status !== "done";
    });

    const upcomingTasks = filteredUserTasks
        .filter((t) => t.status !== "done")
        .sort((a, b) => {
            const da = a.deadline?.seconds ? a.deadline.seconds * 1000 : new Date(a.deadline).getTime();
            const db = b.deadline?.seconds ? b.deadline.seconds * 1000 : new Date(b.deadline).getTime();
            return da - db;
        });

    // Pagination for User Upcoming Tasks
    const totalPagesUser = Math.ceil(upcomingTasks.length / pageSize) || 1;
    const paginatedUserTasks = upcomingTasks.slice(
        (currentPage - 1) * pageSize,
        currentPage * pageSize
    );

    return (
        <div className="space-y-6 md:space-y-8">
            {/* Header Welcome User */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-bold text-lg border border-indigo-100 dark:border-indigo-900">
                        {userData?.name ? userData.name.charAt(0).toUpperCase() : (user?.displayName ? user.displayName.charAt(0).toUpperCase() : "U")}
                    </div>

                    <div>
                        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                            Selamat datang, {userData?.name || user?.displayName || user?.email?.split("@")[0] || ""}
                            <Sparkles className="w-5 h-5 text-amber-500 fill-amber-500 shrink-0" />
                        </h1>
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            Ringkasan dan tenggat waktu tugas kuliahmu
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-2 self-end sm:self-auto">
                    <PeriodFilter
                        selectedPeriod={period}
                        onPeriodChange={setPeriod}
                        customStartDate={customStart}
                        customEndDate={customEnd}
                        onStartDateChange={setCustomStart}
                        onEndDateChange={setCustomEnd}
                    />
                </div>
            </div>

            {/* Metrics Grid User */}
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

            {/* Task Chart */}
            <TaskChart tasks={filteredUserTasks} />

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
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold">
                        Deadline Terdekat
                    </h2>
                </div>

                {upcomingTasks.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800 rounded-2xl p-8 text-center">
                        <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                            🎉 Tidak ada task yang perlu dikerjakan saat ini.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {paginatedUserTasks.map((task) => (
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

                        {/* Pagination User */}
                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPagesUser}
                            onPageChange={setCurrentPage}
                            pageSize={pageSize}
                            onPageSizeChange={setPageSize}
                            totalItems={upcomingTasks.length}
                        />
                    </>
                )}
            </div>
        </div>
    );
}
