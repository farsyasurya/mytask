"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, ArrowRight, X } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeNotifications, markAsRead } from "@/services/notificationService";

export default function ReminderModal() {
    const { user } = useAuth();
    const router = useRouter();
    const [latestNotif, setLatestNotif] = useState(null);
    const [isOpen, setIsOpen] = useState(false);

    useEffect(() => {
        if (!user?.uid) return;

        // Listen notifikasi realtime
        const unsubscribe = subscribeNotifications(user.uid, (notifs) => {
            const unread = notifs.filter((n) => !n.read);
            if (unread.length > 0) {
                setLatestNotif(unread[0]); // Ambil notifikasi belum dibaca yang terbaru
                setIsOpen(true);
            }
        });

        return () => unsubscribe();
    }, [user?.uid]);

    if (!isOpen || !latestNotif) return null;

    const handleOpenNotificationPage = async () => {
        await markAsRead(latestNotif.id);
        setIsOpen(false);
        router.push("/notifications");
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4">
                <div className="flex justify-between items-start">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Bell className="w-5 h-5 animate-bounce" />
                    </div>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div>
                    <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
                        {latestNotif.title || "Pengingat Tugas!"}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {latestNotif.message || "Kamu memiliki deadline tugas yang mendekati tenggat waktu."}
                    </p>
                </div>

                <button
                    onClick={handleOpenNotificationPage}
                    className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl text-xs transition-all flex items-center justify-center gap-2 active:scale-95 shadow-md shadow-indigo-200 dark:shadow-none"
                >
                    Lihat Semua Notifikasi
                    <ArrowRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}