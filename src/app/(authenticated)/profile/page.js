"use client";

import { useState, useEffect, useMemo } from "react";
import {
    User, Mail, Hash, ShieldCheck, Edit3, Save, X, AlertTriangle,
    CheckCircle2, Users, Search, GraduationCap, Send, ExternalLink
} from "lucide-react";
import { doc, onSnapshot, updateDoc, collection, query, where } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import Pagination from "@/components/common/Pagination";
import { createTelegramLinkToken, disconnectTelegram, subscribeTelegramConnection } from "@/services/telegramService";


export default function ProfilePage() {
    const { userData: initialUserData, user, refreshUserData, loading: authLoading } = useAuth();

    const [profile, setProfile] = useState(initialUserData);
    const [isEditing, setIsEditing] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [nicknameInput, setNicknameInput] = useState("");
    const [nimInput, setNimInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // State untuk daftar mahasiswa milik Admin
    const [studentsList, setStudentsList] = useState([]);
    const [studentsLoading, setStudentsLoading] = useState(false);
    const [studentSearch, setStudentSearch] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [pageSize, setPageSize] = useState(5);

    // State untuk Telegram Integration
    const [telegramConn, setTelegramConn] = useState(null);
    const [connectingTelegram, setConnectingTelegram] = useState(false);
    const [disconnectingTelegram, setDisconnectingTelegram] = useState(false);
    const [generatedTelegramUrl, setGeneratedTelegramUrl] = useState("");

    // Listener realtime status Telegram user
    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = subscribeTelegramConnection(user.uid, (conn) => {
            setTelegramConn(conn);
        });
        return () => unsubscribe();
    }, [user?.uid]);

    const handleConnectTelegram = async () => {
        if (!user?.uid) return;
        setConnectingTelegram(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            const { telegramLink } = await createTelegramLinkToken(user.uid, profile?.id_user || user.uid);
            setGeneratedTelegramUrl(telegramLink);
            setSuccessMessage("Link Telegram berhasil dibuat! Mengalihkan ke Telegram...");

            // Trigger direct redirection (works reliably on mobile apps, Safari, Chrome, and PWA)
            setTimeout(() => {
                window.location.href = telegramLink;
            }, 300);
        } catch (err) {
            console.error("Gagal membuat link Telegram:", err);
            setErrorMessage("Gagal menghubungkan Telegram: " + (err.message || "Terjadi kesalahan."));
        } finally {
            setConnectingTelegram(false);
        }
    };

    const handleDisconnectTelegram = async () => {
        if (!user?.uid) return;
        if (!window.confirm("Apakah Anda yakin ingin memutuskan koneksi Telegram dari MyTask?")) return;
        setDisconnectingTelegram(true);
        setErrorMessage("");
        setSuccessMessage("");
        try {
            await disconnectTelegram(user.uid);
            setSuccessMessage("Akun Telegram berhasil diputuskan.");
        } catch (err) {
            console.error("Gagal memutuskan Telegram:", err);
            setErrorMessage("Gagal memutuskan Telegram: " + (err.message || "Terjadi kesalahan."));
        } finally {
            setDisconnectingTelegram(false);
        }
    };


    // Sinkronkan state lokal saat data AuthContext dimuat/berubah
    useEffect(() => {
        if (initialUserData) {
            setProfile(initialUserData);
            setNameInput(initialUserData.name || user?.displayName || "");
            setNicknameInput(initialUserData.nickname || (initialUserData.name ? initialUserData.name.split(" ")[0] : ""));
            setNimInput(initialUserData.nim || "");
        }
    }, [initialUserData, user]);

    // Realtime Listener Firestore untuk update profil instan
    useEffect(() => {
        if (!user?.uid) return;

        const userDocRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(
            userDocRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    setProfile(data);
                    if (!isEditing) {
                        setNameInput(data.name || user?.displayName || "");
                        setNicknameInput(data.nickname || (data.name ? data.name.split(" ")[0] : ""));
                        setNimInput(data.nim || "");
                    }
                }
            },
            (error) => {
                console.error("Error listening profile changes:", error);
            }
        );

        return () => unsubscribe();
    }, [user?.uid, isEditing, user?.displayName]);

    // Fetch realtime daftar mahasiswa di kelas jika role adalah ADMIN
    useEffect(() => {
        if (profile?.role !== "ADMIN" || !profile?.kelas) return;

        setStudentsLoading(true);
        const q = query(
            collection(db, "users"),
            where("kelas", "==", profile.kelas)
        );

        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = [];
                snapshot.forEach((docSnap) => {
                    const data = docSnap.data();
                    // Sertakan hanya mahasiswa (bukan admin)
                    if (data.role !== "ADMIN") {
                        list.push({ id: docSnap.id, ...data });
                    }
                });
                // Urutkan berdasarkan nama mahasiswa
                list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
                setStudentsList(list);
                setStudentsLoading(false);
            },
            (error) => {
                console.error("Gagal memuat daftar mahasiswa:", error);
                setStudentsLoading(false);
            }
        );

        return () => unsubscribe();
    }, [profile?.role, profile?.kelas]);

    // Filter daftar mahasiswa berdasarkan kata kunci pencarian
    const filteredStudents = useMemo(() => {
        if (!studentSearch.trim()) return studentsList;
        const q = studentSearch.toLowerCase();
        return studentsList.filter(
            (s) =>
                (s.name && s.name.toLowerCase().includes(q)) ||
                (s.nickname && s.nickname.toLowerCase().includes(q)) ||
                (s.nim && s.nim.toLowerCase().includes(q)) ||
                (s.email && s.email.toLowerCase().includes(q)) ||
                (s.id_user && s.id_user.toLowerCase().includes(q))
        );
    }, [studentsList, studentSearch]);

    // Reset halaman ke 1 ketika kata kunci pencarian berubah
    useEffect(() => {
        setCurrentPage(1);
    }, [studentSearch]);

    const totalPages = Math.ceil(filteredStudents.length / pageSize) || 1;
    const paginatedStudents = useMemo(() => {
        const start = (currentPage - 1) * pageSize;
        return filteredStudents.slice(start, start + pageSize);
    }, [filteredStudents, currentPage, pageSize]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!user?.uid) return;

        const trimmedName = nameInput.trim();
        const trimmedNickname = nicknameInput.trim() || (trimmedName ? trimmedName.split(" ")[0] : "");
        const trimmedNim = nimInput.trim();

        if (!trimmedName) {
            setErrorMessage("Nama lengkap tidak boleh kosong.");
            return;
        }

        setSaving(true);
        setErrorMessage("");
        setSuccessMessage("");

        try {
            // Update nama di Firebase Auth
            if (user) {
                await updateProfile(user, { displayName: trimmedName });
            }

            // Update nama, nickname, nim di dokumen Firestore users/{uid}
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                name: trimmedName,
                nickname: trimmedNickname,
                nim: trimmedNim,
                updatedAt: new Date().toISOString()
            });

            await refreshUserData();
            setSuccessMessage("Profil berhasil diperbarui!");
            setIsEditing(false);
        } catch (err) {
            console.error("Gagal memperbarui profil:", err);
            setErrorMessage("Gagal memperbarui profil. Coba lagi nanti.");
        } finally {
            setSaving(false);
        }
    };

    const handleCancelEdit = () => {
        setNameInput(profile?.name || user?.displayName || "");
        setNicknameInput(profile?.nickname || (profile?.name ? profile.name.split(" ")[0] : ""));
        setNimInput(profile?.nim || "");
        setIsEditing(false);
        setErrorMessage("");
    };

    if (authLoading && !user) {
        return (
            <div className="w-full animate-pulse space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
                <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
            </div>
        );
    }

    const displayName = profile?.name || user?.displayName || "User";
    const displayNickname = profile?.nickname || (profile?.name ? profile.name.split(" ")[0] : "-");
    const displayNim = profile?.nim || "-";
    const displayEmail = profile?.email || user?.email || "-";
    const displayIdUser = profile?.id_user || user?.uid || "-";

    return (
        <div className="w-full space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Profil Saya</h1>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                        Kelola informasi akun dan pengaturan profil Anda
                    </p>
                </div>
                {!isEditing && (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition-all active:scale-95"
                    >
                        <Edit3 className="w-4 h-4" /> Edit Profil
                    </button>
                )}
            </div>

            {/* Alert Status */}
            {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs sm:text-sm animate-in fade-in">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {successMessage && (
                <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm animate-in fade-in">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{successMessage}</span>
                </div>
            )}

            {/* Card Utama Profil */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-all space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-bold text-3xl flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none flex-shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                                {displayName}
                            </h2>
                            {profile?.role === "ADMIN" && (
                                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                                    ADMIN
                                </span>
                            )}
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
                            <ShieldCheck className="w-4 h-4 text-emerald-500" /> Akun Terverifikasi
                        </p>
                    </div>
                </div>

                {/* Form / Grid Info */}
                {isEditing ? (
                    <form onSubmit={handleSaveProfile} className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <User className="w-4 h-4 text-indigo-500" /> Nama Lengkap
                                </label>
                                <input
                                    type="text"
                                    value={nameInput}
                                    onChange={(e) => setNameInput(e.target.value)}
                                    placeholder="Masukkan nama lengkap"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                                    <Hash className="w-4 h-4 text-indigo-500" /> NIM (Nomor Induk Mahasiswa)
                                </label>
                                <input
                                    type="text"
                                    value={nimInput}
                                    onChange={(e) => setNimInput(e.target.value)}
                                    placeholder="Masukkan NIM"
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <button
                                type="button"
                                onClick={handleCancelEdit}
                                disabled={saving}
                                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center gap-1.5"
                            >
                                <X className="w-4 h-4" /> Batal
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-md transition-all flex items-center gap-1.5 active:scale-95 disabled:opacity-50"
                            >
                                <Save className="w-4 h-4" />
                                {saving ? "Menyimpan..." : "Simpan Perubahan"}
                            </button>
                        </div>
                    </form>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1.5">
                                <User className="w-4 h-4 text-indigo-500" /> Nama Lengkap
                            </label>
                            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                                {displayName}
                            </p>
                        </div>

                        <div className="p-4 bg-indigo-50/60 dark:bg-indigo-950/40 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                            <label className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 flex items-center gap-1.5 mb-1.5">
                                <Hash className="w-4 h-4" /> NIM (Nomor Induk Mahasiswa)
                            </label>
                            <p className="text-sm sm:text-base font-bold text-indigo-700 dark:text-indigo-300 font-mono truncate">
                                {displayNim}
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1.5">
                                <GraduationCap className="w-4 h-4" /> Kelas
                            </label>
                            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                                {profile?.kelas || "-"}
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1.5">
                                <Hash className="w-4 h-4" /> ID User
                            </label>
                            <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-200 font-mono truncate">
                                {displayIdUser}
                            </p>
                        </div>
                    </div>
                )}
            </div>

            {/* Section Telegram Integration */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-all space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-sky-100 dark:bg-sky-950/80 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-lg">
                            ✈️
                        </div>
                        <div>
                            <h3 className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                Telegram Pengingat Tugas
                            </h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400">
                                Dapatkan pengingat tugas otomatis langsung di akun Telegram Anda
                            </p>
                        </div>
                    </div>

                    <div>
                        {telegramConn?.connected ? (
                            <button
                                type="button"
                                onClick={handleDisconnectTelegram}
                                disabled={disconnectingTelegram}
                                className="px-4 py-2 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900 text-rose-600 dark:text-rose-300 text-xs font-semibold rounded-xl border border-rose-200 dark:border-rose-800 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {disconnectingTelegram ? "Memproses..." : "Putuskan Telegram"}
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={handleConnectTelegram}
                                disabled={connectingTelegram}
                                className="px-4 py-2 bg-sky-500 hover:bg-sky-600 text-white text-xs font-semibold rounded-xl shadow-sm transition-all flex items-center gap-2 active:scale-95 disabled:opacity-50"
                            >
                                <Send className="w-3.5 h-3.5" />
                                {connectingTelegram ? "Membuat Link..." : "Hubungkan Telegram"}
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs bg-slate-50 dark:bg-slate-800/40 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-600 dark:text-slate-400">Status:</span>
                        {telegramConn?.connected ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-bold">
                                ✅ Terhubung {telegramConn.telegram_username ? `(@${telegramConn.telegram_username})` : (telegramConn.telegram_chat_id ? `(Chat ID: ${telegramConn.telegram_chat_id})` : "")}
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300 font-bold">
                                ❌ Belum terhubung
                            </span>
                        )}
                    </div>
                    {!telegramConn?.connected && (
                        <p className="text-slate-500 dark:text-slate-400 text-[11px]">
                            Klik <b>Hubungkan Telegram</b> lalu kirim pesan <code>/start</code> di Telegram untuk menyelesaikan verifikasi.
                        </p>
                    )}
                </div>

                {generatedTelegramUrl && !telegramConn?.connected && (
                    <div className="pt-2 flex flex-col sm:flex-row items-center gap-3 animate-in fade-in">
                        <a
                            href={generatedTelegramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-full sm:w-auto px-5 py-2.5 bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs rounded-xl shadow-md flex items-center justify-center gap-2 active:scale-95 transition-all"
                        >
                            <Send className="w-4 h-4" />
                            Buka Telegram Bot Sekarang 🚀
                        </a>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                            (Jika aplikasi Telegram tidak terbuka otomatis, tekan tombol di atas).
                        </p>
                    </div>
                )}
            </div>

            {/* List Mahasiswa Kelas Admin (Hanya tampil jika role = ADMIN) */}
            {profile?.role === "ADMIN" && (
                <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-all space-y-6">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 dark:border-slate-800 pb-5">
                        <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center flex-shrink-0">
                                <GraduationCap className="w-6 h-6" />
                            </div>
                            <div>
                                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                                    Daftar Mahasiswa
                                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                        Kelas {profile?.kelas || "-"}
                                    </span>
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                    Total {studentsList.length} mahasiswa terdaftar di kelas Anda
                                </p>
                            </div>
                        </div>

                        {/* Input Pencarian */}
                        <div className="relative w-full sm:w-64">
                            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Cari nama, NIM, email..."
                                value={studentSearch}
                                onChange={(e) => setStudentSearch(e.target.value)}
                                className="w-full pl-9 pr-8 py-2 bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 transition-all"
                            />
                            {studentSearch && (
                                <button
                                    onClick={() => setStudentSearch("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 text-xs font-bold"
                                >
                                    ✕
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Content Table / Mobile Cards */}
                    {studentsLoading ? (
                        <div className="py-8 text-center text-xs text-slate-400 animate-pulse">
                            Memuat daftar mahasiswa...
                        </div>
                    ) : filteredStudents.length === 0 ? (
                        <div className="py-12 text-center space-y-2">
                            <Users className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto" />
                            <p className="text-sm font-semibold text-slate-600 dark:text-slate-400">
                                {studentSearch ? "Tidak ada mahasiswa yang cocok dengan pencarian" : "Belum ada mahasiswa terdaftar di kelas ini"}
                            </p>
                            {studentSearch && (
                                <button
                                    onClick={() => setStudentSearch("")}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                                >
                                    Bersihkan pencarian
                                </button>
                            )}
                        </div>
                    ) : (
                        <>
                            {/* Desktop Table */}
                            <div className="hidden md:block overflow-x-auto rounded-xl border border-slate-100 dark:border-slate-800">
                                <table className="w-full text-left text-xs">
                                    <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-semibold border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="py-3 px-4">#</th>
                                            <th className="py-3 px-4">Nama Mahasiswa</th>
                                            <th className="py-3 px-4">Panggilan</th>
                                            <th className="py-3 px-4">NIM</th>
                                            <th className="py-3 px-4">Email</th>
                                            <th className="py-3 px-4">Kelas</th>
                                            <th className="py-3 px-4 text-center">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
                                        {paginatedStudents.map((mhs, index) => {
                                            const itemNumber = (currentPage - 1) * pageSize + index + 1;
                                            const mhsName = mhs.name || "Mahasiswa";
                                            const mhsNickname = mhs.nickname || (mhs.name ? mhs.name.split(" ")[0] : "-");
                                            const mhsNim = mhs.nim || mhs.id_user || "-";
                                            const initial = mhsName.charAt(0).toUpperCase();

                                            return (
                                                <tr key={mhs.id || index} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="py-3 px-4 text-slate-400 font-mono">{itemNumber}</td>
                                                    <td className="py-3 px-4">
                                                        <div className="flex items-center gap-3">
                                                            <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shadow-sm">
                                                                {initial}
                                                            </div>
                                                            <span className="font-semibold text-slate-900 dark:text-slate-100">
                                                                {mhsName}
                                                            </span>
                                                        </div>
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-700 dark:text-slate-300 font-medium">
                                                        {mhsNickname}
                                                    </td>
                                                    <td className="py-3 px-4 font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                                        {mhsNim}
                                                    </td>
                                                    <td className="py-3 px-4 text-slate-600 dark:text-slate-300">
                                                        {mhs.email || "-"}
                                                    </td>
                                                    <td className="py-3 px-4">
                                                        <span className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold text-[11px]">
                                                            {mhs.kelas || profile?.kelas || "-"}
                                                        </span>
                                                    </td>
                                                    <td className="py-3 px-4 text-center">
                                                        {mhs.email && (
                                                            <a
                                                                href={`mailto:${mhs.email}`}
                                                                title={`Kirim email ke ${mhsName}`}
                                                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors text-[11px] font-semibold"
                                                            >
                                                                <Mail className="w-3.5 h-3.5" /> Email
                                                            </a>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>

                            {/* Mobile Card List */}
                            <div className="block md:hidden space-y-3">
                                {paginatedStudents.map((mhs, index) => {
                                    const mhsName = mhs.name || "Mahasiswa";
                                    const mhsNickname = mhs.nickname || (mhs.name ? mhs.name.split(" ")[0] : "-");
                                    const mhsNim = mhs.nim || mhs.id_user || "-";
                                    const initial = mhsName.charAt(0).toUpperCase();

                                    return (
                                        <div
                                            key={mhs.id || index}
                                            className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/60 rounded-xl space-y-3"
                                        >
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shadow-sm">
                                                        {initial}
                                                    </div>
                                                    <div>
                                                        <p className="text-sm font-bold text-slate-900 dark:text-slate-100">
                                                            {mhsName} ({mhsNickname})
                                                        </p>
                                                        <p className="text-xs font-mono text-indigo-600 dark:text-indigo-400 font-semibold">
                                                            NIM: {mhsNim}
                                                        </p>
                                                    </div>
                                                </div>
                                                <span className="px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 font-bold text-[10px]">
                                                    {mhs.kelas || profile?.kelas || "-"}
                                                </span>
                                            </div>

                                            <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/50 flex items-center justify-between text-xs text-slate-500 dark:text-slate-400">
                                                <span className="truncate max-w-[200px]">{mhs.email || "-"}</span>
                                                {mhs.email && (
                                                    <a
                                                        href={`mailto:${mhs.email}`}
                                                        className="inline-flex items-center gap-1 px-2 py-1 rounded bg-indigo-600 text-white text-[11px] font-semibold active:scale-95 transition-all"
                                                    >
                                                        <Mail className="w-3 h-3" /> Email
                                                    </a>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Pagination Component */}
                            <Pagination
                                currentPage={currentPage}
                                totalPages={totalPages}
                                onPageChange={setCurrentPage}
                                pageSize={pageSize}
                                onPageSizeChange={setPageSize}
                                totalItems={filteredStudents.length}
                            />
                        </>
                    )}
                </div>
            )}
        </div>
    );
}