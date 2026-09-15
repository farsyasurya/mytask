const fs = require("fs");
const path = require("path");
const axios = require("axios");
const admin = require("firebase-admin");

// 1. Manually load .env file
const envPath = path.join(__dirname, "..", ".env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf8");
    envContent.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let value = match[2] || "";
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (!process.env[key]) process.env[key] = value;
        }
    });
}

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const MYTASK_URL = process.env.MYTASK_URL || "https://fartaskify.netlify.app";

const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
    : undefined;

let useAdminSdk = false;
let dbAdmin = null;

if (FIREBASE_PROJECT_ID && clientEmail && privateKey) {
    if (!admin.apps.length) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId: FIREBASE_PROJECT_ID,
                clientEmail,
                privateKey
            })
        });
    }
    dbAdmin = admin.firestore();
    useAdminSdk = true;
    console.log("🔒 Menggunakan Firebase Admin SDK (Production / CI Mode)");
} else {
    console.log("🌐 Menggunakan Firestore REST API (Development Mode)");
}

/**
 * Helper to build Firestore REST API URLs
 */
function getFirestoreUrl(docPath, params = "") {
    const keyQuery = FIREBASE_API_KEY ? `key=${FIREBASE_API_KEY}` : "";
    const combinedParams = [keyQuery, params].filter(Boolean).join("&");
    const queryStr = combinedParams ? `?${combinedParams}` : "";
    return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}${queryStr}`;
}

/**
 * Format Date to Indonesian Timezone String (Asia/Jakarta)
 */
function formatDeadlineWib(date) {
    try {
        return new Intl.DateTimeFormat("id-ID", {
            timeZone: "Asia/Jakarta",
            day: "numeric",
            month: "long",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        }).format(date) + " WIB";
    } catch (err) {
        return date.toLocaleString("id-ID") + " WIB";
    }
}

/**
 * Sends Telegram message via Telegram Bot API with Inline Keyboard & Auto-Retry for Network Flakes
 */
async function sendTelegramNotification(chatId, text, taskId, retries = 3) {
    if (!TELEGRAM_BOT_TOKEN) {
        console.warn("⚠️ TELEGRAM_BOT_TOKEN tidak diatur. Skip pengiriman pesan Telegram.");
        return { success: false, reason: "missing_token" };
    }

    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    const payload = {
        chat_id: chatId,
        text: text,
        parse_mode: "HTML"
    };

    if (MYTASK_URL) {
        const taskUrl = `${MYTASK_URL.replace(/\/$/, "")}/tasks${taskId ? `?id=${taskId}` : ""}`;
        payload.reply_markup = {
            inline_keyboard: [
                [
                    {
                        text: "📲 Buka MyTask",
                        url: taskUrl
                    }
                ]
            ]
        };
    }

    for (let attempt = 1; attempt <= retries; attempt++) {
        try {
            await axios.post(url, payload, { timeout: 10000 });
            return { success: true };
        } catch (err) {
            const status = err.response?.status;
            const errDesc = err.response?.data?.description || err.message;
            const isNetworkErr = err.code === "ETIMEDOUT" || err.code === "ENETUNREACH" || err.code === "ECONNRESET" || !err.response;

            if (isNetworkErr && attempt < retries) {
                console.warn(`⚠️ Koneksi jaringan ke Telegram timeout (Percobaan ${attempt}/${retries}). Mencoba lagi dalam 2 detik...`);
                await new Promise((r) => setTimeout(r, 2000));
                continue;
            }

            console.error(`❌ Gagal mengirim Telegram (Status: ${status || "N/A"}):`, errDesc);

            if (status === 403) {
                return { success: false, reason: "user_blocked", status: 403 };
            }
            return { success: false, reason: errDesc, status: status, isNetworkErr };
        }
    }

    return { success: false, reason: "timeout", isNetworkErr: true };
}

/**
 * Main Reminder Engine execution function
 */
async function runReminderEngine() {
    console.log("🚀 Menjalankan MyTask Reminder Engine...");

    const now = new Date();
    let tasks = [];

    if (useAdminSdk) {
        const tasksSnap = await dbAdmin.collection("tasks")
            .where("status", "in", ["new", "proses", "on_progress"])
            .get();

        tasks = tasksSnap.docs.map((doc) => ({
            id: doc.id,
            ...doc.data()
        }));
    } else {
        // Fetch via REST API
        try {
            const listUrl = getFirestoreUrl("tasks", "pageSize=300");
            const listRes = await axios.get(listUrl);
            const documents = listRes.data.documents || [];

            const parseField = (val) => {
                if (!val) return null;
                if (val.stringValue !== undefined) return val.stringValue;
                if (val.integerValue !== undefined) return Number(val.integerValue);
                if (val.doubleValue !== undefined) return Number(val.doubleValue);
                if (val.booleanValue !== undefined) return val.booleanValue;
                if (val.timestampValue !== undefined) return val.timestampValue;
                if (val.arrayValue) return (val.arrayValue.values || []).map(parseField);
                if (val.mapValue) {
                    const obj = {};
                    for (const [k, v] of Object.entries(val.mapValue.fields || {})) {
                        obj[k] = parseField(v);
                    }
                    return obj;
                }
                return null;
            };

            for (const docObj of documents) {
                const docPath = docObj.name;
                const id = docPath.split("/").pop();
                const fields = docObj.fields || {};

                const tData = {};
                for (const [k, v] of Object.entries(fields)) {
                    tData[k] = parseField(v);
                }

                // Filter status
                if (["new", "proses", "on_progress"].includes(tData.status)) {
                    tasks.push({ id, ...tData });
                }
            }
        } catch (errList) {
            console.error("❌ Gagal memuat tasks via REST API:", errList.response?.data || errList.message);
        }
    }

    if (tasks.length === 0) {
        console.log("ℹ️ Tidak ada task aktif untuk diperiksa.");
        return;
    }

    console.log(`📋 Memeriksa ${tasks.length} task aktif...`);

    let sentCount = 0;
    let skippedCount = 0;

    for (const task of tasks) {
        const taskId = task.id;

        if (task.status === "done" || task.status === "reject") {
            continue;
        }

        // Parse deadline
        let deadline = null;
        if (task.deadline?.toDate) {
            deadline = task.deadline.toDate();
        } else if (task.deadline?.seconds) {
            deadline = new Date(task.deadline.seconds * 1000);
        } else if (typeof task.deadline === "string") {
            deadline = new Date(task.deadline);
        }

        if (!deadline || isNaN(deadline.getTime())) {
            continue;
        }

        const diffMs = deadline.getTime() - now.getTime();
        const diffHours = diffMs / (1000 * 60 * 60);

        if (diffMs <= 0) {
            continue;
        }

        // Fetch User's Telegram Connection from `telegram_connections/{uid}`
        let chatId = null;
        let isConnected = false;

        if (useAdminSdk) {
            const connSnap = await dbAdmin.collection("telegram_connections").doc(task.uid).get();
            if (connSnap.exists && connSnap.data().connected && connSnap.data().telegram_chat_id) {
                chatId = connSnap.data().telegram_chat_id;
                isConnected = true;
            }
        } else {
            try {
                const connUrl = getFirestoreUrl(`telegram_connections/${task.uid}`);
                const connRes = await axios.get(connUrl);
                const connFields = connRes.data.fields || {};
                const connStatus = connFields.connected?.booleanValue || false;
                const cId = connFields.telegram_chat_id?.stringValue || "";
                if (connStatus && cId) {
                    chatId = cId;
                    isConnected = true;
                }
            } catch (e) {
                // Connection doc not found or error
            }
        }

        if (!isConnected || !chatId) {
            continue;
        }

        // Evaluate Reminder Windows
        const reminderWindows = [];
        const option = task.waktu_pengingat || "";

        if (option === "30_mins" || option === "30_menit") {
            if (diffHours <= 0.5) reminderWindows.push({ type: "30_mins", label: "30 menit" });
        } else if (option === "1_hour" || option === "1_jam") {
            if (diffHours <= 1.0) reminderWindows.push({ type: "1_hour", label: "1 jam" });
        } else if (option === "2_hours" || option === "2_jam") {
            if (diffHours <= 2.0) reminderWindows.push({ type: "2_hours", label: "2 jam" });
        } else if (option === "3_hours" || option === "3_jam") {
            if (diffHours <= 3.0) reminderWindows.push({ type: "3_hours", label: "3 jam" });
        } else if (option === "1_day" || option === "1_hari") {
            if (diffHours <= 24.0) reminderWindows.push({ type: "1_day", label: "1 hari" });
        } else if (option === "2_days" || option === "2_hari") {
            if (diffHours <= 48.0 && diffHours > 24.0) reminderWindows.push({ type: "2_days", label: "2 hari" });
        }

        if (diffHours <= 24.0 && !reminderWindows.some((r) => r.type === "1_day")) {
            reminderWindows.push({ type: "1_day", label: "1 hari (Besok)" });
        } else if (diffHours <= 48.0 && diffHours > 24.0 && !reminderWindows.some((r) => r.type === "2_days")) {
            reminderWindows.push({ type: "2_days", label: "2 hari" });
        }

        for (const remWindow of reminderWindows) {
            const reminderId = `${taskId}_${remWindow.type}`;
            let exists = false;

            if (useAdminSdk) {
                const remSnap = await dbAdmin.collection("telegram_reminders").doc(reminderId).get();
                exists = remSnap.exists;
            } else {
                try {
                    const remUrl = getFirestoreUrl(`telegram_reminders/${reminderId}`);
                    const remRes = await axios.get(remUrl);
                    if (remRes.data && remRes.data.fields) exists = true;
                } catch (e) {
                    exists = false;
                }
            }

            if (exists) {
                skippedCount++;
                continue;
            }

            const formattedDeadline = formatDeadlineWib(deadline);
            const msgText = `🔔 <b>PENGINGAT TUGAS MYTASK</b>\n\n📚 <b>Mata Kuliah:</b>\n${task.matkul || "-"}\n\n📝 <b>Tugas:</b>\n${task.judul || "-"}\n\n⏰ <b>Deadline:</b>\n${formattedDeadline}\n\n⚠️ <b>Waktu Tersisa:</b>\n${remWindow.label}\n\n📌 <b>Status:</b>\n${task.status || "new"}\n\nBuka MyTask untuk melihat detail tugas.`;

            const result = await sendTelegramNotification(chatId, msgText, taskId);

            if (result.success) {
                if (useAdminSdk) {
                    await dbAdmin.collection("telegram_reminders").doc(reminderId).set({
                        task_id: taskId,
                        uid: task.uid,
                        id_user: task.id_user || task.user_id || task.uid,
                        telegram_chat_id: String(chatId),
                        reminder_type: remWindow.type,
                        deadline: task.deadline,
                        sent_at: admin.firestore.FieldValue.serverTimestamp(),
                        status: "sent"
                    });
                } else {
                    const saveRemUrl = getFirestoreUrl(`telegram_reminders/${reminderId}`);
                    await axios.patch(saveRemUrl, {
                        fields: {
                            task_id: { stringValue: taskId },
                            uid: { stringValue: task.uid },
                            id_user: { stringValue: task.id_user || task.user_id || task.uid },
                            telegram_chat_id: { stringValue: String(chatId) },
                            reminder_type: { stringValue: remWindow.type },
                            sent_at: { timestampValue: new Date().toISOString() },
                            status: { stringValue: "sent" }
                        }
                    });
                }

                sentCount++;
                console.log(`✅ Reminder Telegram terkirim [${remWindow.type}] untuk task: ${task.judul}`);
            } else {
                skippedCount++;
            }
        }
    }

    console.log(`🎉 Selesai! Reminder terkirim: ${sentCount}, Skip (idempotent/belum waktunya): ${skippedCount}`);
}

runReminderEngine()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("❌ Fatal Error pada Reminder Engine:", err);
        process.exit(1);
    });