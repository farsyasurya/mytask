"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push("/dashboard");
      } else {
        router.push("/login");
      }
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3 bg-slate-50">
      <img src="/my-logo.png" alt="TASKIFY Logo" className="w-20 h-20 object-contain animate-pulse" />
      <p className="text-sm text-slate-500 font-medium">Memuat TASKIFY...</p>
    </div>
  );
}