"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

export default function Pagination({
    currentPage = 1,
    totalPages = 1,
    onPageChange,
    pageSize = 10,
    onPageSizeChange,
    totalItems = 0
}) {
    if (totalPages <= 1 && totalItems <= pageSize) return null;

    const startItem = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
    const endItem = Math.min(currentPage * pageSize, totalItems);

    return (
        <div className="flex flex-col sm:flex-row justify-between items-center gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 dark:text-slate-400">
            {/* Total items info & Page Size selector */}
            <div className="flex items-center gap-3">
                <span>
                    Menampilkan <span className="font-semibold text-slate-800 dark:text-slate-200">{startItem}-{endItem}</span> dari <span className="font-semibold text-slate-800 dark:text-slate-200">{totalItems}</span> data
                </span>

                {onPageSizeChange && (
                    <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-[11px]">Baris:</span>
                        <select
                            value={pageSize}
                            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                            className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-slate-800 dark:text-slate-200 font-semibold cursor-pointer"
                        >
                            <option value={5}>5</option>
                            <option value={10}>10</option>
                            <option value={20}>20</option>
                            <option value={50}>50</option>
                        </select>
                    </div>
                )}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-1.5">
                <button
                    onClick={() => onPageChange(currentPage - 1)}
                    disabled={currentPage <= 1}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Halaman Sebelumnya"
                >
                    <ChevronLeft className="w-4 h-4" />
                </button>

                {/* Page numbers */}
                <div className="flex items-center gap-1">
                    {[...Array(totalPages)].map((_, i) => {
                        const pageNum = i + 1;
                        // Limit visible pages if totalPages is large
                        if (
                            totalPages > 7 &&
                            Math.abs(pageNum - currentPage) > 2 &&
                            pageNum !== 1 &&
                            pageNum !== totalPages
                        ) {
                            if (pageNum === 2 && currentPage > 4) return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                            if (pageNum === totalPages - 1 && currentPage < totalPages - 3) return <span key={pageNum} className="px-1 text-slate-400">...</span>;
                            return null;
                        }

                        return (
                            <button
                                key={pageNum}
                                onClick={() => onPageChange(pageNum)}
                                className={`w-8 h-8 rounded-lg text-xs font-semibold transition-all ${currentPage === pageNum
                                        ? "bg-indigo-600 text-white shadow-sm"
                                        : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                                    }`}
                            >
                                {pageNum}
                            </button>
                        );
                    })}
                </div>

                <button
                    onClick={() => onPageChange(currentPage + 1)}
                    disabled={currentPage >= totalPages}
                    className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    title="Halaman Selanjutnya"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
}
