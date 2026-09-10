/**
 * Evaluates tasks directly on client-side to find upcoming reminders (H-2, H-1, and custom reminders)
 * without needing database writes or Firestore indexes.
 */
export function getUpcomingTaskReminders(tasks) {
    if (!Array.isArray(tasks)) return [];

    const now = new Date();
    const reminders = [];

    tasks.forEach((task) => {
        if (!task || task.status === "done") return;

        let deadline = null;
        if (task.deadline?.seconds) {
            deadline = new Date(task.deadline.seconds * 1000);
        } else if (typeof task.deadline === "string") {
            deadline = new Date(task.deadline.replace(" ", "T"));
        } else if (task.deadline) {
            deadline = new Date(task.deadline);
        }

        if (!deadline || isNaN(deadline.getTime())) return;

        const diffTime = deadline.getTime() - now.getTime();
        const diffHours = diffTime / (1000 * 60 * 60);

        // 1. Pengingat H-1 (<= 24 jam)
        if (diffHours <= 24 && diffHours >= -24) {
            reminders.push({
                id: `${task.id}_h1`,
                taskId: task.id,
                task,
                type: "reminder_h1",
                badge: "🚨 Wajib H-1",
                title: `🚨 Pengingat (H-1): ${task.judul}`,
                message: `Tugas ${task.matkul || 'Kuliah'} "${task.judul}" mendekati deadline (${deadline.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}).`,
                deadline
            });
        }
        // 2. Pengingat H-2 (<= 48 jam dan > 24 jam)
        else if (diffHours <= 48 && diffHours > 24) {
            reminders.push({
                id: `${task.id}_h2`,
                taskId: task.id,
                task,
                type: "reminder_h2",
                badge: "⏰ Wajib H-2",
                title: `⏰ Pengingat (H-2): ${task.judul}`,
                message: `Tugas ${task.matkul || 'Kuliah'} "${task.judul}" memiliki deadline 2 hari lagi (${deadline.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" })}).`,
                deadline
            });
        }

        // 3. Pengingat Khusus Tambahan User
        const khususList = task.reminder?.khusus || task.reminder_khusus || [];
        khususList.forEach((rem) => {
            const nilai = Number(rem.nilai) || 1;
            const satuan = rem.satuan || "jam";
            const offsetMs = satuan === "hari" ? nilai * 24 * 3600 * 1000 : nilai * 3600 * 1000;
            const triggerTime = new Date(deadline.getTime() - offsetMs);

            if (now >= triggerTime && diffHours >= -24) {
                const exists = reminders.some((r) => r.id === `${task.id}_h1` || r.id === `${task.id}_h2`);
                if (!exists) {
                    reminders.push({
                        id: `${task.id}_khusus_${rem.id}`,
                        taskId: task.id,
                        task,
                        type: "reminder_khusus",
                        badge: "🔔 Pengingat Khusus",
                        title: `🔔 Pengingat Khusus: ${task.judul}`,
                        message: `Pengingat tugas ${task.matkul || 'Kuliah'} "${task.judul}" - ${nilai} ${satuan} sebelum deadline!`,
                        deadline
                    });
                }
            }
        });
    });

    return reminders;
}
