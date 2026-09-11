"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const [isDarkMode, setIsDarkMode] = useState(false);

    const router = useRouter();
    const { login } = useAuth();

    // Inisialisasi & sinkronisasi mode terang/gelap
    useEffect(() => {
        // Cek preferensi tersimpan di localStorage atau sistem pengguna
        const savedTheme = localStorage.getItem("theme");
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;

        if (savedTheme === "dark" || (!savedTheme && prefersDark)) {
            setIsDarkMode(true);
            document.documentElement.classList.add("dark");
        } else {
            setIsDarkMode(false);
            document.documentElement.classList.remove("dark");
        }
    }, []);

    const toggleDarkMode = () => {
        if (isDarkMode) {
            document.documentElement.classList.remove("dark");
            localStorage.setItem("theme", "light");
            setIsDarkMode(false);
        } else {
            document.documentElement.classList.add("dark");
            localStorage.setItem("theme", "dark");
            setIsDarkMode(true);
        }
    };

    const handleLogin = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await login(email, password);
            router.push("/dashboard");
        } catch (err) {
            setError("Email atau password salah.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen w-full flex flex-col justify-between bg-slate-50 dark:bg-slate-950 transition-colors duration-200 p-4 sm:p-6">
            {/* Header Bar dengan Toggle Mode */}
            <div className="w-full max-w-md mx-auto flex justify-between items-center py-2">
                <div className="flex items-center gap-2">
                    <Image
                        src="/my-logo.png"
                        alt="Taskify Logo"
                        width={28}
                        height={28}
                        className="w-7 h-7 object-contain"
                    />
                    <span className="font-semibold text-slate-800 dark:text-slate-200 text-sm tracking-tight">
                        Taskify
                    </span>
                </div>

                {/* Tombol Switch Mode Siang/Malam */}
                <button
                    onClick={toggleDarkMode}
                    type="button"
                    aria-label="Toggle theme"
                    className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                    {isDarkMode ? (
                        /* Icon Matahari (Light Mode) */
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"
                            />
                        </svg>
                    ) : (
                        /* Icon Bulan (Dark Mode) */
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"
                            />
                        </svg>
                    )}
                </button>
            </div>

            {/* Main Card Container */}
            <div className="w-full max-w-md mx-auto my-auto py-8">
                <div className="bg-white dark:bg-slate-900 p-8 rounded-2xl border border-slate-200/80 dark:border-slate-800 transition-colors">
                    {/* Brand Logo & Heading */}
                    <div className="text-center mb-8">
                        <div className="inline-flex p-3 rounded-xl bg-slate-100 dark:bg-slate-800 mb-4 border border-slate-200/50 dark:border-slate-700/50">
                            <Image
                                src="/my-logo.png"
                                alt="Taskify Logo"
                                width={36}
                                height={36}
                                className="w-9 h-9 object-contain"
                            />
                        </div>
                        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 tracking-tight">
                            Selamat datang kembali
                        </h1>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            Masuk ke akun Taskify kamu untuk melanjutkan
                        </p>
                    </div>

                    {/* Alert Error */}
                    {error && (
                        <div className="bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 p-3 rounded-xl text-xs mb-6">
                            {error}
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleLogin} className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1.5">
                                Alamat Email
                            </label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                placeholder="nama@email.com"
                            />
                        </div>

                        <div>
                            <div className="flex justify-between items-center mb-1.5">
                                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300">
                                    Password
                                </label>
                            </div>
                            <input
                                type="password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full text-sm bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 rounded-xl px-3.5 py-2.5 focus:bg-white dark:focus:bg-slate-900 focus:border-indigo-600 dark:focus:border-indigo-500 focus:ring-1 focus:ring-indigo-600 dark:focus:ring-indigo-500 focus:outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                placeholder="••••••••"
                            />
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full mt-2 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-medium rounded-xl text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {loading && (
                                <svg
                                    className="animate-spin h-4 w-4 text-white"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                >
                                    <circle
                                        className="opacity-25"
                                        cx="12"
                                        cy="12"
                                        r="10"
                                        stroke="currentColor"
                                        strokeWidth="4"
                                    />
                                    <path
                                        className="opacity-75"
                                        fill="currentColor"
                                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                                    />
                                </svg>
                            )}
                            {loading ? "Memproses..." : "Masuk"}
                        </button>
                    </form>

                    {/* Footer Card */}
                    <p className="text-xs text-center text-slate-500 dark:text-slate-400 mt-6">
                        Belum punya akun?{" "}
                        <Link
                            href="/register"
                            className="text-indigo-600 dark:text-indigo-400 font-medium hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors"
                        >
                            Daftar sekarang
                        </Link>
                    </p>
                </div>
            </div>

            {/* Footer copyright sederhana */}
            <div className="w-full text-center py-2 text-[11px] text-slate-400 dark:text-slate-600">
                &copy; {new Date().getFullYear()} Taskify. All rights reserved.
            </div>
        </div>
    );
}