"use client";

import { useState, useEffect } from "react";
import { User, Mail, Hash, Send, AlertTriangle, ShieldCheck } from "lucide-react";
import { doc, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";
import { createTelegramLinkToken, disconnectTelegram } from "@/services/telegramService";

export default function ProfilePage() {
    const { userData: initialUserData, user, refreshUserData, loading: authLoading } = useAuth();

    // State lokal untuk profile agar UI bisa langsung dirender tanpa nunggu Firestore
    const [profile, setProfile] = useState(initialUserData);
    const [loading, setLoading] = useState(false);
    const [disconnecting, setDisconnecting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    // Synchronize state lokal jika initialUserData berubah dari AuthContext
    useEffect(() => {
        if (initialUserData) {
            setProfile(initialUserData);
        }
    }, [initialUserData]);

    // 🚀 Realtime Listener: Begitu user berhasil connect Telegram di bot, UI otomatis update instan!
    useEffect(() => {
        if (!user?.uid) return;

        const userDocRef = doc(db, "users", user.uid);
        const unsubscribe = onSnapshot(
            userDocRef,
            (docSnap) => {
                if (docSnap.exists()) {
                    setProfile(docSnap.data());
                }
            },
            (error) => {
                console.error("Error listening profile changes:", error);
            }
        );

        return () => unsubscribe();
    }, [user?.uid]);

    const handleConnectTelegram = async () => {
        const activeUserId = profile?.id_user || user?.uid;

        if (!user?.uid || !activeUserId) {
            setErrorMessage("Data pengguna belum siap, silakan coba lagi.");
            return;
        }

        setLoading(true);
        setErrorMessage("");
        try {
            const token = await createTelegramLinkToken(user.uid, activeUserId);
            const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME;

            if (!botUsername) {
                throw new Error("Telegram bot username belum dikonfigurasi");
            }

            window.open(
                `https://t.me/${botUsername}?start=${token}`,
                "_blank"
            );
        } catch (err) {
            console.error("Gagal menghubungkan Telegram:", err);
            setErrorMessage("Gagal membuat tautan koneksi Telegram. Coba lagi nanti.");
        } finally {
            setLoading(false);
        }
    };

    const handleDisconnectTelegram = async () => {
        if (!confirm("Putuskan koneksi Telegram? Notifikasi pengingat tugas tidak akan dikirim lagi.")) {
            return;
        }

        setDisconnecting(true);
        setErrorMessage("");
        try {
            await disconnectTelegram(user.uid);
            await refreshUserData();
        } catch (err) {
            console.error("Gagal memutuskan Telegram:", err);
            setErrorMessage("Gagal memutuskan koneksi Telegram.");
        } finally {
            setDisconnecting(false);
        }
    };

    const isConnected = Boolean(profile?.telegram?.connected);

    if (authLoading && !user) {
        return (
            <div className="max-w-4xl w-full animate-pulse space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
                <div className="h-48 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
                <div className="h-32 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
            </div>
        );
    }

    const displayName = profile?.name || user?.displayName || "User";
    const displayEmail = profile?.email || user?.email || "-";
    const displayIdUser = profile?.id_user || user?.uid?.substring(0, 8) || "-";

    return (
        <div className="max-w-4xl w-full space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight">Profil Saya</h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Kelola informasi akun dan integrasi layanan notifikasi
                </p>
            </div>

            {/* Alert Pesan Error */}
            {errorMessage && (
                <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 flex items-center gap-3 text-rose-700 dark:text-rose-300 text-xs sm:text-sm animate-in fade-in">
                    <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600 dark:text-rose-400" />
                    <span>{errorMessage}</span>
                </div>
            )}

            {/* Card Informasi Profil */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-all space-y-6">
                <div className="flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="w-14 h-14 rounded-2xl bg-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div>
                        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                            {displayName}
                        </h2>
                        <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> Akun Terverifikasi
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1">
                            <User className="w-3.5 h-3.5" /> Nama Lengkap
                        </label>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {displayName}
                        </p>
                    </div>

                    <div className="p-3.5 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                        <label className="text-[11px] font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1">
                            <Mail className="w-3.5 h-3.5" /> Email
                        </label>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200 truncate">
                            {displayEmail}
                        </p>
                    </div>

                    <div className="p-3.5 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                        <label className="text-[11px] font-semibold text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5 mb-1">
                            <Hash className="w-3.5 h-3.5" /> ID User
                        </label>
                        <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400 font-mono truncate">
                            {displayIdUser}
                        </p>
                    </div>
                </div>
            </div>

            {/* Card Telegram Bot */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-sm transition-all space-y-4">
                <div className="flex items-center gap-2">
                    <Send className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                    <h2 className="text-base sm:text-lg font-bold text-slate-800 dark:text-slate-100">
                        Pengaturan Telegram Bot
                    </h2>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400">
                    Hubungkan akun Telegram untuk menerima notifikasi pengingat tenggat waktu secara *real-time*.
                </p>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-3 border-t border-slate-100 dark:border-slate-800">
                    <div>
                        <p className="text-xs font-semibold text-slate-400 dark:text-slate-500 mb-1">
                            Status Koneksi
                        </p>
                        {isConnected ? (
                            <div className="flex items-center gap-2">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
                                </span>
                                <span className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1">
                                    Terhubung
                                    <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                                        (@{profile?.telegram?.username || "user"})
                                    </span>
                                </span>
                            </div>
                        ) : (
                            <div className="flex items-center gap-2">
                                <span className="inline-block w-2.5 h-2.5 rounded-full bg-slate-300 dark:bg-slate-600" />
                                <span className="text-sm font-semibold text-slate-500 dark:text-slate-400">
                                    Belum Terhubung
                                </span>
                            </div>
                        )}
                    </div>

                    {isConnected ? (
                        <button
                            onClick={handleDisconnectTelegram}
                            disabled={disconnecting}
                            className="w-full sm:w-auto px-4 py-2 bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-semibold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {disconnecting ? "Memutuskan..." : "Putuskan Telegram"}
                        </button>
                    ) : (
                        <button
                            onClick={handleConnectTelegram}
                            disabled={loading}
                            className="w-full sm:w-auto px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                "Memproses..."
                            ) : (
                                <>
                                    <Send className="w-3.5 h-3.5" />
                                    Hubungkan Telegram
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
