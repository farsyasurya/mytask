"use client";

import { Calendar, Filter } from "lucide-react";

export default function PeriodFilter({
    selectedPeriod = "this_week",
    onPeriodChange,
    customStartDate = "",
    customEndDate = "",
    onStartDateChange,
    onEndDateChange
}) {
    return (
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
            <div className="relative flex items-center">
                <Filter className="w-3.5 h-3.5 absolute left-3 text-slate-400 pointer-events-none" />
                <select
                    value={selectedPeriod}
                    onChange={(e) => onPeriodChange(e.target.value)}
                    className="w-full sm:w-auto pl-9 pr-3 py-2 text-xs bg-slate-50 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700/80 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold cursor-pointer text-slate-700 dark:text-slate-200"
                >
                    <option value="all" className="dark:bg-slate-900">Semua Periode</option>
                    <option value="today" className="dark:bg-slate-900">Hari Ini</option>
                    <option value="this_week" className="dark:bg-slate-900">Minggu Ini</option>
                    <option value="this_month" className="dark:bg-slate-900">Bulan Ini</option>
                    <option value="custom" className="dark:bg-slate-900">Kustom Tanggal</option>
                </select>
            </div>

            {selectedPeriod === "custom" && (
                <div className="flex items-center gap-2 animate-in fade-in duration-200">
                    <div className="relative flex items-center">
                        <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                        <input
                            type="date"
                            value={customStartDate}
                            onChange={(e) => onStartDateChange(e.target.value)}
                            className="pl-8 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                        />
                    </div>
                    <span className="text-xs text-slate-400">-</span>
                    <div className="relative flex items-center">
                        <Calendar className="w-3.5 h-3.5 absolute left-2.5 text-slate-400 pointer-events-none" />
                        <input
                            type="date"
                            value={customEndDate}
                            onChange={(e) => onEndDateChange(e.target.value)}
                            className="pl-8 pr-2 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200"
                        />
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Helper function to filter items by period (date field)
 */
export function filterItemsByPeriod(items, period, getDateFn, customStart, customEnd) {
    if (!items || !Array.isArray(items)) return [];
    if (period === "all" || !period) return items;

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    return items.filter((item) => {
        const rawDate = getDateFn(item);
        if (!rawDate) return false;

        const d = rawDate.seconds
            ? new Date(rawDate.seconds * 1000)
            : new Date(rawDate);

        if (period === "today") {
            return d >= startOfToday && d <= endOfToday;
        }

        if (period === "this_week") {
            const firstDayOfWeek = new Date(startOfToday);
            const day = startOfToday.getDay();
            const diff = startOfToday.getDate() - day + (day === 0 ? -6 : 1); // Monday
            firstDayOfWeek.setDate(diff);

            const lastDayOfWeek = new Date(firstDayOfWeek);
            lastDayOfWeek.setDate(firstDayOfWeek.getDate() + 6);
            lastDayOfWeek.setHours(23, 59, 59, 999);

            return d >= firstDayOfWeek && d <= lastDayOfWeek;
        }

        if (period === "this_month") {
            const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
            const lastDayOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
            return d >= firstDayOfMonth && d <= lastDayOfMonth;
        }

        if (period === "custom") {
            if (!customStart && !customEnd) return true;
            let valid = true;
            if (customStart) {
                const s = new Date(customStart);
                s.setHours(0, 0, 0, 0);
                valid = valid && d >= s;
            }
            if (customEnd) {
                const e = new Date(customEnd);
                e.setHours(23, 59, 59, 999);
                valid = valid && d <= e;
            }
            return valid;
        }

        return true;
    });
}
