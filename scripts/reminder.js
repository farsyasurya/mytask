const admin = require("firebase-admin");
const axios = require("axios");

// Initialize Firebase Admin
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert({
            projectId: process.env.FIREBASE_PROJECT_ID,
            clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
            privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        })
    });
}

const db = admin.firestore();
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

async function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: chatId,
            text: text,
            parse_mode: "HTML"
        });
    } catch (err) {
        console.error("Gagal mengirim Telegram:", err.response?.data || err.message);
    }
}

async function runReminderEngine() {
    console.log("Menjalankan Reminder Engine...");

    const now = new Date();

    // Query tasks where status != 'done'
    const tasksSnap = await db.collection("tasks")
        .where("status", "in", ["new", "on_progress", "reject"])
        .get();

    if (tasksSnap.empty) {
        console.log("Tidak ada task aktif.");
        return;
    }

    for (const docSnap of tasksSnap.docs) {
        const task = docSnap.data();
        const taskId = docSnap.id;

        // Get User for Telegram Chat ID
        const userSnap = await db.collection("users").doc(task.uid).get();
        if (!userSnap.exists) continue;

        const user = userSnap.data();
        if (!user.telegram?.connected || !user.telegram?.chat_id) continue;

        const deadline = task.deadline.toDate();
        const timeDiffMs = deadline.getTime() - now.getTime();
        const hoursLeft = timeDiffMs / (1000 * 60 * 60);

        const reminderStatus = task.reminder_status || {};

        // 1. Check 2 Days Mandatory Reminder (47 - 49 hours window)
        if (!reminderStatus.dua_hari && hoursLeft <= 48 && hoursLeft > 24) {
            const msg = `🔔 <b>PENGINGAT TASK</b>\n\n📚 <b>Mata Kuliah:</b>\n${task.matkul}\n\n📝 <b>Tugas:</b>\n${task.judul}\n\n📅 <b>Deadline:</b>\n${deadline.toLocaleString("id-ID")}\n\n⏰ <b>Tersisa:</b>\n2 Hari lagi\n\n📊 <b>Status:</b>\n${task.status}\n\nJangan lupa dikerjakan! 🚀`;

            await sendTelegramMessage(user.telegram.chat_id, msg);
            await db.collection("tasks").doc(taskId).update({
                "reminder_status.dua_hari": true,
                "reminder_status.dua_hari_sentAt": admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Reminder 2 hari terkirim untuk task: ${task.judul}`);
        }

        // 2. Check 1 Day Mandatory Reminder (23 - 25 hours window)
        if (!reminderStatus.satu_hari && hoursLeft <= 24 && hoursLeft > 0) {
            const msg = `⚠️ <b>PENGINGAT DEADLINE</b>\n\nTugas kamu akan deadline BESOK.\n\n📚 <b>${task.matkul}</b>\n📝 <b>${task.judul}</b>\n\n📅 <b>Deadline:</b> ${deadline.toLocaleString("id-ID")}\n📊 <b>Status:</b> ${task.status}\n\nSegera diselesaikan ya! 🔥`;

            await sendTelegramMessage(user.telegram.chat_id, msg);
            await db.collection("tasks").doc(taskId).update({
                "reminder_status.satu_hari": true,
                "reminder_status.satu_hari_sentAt": admin.firestore.FieldValue.serverTimestamp()
            });
            console.log(`Reminder 1 hari terkirim untuk task: ${task.judul}`);
        }
    }

    console.log("Pengecekan reminder selesai.");
}

runReminderEngine().catch(console.error);