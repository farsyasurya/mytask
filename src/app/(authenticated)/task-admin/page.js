"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { MATA_KULIAH } from "@/constants/mataKuliah";
import { KELAS_OPTIONS } from "@/constants/kelas";
import { TASK_TYPES } from "@/constants/taskTypes";
import { createAdminTaskForClass } from "@/services/taskService";
import {
    PlusCircle,
    Send,
    CheckCircle2,
    Share2,
    AlertCircle,
    Calendar,
    BookOpen,
    Layers,
    FileText,
    Users,
    Sparkles,
    ArrowLeft
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function TaskAdminPage() {
    const { userData, loading: authLoading } = useAuth();
    const router = useRouter();

    const [kelas, setKelas] = useState(KELAS_OPTIONS[0] || "");
    const [judul, setJudul] = useState("");
    const [matkul, setMatkul] = useState(MATA_KULIAH[0] || "");
    const [pertemuan, setPertemuan] = useState(1);
    const [jenisTugas, setJenisTugas] = useState([TASK_TYPES[0]?.id || "pretest"]);
    const [jenisTugasLainnya, setJenisTugasLainnya] = useState("");
    const [deadline, setDeadline] = useState("");
    const [deskripsi, setDeskripsi] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [error, setError] = useState("");
    const [successData, setSuccessData] = useState(null);

    // Otomatis mengeset kelas ke kelas milik Admin saat profil termuat
    useEffect(() => {
        if (userData?.kelas) {
            setKelas(userData.kelas);
        }
    }, [userData?.kelas]);

    const handleJenisTugasChange = (id) => {
        if (jenisTugas.includes(id)) {
            if (jenisTugas.length > 1) {
                setJenisTugas(jenisTugas.filter((item) => item !== id));
            }
        } else {
            setJenisTugas([...jenisTugas, id]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!judul.trim()) {
            setError("Judul tugas wajib diisi.");
            return;
        }
        if (!matkul) {
            setError("Mata kuliah wajib dipilih.");
            return;
        }
        if (!deadline) {
            setError("Deadline wajib diisi.");
            return;
        }

        try {
            setSubmitting(true);
            const formData = {
                judul,
                matkul,
                pertemuan: parseInt(pertemuan, 10),
                jenis_tugas: jenisTugas,
                jenis_tugas_lainnya: jenisTugas.includes("lainnya") ? jenisTugasLainnya : "",
                deadline,
                deskripsi
            };

            const targetClass = userData?.kelas || kelas;
            const result = await createAdminTaskForClass(targetClass, formData);
            setSuccessData({
                ...formData,
                totalDistributed: result.totalDistributed,
                kelas: result.kelas
            });
        } catch (err) {
            console.error("Gagal membuat tugas admin:", err);
            setError(err.message || "Gagal mendistribusikan tugas ke kelas.");
        } finally {
            setSubmitting(false);
        }
    };

    const handleShareWA = () => {
        if (!successData) return;

        const formattedDeadline = new Date(successData.deadline).toLocaleString('id-ID', {
            dateStyle: 'full',
            timeStyle: 'short'
        });

        const jenisText = successData.jenis_tugas
            .map((j) => {
                if (j === "lainnya") return successData.jenis_tugas_lainnya || "Lainnya";
                const found = TASK_TYPES.find((t) => t.id === j);
                return found ? found.label : j;
            })
            .join(", ");

        const text =
            `📌 *TUGAS BARU - ${successData.kelas}*\n\n` +
            `📚 *Mata Kuliah:* ${successData.matkul}\n` +
            `📖 *Pertemuan:* Ke-${successData.pertemuan}\n` +
            `📝 *Judul Tugas:* ${successData.judul}\n` +
            `🏷️ *Jenis:* ${jenisText}\n` +
            `⏰ *Deadline:* ${formattedDeadline} WIB\n\n` +
            `📄 *Deskripsi / Instruksi:*\n${successData.deskripsi || "-"}\n\n` +
            `👉 *Segera cek dan selesaikan tugasmu di aplikasi TASKIFY!* 🚀`;

        const waUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
        window.open(waUrl, "_blank");
    };

    const resetForm = () => {
        setJudul("");
        setDeskripsi("");
        setJenisTugas([TASK_TYPES[0]?.id || "pretest"]);
        setJenisTugasLainnya("");
        setDeadline("");
        setSuccessData(null);
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
                    Halaman ini khusus untuk Role **ADMIN**. Anda saat ini terdaftar sebagai role **{userData?.role || "USER"}**.
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
        <div className="space-y-6 max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-slate-900 p-5 sm:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                        <PlusCircle className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        Tambah Task Kelas (Admin)
                    </h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Buat tugas baru dan distribusikan secara otomatis ke seluruh mahasiswa di kelas target
                    </p>
                </div>

                <button
                    onClick={() => router.push("/tasks")}
                    className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium transition-colors"
                >
                    <ArrowLeft className="w-4 h-4" />
                    Lihat Daftar Tugas
                </button>
            </div>

            {/* Error Alert */}
            {error && (
                <div className="bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 dark:text-rose-400 p-4 rounded-2xl text-xs sm:text-sm flex items-center gap-3">
                    <AlertCircle className="w-5 h-5 shrink-0" />
                    <span>{error}</span>
                </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} className="bg-white dark:bg-slate-900 p-6 sm:p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Target Kelas (Disabled, locked to Admin class) */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <Users className="w-4 h-4 text-indigo-500" />
                            Target Kelas (Kelas Admin)
                        </label>
                        <input
                            type="text"
                            disabled
                            value={`Kelas ${userData?.kelas || kelas}`}
                            className="w-full text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 font-bold text-indigo-600 dark:text-indigo-400 cursor-not-allowed opacity-90"
                        />
                    </div>

                    {/* Select Mata Kuliah */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <BookOpen className="w-4 h-4 text-indigo-500" />
                            Mata Kuliah
                        </label>
                        <select
                            value={matkul}
                            onChange={(e) => setMatkul(e.target.value)}
                            className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
                        >
                            {MATA_KULIAH.map((m) => (
                                <option key={m} value={m} className="dark:bg-slate-900">
                                    {m}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                    {/* Judul Tugas */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <FileText className="w-4 h-4 text-indigo-500" />
                            Judul Tugas
                        </label>
                        <input
                            type="text"
                            required
                            placeholder="Contoh: Laporan Praktikum Pertemuan 5"
                            value={judul}
                            onChange={(e) => setJudul(e.target.value)}
                            className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                    </div>

                    {/* Pertemuan */}
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                            <Layers className="w-4 h-4 text-indigo-500" />
                            Pertemuan Ke-
                        </label>
                        <select
                            value={pertemuan}
                            onChange={(e) => setPertemuan(e.target.value)}
                            className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
                        >
                            {[...Array(14)].map((_, i) => (
                                <option key={i + 1} value={i + 1} className="dark:bg-slate-900">
                                    Pertemuan {i + 1}
                                </option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Jenis Tugas */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Jenis Tugas
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {TASK_TYPES.map((opt) => {
                            const checked = jenisTugas.includes(opt.id);
                            return (
                                <button
                                    key={opt.id}
                                    type="button"
                                    onClick={() => handleJenisTugasChange(opt.id)}
                                    className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-all ${checked
                                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                        : "bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300"
                                        }`}
                                >
                                    {opt.label}
                                </button>
                            );
                        })}
                    </div>

                    {jenisTugas.includes("lainnya") && (
                        <input
                            type="text"
                            placeholder="Sebutkan jenis tugas lainnya..."
                            value={jenisTugasLainnya}
                            onChange={(e) => setJenisTugasLainnya(e.target.value)}
                            className="mt-3 w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                        />
                    )}
                </div>

                {/* Deadline */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-indigo-500" />
                        Tenggat Waktu (Deadline)
                    </label>
                    <input
                        type="datetime-local"
                        required
                        value={deadline}
                        onChange={(e) => setDeadline(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                </div>

                {/* Deskripsi */}
                <div>
                    <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
                        Deskripsi / Petunjuk Pengerjaan
                    </label>
                    <textarea
                        rows={4}
                        placeholder="Tuliskan petunjuk pengerjaan tugas, format pengumpulan, atau link materi..."
                        value={deskripsi}
                        onChange={(e) => setDeskripsi(e.target.value)}
                        className="w-full text-xs sm:text-sm bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                    />
                </div>

                {/* Submit Button */}
                <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-indigo-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                    {submitting ? (
                        <>
                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            <span>Mendistribusikan Tugas...</span>
                        </>
                    ) : (
                        <>
                            <Send className="w-4 h-4" />
                            <span>Distribusikan Tugas ke {userData?.kelas || kelas}</span>
                        </>
                    )}
                </button>
            </form>

            {/* Success Dialog Modal */}
            <AnimatePresence>
                {successData && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-2xl space-y-6"
                        >
                            <div className="text-center space-y-2">
                                <div className="inline-flex p-3 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 mb-2">
                                    <CheckCircle2 className="w-10 h-10" />
                                </div>
                                <h2 className="text-xl sm:text-2xl font-bold tracking-tight">
                                    Tugas Berhasil Dibuat!
                                </h2>
                                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                                    Tugas telah otomatis masuk ke inbox **{successData.totalDistributed} Mahasiswa** di kelas **{successData.kelas}**.
                                </p>
                            </div>

                            {/* Summary Card */}
                            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/80 space-y-2 text-xs sm:text-sm">
                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <span className="text-slate-500">Mata Kuliah</span>
                                    <span className="font-semibold">{successData.matkul}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <span className="text-slate-500">Pertemuan</span>
                                    <span className="font-semibold">Pertemuan {successData.pertemuan}</span>
                                </div>
                                <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                                    <span className="text-slate-500">Judul</span>
                                    <span className="font-semibold">{successData.judul}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-slate-500">Deadline</span>
                                    <span className="font-semibold text-rose-600 dark:text-rose-400">
                                        {new Date(successData.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="space-y-3 pt-2">
                                <button
                                    onClick={handleShareWA}
                                    className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-medium rounded-xl text-sm transition-all shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2"
                                >
                                    <Share2 className="w-4 h-4" />
                                    <span>Bagikan Info Tugas ke WA Group Kelas</span>
                                </button>

                                <button
                                    onClick={resetForm}
                                    className="w-full py-2.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-medium rounded-xl text-xs sm:text-sm transition-colors"
                                >
                                    Selesai & Buat Tugas Lain
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
