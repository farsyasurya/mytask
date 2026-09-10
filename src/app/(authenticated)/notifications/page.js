"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Bell, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { subscribeNotifications, markAsRead } from "@/services/notificationService";

export default function NotificationPage() {
    const { user } = useAuth();
    const [notifications, setNotifications] = useState([]);
    const router = useRouter();

    useEffect(() => {
        if (!user?.uid) return;
        const unsubscribe = subscribeNotifications(user.uid, (data) => {
            setNotifications(data);
        });
        return () => unsubscribe();
    }, [user?.uid]);

    const handleNotificationClick = async (notif) => {
        if (!notif.read) {
            await markAsRead(notif.id);
        }
        if (notif.taskId) {
            router.push(`/tasks?id=${notif.taskId}`);
        } else {
            router.push("/tasks");
        }
    };

    return (
        <div className="max-w-4xl w-full space-y-6">
            <div>
                <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
                    <Bell className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                    Pusat Notifikasi
                </h1>
                <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">
                    Pantau seluruh pengingat tenggat waktu tugas kamu
                </p>
            </div>

            <div className="space-y-3">
                {notifications.length === 0 ? (
                    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs sm:text-sm">
                        Tidak ada notifikasi saat ini.
                    </div>
                ) : (
                    notifications.map((notif) => (
                        <div
                            key={notif.id}
                            onClick={() => handleNotificationClick(notif)}
                            className={`p-4 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-4 ${
                                notif.read
                                    ? "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-75"
                                    : "bg-indigo-50/60 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 shadow-sm"
                            } hover:border-indigo-500 dark:hover:border-indigo-500`}
                        >
                            <div className="flex items-start gap-3.5 min-w-0">
                                <div
                                    className={`w-2.5 h-2.5 rounded-full mt-1.5 flex-shrink-0 ${
                                        notif.read ? "bg-slate-300 dark:bg-slate-700" : "bg-indigo-600 animate-pulse"
                                    }`}
                                />
                                <div className="min-w-0">
                                    <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                                        {notif.title || notif.judul || "Pengingat Tugas"}
                                    </h4>
                                    <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 line-clamp-1">
                                        {notif.message || notif.pesan}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 flex-shrink-0 text-[11px] text-slate-400">
                                <Clock className="w-3.5 h-3.5" />
                                <span>
                                    {notif.createdAt?.seconds
                                        ? new Date(notif.createdAt.seconds * 1000).toLocaleTimeString("id-ID", {
                                              hour: "2-digit",
                                              minute: "2-digit"
                                          })
                                        : "Baru saja"}
                                </span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
