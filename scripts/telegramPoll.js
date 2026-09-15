const axios = require("axios");
const fs = require("fs");
const path = require("path");

// Load .env file manually if process.env values are missing
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

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

if (!TELEGRAM_BOT_TOKEN) {
    console.error("❌ TELEGRAM_BOT_TOKEN tidak ditemukan di file .env");
    process.exit(1);
}

if (!FIREBASE_PROJECT_ID) {
    console.error("❌ FIREBASE_PROJECT_ID / NEXT_PUBLIC_FIREBASE_PROJECT_ID tidak ditemukan di .env");
    process.exit(1);
}

console.log(`🤖 Telegram Polling Runner aktif untuk Bot Token: ${TELEGRAM_BOT_TOKEN.slice(0, 10)}...`);
console.log(`🔥 Firebase Project ID: ${FIREBASE_PROJECT_ID}`);
console.log("-------------------------------------------------------");
console.log("Mendengarkan pesan Telegram secara realtime (long-polling)...");
console.log("Silakan kirim /start <token> dari Telegram bot Anda.");

let offset = 0;

async function sendTelegramMessage(chatId, text) {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    try {
        await axios.post(url, {
            chat_id: chatId,
            text: text,
            parse_mode: "HTML"
        });
    } catch (err) {
        console.error("Gagal membalas pesan Telegram:", err.response?.data || err.message);
    }
}

function getFirestoreUrl(docPath, params = "") {
    const keyQuery = FIREBASE_API_KEY ? `key=${FIREBASE_API_KEY}` : "";
    const combinedParams = [keyQuery, params].filter(Boolean).join("&");
    const queryStr = combinedParams ? `?${combinedParams}` : "";
    return `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/${docPath}${queryStr}`;
}

async function handleMessage(msg) {
    if (!msg || !msg.text) return;

    const chatId = msg.chat.id;
    const text = msg.text.trim();
    const username = msg.from?.username || "";

    console.log(`📩 Pesan masuk dari Chat ID ${chatId} (${username ? "@" + username : "No Username"}): "${text}"`);

    if (text.startsWith("/start")) {
        const parts = text.split(" ");
        const token = parts[1]?.trim();

        if (!token) {
            await sendTelegramMessage(
                chatId,
                "👋 Selamat datang di <b>MyTask Reminder Bot</b>!\n\nUntuk menghubungkan akun MyTask Anda, silakan buka aplikasi MyTask > <b>Pengaturan Profil</b> > <b>Hubungkan Telegram</b>."
            );
            return;
        }

        console.log(`🔍 Memvalidasi token: "${token}"...`);

        // Fetch token document from Firestore REST API with API Key
        const tokenUrl = getFirestoreUrl(`telegram_connection_tokens/${token}`);

        try {
            const tokenRes = await axios.get(tokenUrl);
            const tokenDoc = tokenRes.data;
            const fields = tokenDoc.fields || {};
            const used = fields.used?.booleanValue || false;

            if (used) {
                console.log(`❌ Token ${token} sudah pernah digunakan.`);
                await sendTelegramMessage(
                    chatId,
                    "❌ Link koneksi ini sudah pernah digunakan.\n\nSilakan kembali ke MyTask dan buat link baru."
                );
                return;
            }

            // Expiration check
            const expiresAtStr = fields.expires_at?.timestampValue || fields.expires_at?.stringValue;
            if (expiresAtStr) {
                const expiresAtMs = new Date(expiresAtStr).getTime();
                if (Date.now() > expiresAtMs) {
                    console.log(`❌ Token ${token} sudah expired.`);
                    await sendTelegramMessage(
                        chatId,
                        "❌ Link koneksi sudah expired.\n\nSilakan kembali ke MyTask dan buat link baru."
                    );
                    return;
                }
            }

            const uid = fields.uid?.stringValue;
            const idUser = fields.id_user?.stringValue || uid;

            if (!uid) {
                await sendTelegramMessage(chatId, "❌ Data token tidak lengkap.");
                return;
            }

            // 1. Write connection document to `telegram_connections/{uid}`
            const connUrl = getFirestoreUrl(`telegram_connections/${uid}`);
            const connBody = {
                fields: {
                    uid: { stringValue: uid },
                    id_user: { stringValue: idUser },
                    telegram_chat_id: { stringValue: String(chatId) },
                    telegram_username: { stringValue: username },
                    connected: { booleanValue: true },
                    created_at: { timestampValue: new Date().toISOString() },
                    updated_at: { timestampValue: new Date().toISOString() }
                }
            };

            await axios.patch(connUrl, connBody);

            // 2. Update users/{uid} for compatibility
            try {
                const userUrl = getFirestoreUrl(`users/${uid}`, "updateMask.fieldPaths=telegram");
                const userBody = {
                    fields: {
                        telegram: {
                            mapValue: {
                                fields: {
                                    connected: { booleanValue: true },
                                    chat_id: { stringValue: String(chatId) },
                                    username: { stringValue: username },
                                    connectedAt: { timestampValue: new Date().toISOString() }
                                }
                            }
                        }
                    }
                };
                await axios.patch(userUrl, userBody);
            } catch (errUser) {
                console.warn("Update user doc warning:", errUser.message);
            }

            // 3. Mark token as used
            const markTokenUrl = getFirestoreUrl(`telegram_connection_tokens/${token}`, "updateMask.fieldPaths=used");
            const markTokenBody = {
                fields: {
                    used: { booleanValue: true }
                }
            };
            await axios.patch(markTokenUrl, markTokenBody);

            console.log(`✅ Sukses! User ${uid} terhubung dengan Telegram Chat ID ${chatId}`);

            // 4. Send Success Telegram Message
            await sendTelegramMessage(
                chatId,
                "✅ <b>Telegram berhasil terhubung!</b>\n\nSekarang kamu akan menerima pengingat tugas dari MyTask secara otomatis."
            );

        } catch (err) {
            console.error(`❌ Gagal mengambil token "${token}":`, err.response?.data || err.message);
            await sendTelegramMessage(
                chatId,
                "❌ Link koneksi tidak ditemukan atau tidak valid.\n\nSilakan kembali ke MyTask dan buat link baru."
            );
        }
    }
}

async function pollUpdates() {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${offset}&timeout=10`;

    try {
        const res = await axios.get(url);
        const updates = res.data?.result || [];

        for (const update of updates) {
            offset = update.update_id + 1;
            if (update.message) {
                await handleMessage(update.message);
            }
        }
    } catch (err) {
        if (err.response?.status === 409) {
            console.warn("⚠️ Warning 409: Webhook sedang aktif di URL luar. Menghapus webhook untuk mode polling...");
            try {
                await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/deleteWebhook`);
                console.log("✅ Webhook berhasil dihapus. Polling akan dilanjutkan.");
            } catch (e) {
                console.error("Gagal menghapus webhook:", e.message);
            }
        } else {
            console.error("Polling error:", err.message);
        }
        await new Promise((r) => setTimeout(r, 3000));
    }

    setTimeout(pollUpdates, 1000);
}

pollUpdates();
