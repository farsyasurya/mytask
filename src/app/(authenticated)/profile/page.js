"use client";

import { useState, useEffect } from "react";
import { User, Mail, Hash, ShieldCheck, Edit3, Save, X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { doc, onSnapshot, updateDoc } from "firebase/firestore";
import { updateProfile } from "firebase/auth";
import { useAuth } from "@/hooks/useAuth";
import { db } from "@/lib/firebase";

export default function ProfilePage() {
    const { userData: initialUserData, user, refreshUserData, loading: authLoading } = useAuth();

    const [profile, setProfile] = useState(initialUserData);
    const [isEditing, setIsEditing] = useState(false);
    const [nameInput, setNameInput] = useState("");
    const [saving, setSaving] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Sinkronkan state lokal saat data AuthContext dimuat/berubah
    useEffect(() => {
        if (initialUserData) {
            setProfile(initialUserData);
            setNameInput(initialUserData.name || user?.displayName || "");
        }
    }, [initialUserData, user]);

    // Realtime Listener Firestore untuk update instan
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
                    }
                }
            },
            (error) => {
                console.error("Error listening profile changes:", error);
            }
        );

        return () => unsubscribe();
    }, [user?.uid, isEditing, user?.displayName]);

    const handleSaveProfile = async (e) => {
        e.preventDefault();
        if (!user?.uid) return;

        const trimmedName = nameInput.trim();
        if (!trimmedName) {
            setErrorMessage("Nama tidak boleh kosong.");
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

            // Update nama di dokumen Firestore users/{uid}
            const userDocRef = doc(db, "users", user.uid);
            await updateDoc(userDocRef, {
                name: trimmedName,
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
        setIsEditing(false);
        setErrorMessage("");
    }

    if (authLoading && !user) {
        return (
            <div className="w-full animate-pulse space-y-6">
                <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-lg w-48" />
                <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl w-full" />
            </div>
        );
    }

    const displayName = profile?.name || user?.displayName || "User";
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

            {/* Card utama full-width */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 shadow-sm transition-all space-y-8">
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 border-b border-slate-100 dark:border-slate-800 pb-6">
                    <div className="w-20 h-20 rounded-2xl bg-indigo-600 text-white font-bold text-3xl flex items-center justify-center shadow-md shadow-indigo-200 dark:shadow-none flex-shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                    <div className="space-y-1">
                        <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                            {displayName}
                        </h2>
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
                                <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5">
                                    <Mail className="w-4 h-4" /> Email (Tidak dapat diubah)
                                </label>
                                <input
                                    type="email"
                                    value={displayEmail}
                                    disabled
                                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-800/40 text-slate-500 dark:text-slate-400 text-sm cursor-not-allowed"
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1.5">
                                <User className="w-4 h-4" /> Nama Lengkap
                            </label>
                            <p className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                                {displayName}
                            </p>
                        </div>

                        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                            <label className="text-xs font-semibold text-slate-400 dark:text-slate-500 flex items-center gap-1.5 mb-1.5">
                                <Mail className="w-4 h-4" /> Email
                            </label>
                            <p className="text-base font-bold text-slate-800 dark:text-slate-200 truncate">
                                {displayEmail}
                            </p>
                        </div>

                        <div className="p-4 bg-indigo-50/50 dark:bg-indigo-950/30 rounded-xl border border-indigo-100 dark:border-indigo-900/40">
                            <label className="text-xs font-semibold text-indigo-500 dark:text-indigo-400 flex items-center gap-1.5 mb-1.5">
                                <Hash className="w-4 h-4" /> ID User
                            </label>
                            <p className="text-base font-bold text-indigo-600 dark:text-indigo-400 font-mono truncate">
                                {displayIdUser}
                            </p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}