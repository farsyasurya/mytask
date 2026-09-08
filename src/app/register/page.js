"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/hooks/useAuth";

export default function RegisterPage() {
    const [name, setName] = useState("");
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);
    const router = useRouter();
    const { register } = useAuth();

    const handleRegister = async (e) => {
        e.preventDefault();
        setError("");
        setLoading(true);

        try {
            await register(name, email, password);
            router.push("/dashboard");
        } catch (err) {
            setError("Gagal mendaftar. Pastikan email belum pernah terdaftar.");
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
            <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md w-full shadow-sm">
                <h1 className="text-2xl font-bold text-slate-900 text-center mb-2">Daftar MyTask 🚀</h1>
                <p className="text-xs text-slate-500 text-center mb-6">Buat akun untuk mengelola tugas kuliahmu</p>

                {error && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-xs mb-4">
                        {error}
                    </div>
                )}

                <form onSubmit={handleRegister} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Nama Lengkap</label>
                        <input
                            type="text"
                            required
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="Nama kamu"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="nama@email.com"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full text-sm border border-slate-300 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                            placeholder="••••••••"
                        />
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 bg-indigo-600 text-white font-semibold rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                    >
                        {loading ? "Memuat..." : "Daftar"}
                    </button>
                </form>

                <p className="text-xs text-center text-slate-600 mt-6">
                    Sudah punya akun?{" "}
                    <Link href="/login" className="text-indigo-600 font-semibold hover:underline">
                        Masuk
                    </Link>
                </p>
            </div>
        </div>
    );
}