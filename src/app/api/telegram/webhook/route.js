import { NextResponse } from "next/server";
import admin from "firebase-admin";

function formatPrivateKey(key) {
    if (!key) return undefined;
    let formatted = key.trim();
    if ((formatted.startsWith('"') && formatted.endsWith('"')) || (formatted.startsWith("'") && formatted.endsWith("'"))) {
        formatted = formatted.slice(1, -1).trim();
    }
    formatted = formatted.replace(/\\n/g, "\n");
    if (!formatted.includes("-----BEGIN PRIVATE KEY-----") && !formatted.includes("-----BEGIN RSA PRIVATE KEY-----")) {
        try {
            const decoded = Buffer.from(formatted, "base64").toString("utf8");
            if (decoded.includes("-----BEGIN PRIVATE KEY-----") || decoded.includes("-----BEGIN RSA PRIVATE KEY-----")) {
                formatted = decoded;
            }
        } catch (e) {}
    }
    return formatted.replace(/\r\n/g, "\n");
}

const projectId = process.env.FIREBASE_PROJECT_ID || process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const privateKey = formatPrivateKey(process.env.FIREBASE_PRIVATE_KEY);

// Initialize Firebase Admin if Service Account credentials are provided
if (!admin.apps.length && projectId && clientEmail && privateKey) {
    try {
        admin.initializeApp({
            credential: admin.credential.cert({
                projectId,
                clientEmail,
                privateKey
            })
        });
    } catch (e) {
        console.warn("Firebase Admin Init Warning:", e.message);
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

function getFirestoreRestUrl(docPath, params = "") {
    const keyQuery = apiKey ? `key=${apiKey}` : "";
    const combinedParams = [keyQuery, params].filter(Boolean).join("&");
    const queryStr = combinedParams ? `?${combinedParams}` : "";
    return `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${docPath}${queryStr}`;
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

            let uid = null;
            let idUser = null;
            let isUsed = false;
            let expiresAtMs = 0;

            // Option A: Use Firebase Admin SDK if initialized
            if (admin.apps.length) {
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
                uid = tokenData.uid;
                idUser = tokenData.id_user || uid;
                isUsed = tokenData.used || false;

                if (tokenData.expires_at?.toMillis) {
                    expiresAtMs = tokenData.expires_at.toMillis();
                } else if (tokenData.expires_at?.seconds) {
                    expiresAtMs = tokenData.expires_at.seconds * 1000;
                } else if (tokenData.expires_at) {
                    expiresAtMs = new Date(tokenData.expires_at).getTime();
                }

                if (isUsed) {
                    await sendTelegramMessage(botToken, chatId, "❌ Link koneksi ini sudah pernah digunakan.\n\nSilakan kembali ke MyTask dan buat link baru.");
                    return NextResponse.json({ status: "token_used" });
                }

                if (expiresAtMs > 0 && Date.now() > expiresAtMs) {
                    await sendTelegramMessage(botToken, chatId, "❌ Link koneksi sudah expired.\n\nSilakan kembali ke MyTask dan buat link baru.");
                    return NextResponse.json({ status: "token_expired" });
                }

                // Write Connection
                await db.collection("telegram_connections").doc(uid).set({
                    uid: uid,
                    id_user: idUser,
                    telegram_chat_id: String(chatId),
                    telegram_username: username,
                    connected: true,
                    created_at: admin.firestore.FieldValue.serverTimestamp(),
                    updated_at: admin.firestore.FieldValue.serverTimestamp()
                }, { merge: true });

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
                    console.warn("User doc update error:", e.message);
                }

                // Mark Token Used
                await tokenDocRef.update({
                    used: true,
                    used_at: admin.firestore.FieldValue.serverTimestamp()
                });

            } else {
                // Option B: Use Firestore REST API (Works without Service Account Keys!)
                const tokenRestUrl = getFirestoreRestUrl(`telegram_connection_tokens/${token}`);
                const tokenRes = await fetch(tokenRestUrl);

                if (!tokenRes.ok) {
                    await sendTelegramMessage(
                        botToken,
                        chatId,
                        "❌ Link koneksi tidak ditemukan atau tidak valid.\n\nSilakan kembali ke MyTask dan buat link baru."
                    );
                    return NextResponse.json({ status: "invalid_token" });
                }

                const tokenDoc = await tokenRes.json();
                const fields = tokenDoc.fields || {};
                isUsed = fields.used?.booleanValue || false;

                if (isUsed) {
                    await sendTelegramMessage(botToken, chatId, "❌ Link koneksi ini sudah pernah digunakan.\n\nSilakan kembali ke MyTask dan buat link baru.");
                    return NextResponse.json({ status: "token_used" });
                }

                const expiresAtStr = fields.expires_at?.timestampValue || fields.expires_at?.stringValue;
                if (expiresAtStr) {
                    expiresAtMs = new Date(expiresAtStr).getTime();
                    if (Date.now() > expiresAtMs) {
                        await sendTelegramMessage(botToken, chatId, "❌ Link koneksi sudah expired.\n\nSilakan kembali ke MyTask dan buat link baru.");
                        return NextResponse.json({ status: "token_expired" });
                    }
                }

                uid = fields.uid?.stringValue;
                idUser = fields.id_user?.stringValue || uid;

                if (!uid) {
                    await sendTelegramMessage(botToken, chatId, "❌ Data token tidak lengkap.");
                    return NextResponse.json({ status: "incomplete_token" }, { status: 400 });
                }

                // Write Connection via REST API
                const connUrl = getFirestoreRestUrl(`telegram_connections/${uid}`);
                await fetch(connUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fields: {
                            uid: { stringValue: uid },
                            id_user: { stringValue: idUser },
                            telegram_chat_id: { stringValue: String(chatId) },
                            telegram_username: { stringValue: username },
                            connected: { booleanValue: true },
                            created_at: { timestampValue: new Date().toISOString() },
                            updated_at: { timestampValue: new Date().toISOString() }
                        }
                    })
                });

                // Update users doc via REST API
                try {
                    const userUrl = getFirestoreRestUrl(`users/${uid}`, "updateMask.fieldPaths=telegram");
                    await fetch(userUrl, {
                        method: "PATCH",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
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
                        })
                    });
                } catch (errUser) {
                    console.warn("User update REST warning:", errUser.message);
                }

                // Mark Token Used via REST API
                const markTokenUrl = getFirestoreRestUrl(`telegram_connection_tokens/${token}`, "updateMask.fieldPaths=used");
                await fetch(markTokenUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        fields: {
                            used: { booleanValue: true }
                        }
                    })
                });
            }

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
