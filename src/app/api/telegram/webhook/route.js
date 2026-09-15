import { NextResponse } from "next/server";
import admin from "firebase-admin";

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY
        ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n")
        : undefined;

    if (projectId && clientEmail && privateKey) {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });
    }
}

async function sendTelegramMessage(botToken, chatId, text) {
    const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
    await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            chat_id: chatId,
            text: text,
            parse_mode: "HTML"
        })
    });
}

export async function POST(req) {
    const botToken = process.env.TELEGRAM_BOT_TOKEN;
    if (!botToken) {
        return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN missing" }, { status: 500 });
    }

    try {
        const body = await req.json();
        const message = body?.message;
        if (!message || !message.text) {
            return NextResponse.json({ status: "ignored" });
        }

        const chatId = message.chat.id;
        const text = message.text.trim();
        const username = message.from?.username || "";

        // Check command format: /start <token>
        if (text.startsWith("/start")) {
            const parts = text.split(" ");
            const token = parts[1]?.trim();

            if (!token) {
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    "👋 Selamat datang di <b>MyTask Reminder Bot</b>!\n\nUntuk menghubungkan akun MyTask Anda, silakan buka aplikasi MyTask > <b>Pengaturan Profil</b> > <b>Hubungkan Telegram</b>."
                );
                return NextResponse.json({ status: "ok" });
            }

            // Validate token from Firestore telegram_connection_tokens
            if (!admin.apps.length) {
                await sendTelegramMessage(botToken, chatId, "❌ Server Error: Credentials Firebase Admin belum dikonfigurasi.");
                return NextResponse.json({ error: "Firebase admin uninitialized" }, { status: 500 });
            }

            const db = admin.firestore();
            const tokenDocRef = db.collection("telegram_connection_tokens").doc(token);
            const tokenSnap = await tokenDocRef.get();

            if (!tokenSnap.exists) {
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    "❌ Link koneksi tidak ditemukan atau tidak valid.\n\nSilakan kembali ke MyTask dan buat link baru."
                );
                return NextResponse.json({ status: "invalid_token" });
            }

            const tokenData = tokenSnap.data();

            // Check if used
            if (tokenData.used) {
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    "❌ Link koneksi ini sudah pernah digunakan.\n\nSilakan kembali ke MyTask dan buat link baru."
                );
                return NextResponse.json({ status: "token_used" });
            }

            // Check expiration
            let expiresAtMs = 0;
            if (tokenData.expires_at?.toMillis) {
                expiresAtMs = tokenData.expires_at.toMillis();
            } else if (tokenData.expires_at?.seconds) {
                expiresAtMs = tokenData.expires_at.seconds * 1000;
            } else if (tokenData.expires_at) {
                expiresAtMs = new Date(tokenData.expires_at).getTime();
            }

            if (expiresAtMs > 0 && Date.now() > expiresAtMs) {
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    "❌ Link koneksi sudah expired.\n\nSilakan kembali ke MyTask dan buat link baru."
                );
                return NextResponse.json({ status: "token_expired" });
            }

            // Valid Token -> Process Connection
            const { uid, id_user } = tokenData;

            // Save to telegram_connections/{uid}
            await db.collection("telegram_connections").doc(uid).set({
                uid: uid,
                id_user: id_user || uid,
                telegram_chat_id: String(chatId),
                telegram_username: username,
                connected: true,
                created_at: admin.firestore.FieldValue.serverTimestamp(),
                updated_at: admin.firestore.FieldValue.serverTimestamp()
            }, { merge: true });

            // Update user profile for compatibility
            try {
                await db.collection("users").doc(uid).set({
                    telegram: {
                        connected: true,
                        chat_id: String(chatId),
                        username: username,
                        connectedAt: admin.firestore.FieldValue.serverTimestamp()
                    },
                    updatedAt: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });
            } catch (e) {
                console.warn("Update user doc error:", e.message);
            }

            // Mark token as used
            await tokenDocRef.update({
                used: true,
                used_at: admin.firestore.FieldValue.serverTimestamp()
            });

            // Send Success Telegram Message
            await sendTelegramMessage(
                botToken,
                chatId,
                "✅ <b>Telegram berhasil terhubung!</b>\n\nSekarang kamu akan menerima pengingat tugas dari MyTask secara otomatis."
            );

            return NextResponse.json({ status: "success" });
        }

        return NextResponse.json({ status: "ignored" });
    } catch (err) {
        console.error("Telegram Webhook Error:", err);
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
