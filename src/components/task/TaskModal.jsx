"use client";

import { useState, useEffect } from "react";
import { MATA_KULIAH } from "@/constants/mataKuliah";
import { TASK_TYPES } from "@/constants/taskTypes";

export default function TaskModal({ isOpen, onClose, onSave, taskToEdit }) {
    // State internal untuk mengontrol animasi masuk & keluar (mount/unmount)
    const [shouldRender, setShouldRender] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);

    const [judul, setJudul] = useState("");
    const [deskripsi, setDeskripsi] = useState("");
    const [matkul, setMatkul] = useState(MATA_KULIAH[0]);
    const [jenisTugas, setJenisTugas] = useState([]);
    const [jenisTugasLainnya, setJenisTugasLainnya] = useState("");
    const [status, setStatus] = useState("new");
    const [pertemuan, setPertemuan] = useState(1);
    const [deadlineDate, setDeadlineDate] = useState("");
    const [deadlineTime, setDeadlineTime] = useState("20:00");
    const [reminderKhusus, setReminderKhusus] = useState([]);

    // Menangani pemicu animasi modal (Fade + Zoom)
    useEffect(() => {
        if (isOpen) {
            setShouldRender(true);
            // Menunggu 1 frame micro-task agar class CSS transisi terpicu
            requestAnimationFrame(() => {
                setIsAnimating(true);
            });
        } else {
            setIsAnimating(false);
            // Menunggu animasi penutupan selesai (200ms) sebelum me-unmount komponen
            const timer = setTimeout(() => {
                setShouldRender(false);
            }, 200);
            return () => clearTimeout(timer);
        }
    }, [isOpen]);

    useEffect(() => {
        if (taskToEdit) {
            setJudul(taskToEdit.judul || "");
            setDeskripsi(taskToEdit.deskripsi || "");
            setMatkul(taskToEdit.matkul || MATA_KULIAH[0]);
            setJenisTugas(taskToEdit.jenis_tugas || []);
            setJenisTugasLainnya(taskToEdit.jenis_tugas_lainnya || "");
            setStatus(taskToEdit.status || "new");
            setPertemuan(taskToEdit.pertemuan || 1);

            if (taskToEdit.deadline) {
                const d = taskToEdit.deadline.seconds
                    ? new Date(taskToEdit.deadline.seconds * 1000)
                    : new Date(taskToEdit.deadline);

                setDeadlineDate(d.toISOString().split("T")[0]);
                setDeadlineTime(d.toTimeString().substring(0, 5));
            }

            setReminderKhusus(taskToEdit.reminder?.khusus || []);
        } else {
            resetForm();
        }
    }, [taskToEdit, isOpen]);

    const resetForm = () => {
        setJudul("");
        setDeskripsi("");
        setMatkul(MATA_KULIAH[0]);
        setJenisTugas([]);
        setJenisTugasLainnya("");
        setStatus("new");
        setPertemuan(1);
        setDeadlineDate("");
        setDeadlineTime("20:00");
        setReminderKhusus([]);
    };

    if (!shouldRender) return null;

    const handleCheckboxChange = (typeId) => {
        if (jenisTugas.includes(typeId)) {
            setJenisTugas(jenisTugas.filter((id) => id !== typeId));
        } else {
            setJenisTugas([...jenisTugas, typeId]);
        }
    };

    const addReminderKhusus = () => {
        const newRem = {
            id: `REM-${Date.now()}`,
            tipe: "before_deadline",
            nilai: 3,
            satuan: "jam",
            enabled: true
        };
        setReminderKhusus([...reminderKhusus, newRem]);
    };

    const removeReminderKhusus = (id) => {
        setReminderKhusus(reminderKhusus.filter((rem) => rem.id !== id));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        const combinedDeadline = `${deadlineDate}T${deadlineTime}:00`;

        onSave({
            judul,
            deskripsi,
            matkul,
            jenis_tugas: jenisTugas,
            jenis_tugas_lainnya: jenisTugas.includes("lainnya") ? jenisTugasLainnya : null,
            status,
            pertemuan,
            deadline: combinedDeadline,
            reminder_khusus: reminderKhusus
        });

        onClose();
    };

    return (
        /* Backdrop Overlay (Fade In / Fade Out) */
        <div
            onClick={onClose}
            className={`fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto transition-opacity duration-200 ease-out ${isAnimating ? "opacity-100" : "opacity-0"
                }`}
        >
            {/* Modal Card Box (Zoom In & Slide Up / Zoom Out & Slide Down) */}
            <div
                onClick={(e) => e.stopPropagation()}
                className={`bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto transition-all duration-200 ease-out ${isAnimating
                        ? "opacity-100 scale-100 translate-y-0"
                        : "opacity-0 scale-95 translate-y-4"
                    }`}
            >
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-lg font-bold text-slate-800 dark:text-slate-100">
                        {taskToEdit ? "Edit Task" : "Tambah Task"}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg transition-colors"
                    >
                        ✕
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Judul Task *</label>
                        <input
                            type="text"
                            required
                            value={judul}
                            onChange={(e) => setJudul(e.target.value)}
                            className="w-full text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            placeholder="Contoh: Mengerjakan Forum Diskusi"
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Deskripsi</label>
                        <textarea
                            rows="2"
                            value={deskripsi}
                            onChange={(e) => setDeskripsi(e.target.value)}
                            className="w-full text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            placeholder="Detail tugas..."
                        />
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Mata Kuliah *</label>
                        <select
                            value={matkul}
                            onChange={(e) => setMatkul(e.target.value)}
                            className="w-full text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer transition-all active:scale-[0.99]"
                        >
                            {MATA_KULIAH.map((item) => (
                                <option key={item} value={item} className="dark:bg-slate-900">{item}</option>
                            ))}
                        </select>
                    </div>

                    <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jenis Tugas *</label>
                        <div className="grid grid-cols-2 gap-2 mt-1">
                            {TASK_TYPES.map((type) => (
                                <label key={type.id} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={jenisTugas.includes(type.id)}
                                        onChange={() => handleCheckboxChange(type.id)}
                                        className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 dark:bg-slate-800 dark:border-slate-700"
                                    />
                                    {type.label}
                                </label>
                            ))}
                        </div>
                        {jenisTugas.includes("lainnya") && (
                            <input
                                type="text"
                                value={jenisTugasLainnya}
                                onChange={(e) => setJenisTugasLainnya(e.target.value)}
                                placeholder="Sebutkan jenis tugas..."
                                className="mt-2 w-full text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            />
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value)}
                                className="w-full text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer transition-all active:scale-[0.99]"
                            >
                                <option value="new" className="dark:bg-slate-900">New</option>
                                <option value="on_progress" className="dark:bg-slate-900">On Progress</option>
                                <option value="reject" className="dark:bg-slate-900">Reject</option>
                                <option value="done" className="dark:bg-slate-900">Done</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Pertemuan</label>
                            <select
                                value={pertemuan}
                                onChange={(e) => setPertemuan(e.target.value)}
                                className="w-full text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none cursor-pointer transition-all active:scale-[0.99]"
                            >
                                {Array.from({ length: 25 }, (_, i) => i + 1).map((p) => (
                                    <option key={p} value={p} className="dark:bg-slate-900">Pertemuan {p}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Tanggal Deadline *</label>
                            <input
                                type="date"
                                required
                                value={deadlineDate}
                                onChange={(e) => setDeadlineDate(e.target.value)}
                                className="w-full text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">Jam Deadline *</label>
                            <input
                                type="time"
                                required
                                value={deadlineTime}
                                onChange={(e) => setDeadlineTime(e.target.value)}
                                className="w-full text-sm border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded-lg p-2.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
                            />
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                        <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">Pengingat Wajib (Otomatis)</p>
                        <div className="space-y-1 text-xs text-slate-500 dark:text-slate-400">
                            <div className="flex items-center gap-2">✓ 2 hari sebelum deadline</div>
                            <div className="flex items-center gap-2">✓ 1 hari sebelum deadline</div>
                        </div>
                    </div>

                    <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                        <div className="flex justify-between items-center mb-2">
                            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">Pengingat Khusus</p>
                            <button
                                type="button"
                                onClick={addReminderKhusus}
                                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-medium"
                            >
                                + Tambah Pengingat
                            </button>
                        </div>
                        {reminderKhusus.map((rem, idx) => (
                            <div key={rem.id} className="flex items-center gap-2 mb-2">
                                <select
                                    value={rem.nilai}
                                    onChange={(e) => {
                                        const updated = [...reminderKhusus];
                                        updated[idx].nilai = parseInt(e.target.value, 10);
                                        setReminderKhusus(updated);
                                    }}
                                    className="text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded p-1.5"
                                >
                                    <option value={1}>1</option>
                                    <option value={3}>3</option>
                                    <option value={6}>6</option>
                                    <option value={12}>12</option>
                                </select>
                                <select
                                    value={rem.satuan}
                                    onChange={(e) => {
                                        const updated = [...reminderKhusus];
                                        updated[idx].satuan = e.target.value;
                                        setReminderKhusus(updated);
                                    }}
                                    className="text-xs border border-slate-300 dark:border-slate-700 dark:bg-slate-800 rounded p-1.5"
                                >
                                    <option value="jam">Jam Sebelum</option>
                                    <option value="hari">Hari Sebelum</option>
                                </select>
                                <button
                                    type="button"
                                    onClick={() => removeReminderKhusus(rem.id)}
                                    className="text-xs text-red-500 ml-auto"
                                >
                                    Hapus
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                        >
                            Batal
                        </button>
                        <button
                            type="submit"
                            className="px-4 py-2 text-sm bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 transition-all shadow-md active:scale-95"
                        >
                            Simpan Task
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}