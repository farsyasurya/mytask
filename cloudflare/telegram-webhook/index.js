/**
 * Cloudflare Worker for Telegram Bot Webhook
 * 
 * Environment Variables / Secrets required in Cloudflare Worker:
 * - TELEGRAM_BOT_TOKEN
 * - FIREBASE_PROJECT_ID
 * - MYTASK_URL (optional)
 */

export default {
    async fetch(request, env, ctx) {
        // Only accept POST requests from Telegram Webhook
        if (request.method !== "POST") {
            return new Response("OK", { status: 200 });
        }

        try {
            const update = await request.json();
            const message = update?.message;

            if (!message || !message.text) {
                return new Response(JSON.stringify({ status: "ignored" }), {
                    headers: { "Content-Type": "application/json" }
                });
            }

            const chatId = message.chat.id;
            const text = message.text.trim();
            const username = message.from?.username || "";
            const botToken = env.TELEGRAM_BOT_TOKEN;
            const projectId = env.FIREBASE_PROJECT_ID;

            if (text.startsWith("/start")) {
                const parts = text.split(" ");
                const token = parts[1]?.trim();

                if (!token) {
                    await sendTelegramMessage(
                        botToken,
                        chatId,
                        "👋 Selamat datang di <b>MyTask Reminder Bot</b>!\n\nUntuk menghubungkan akun MyTask Anda, silakan buka aplikasi MyTask > <b>Pengaturan Profil</b> > <b>Hubungkan Telegram</b>."
                    );
                    return new Response(JSON.stringify({ status: "ok" }), {
                        headers: { "Content-Type": "application/json" }
                    });
                }

                if (!projectId) {
                    await sendTelegramMessage(botToken, chatId, "❌ Server Error: FIREBASE_PROJECT_ID belum diatur.");
                    return new Response(JSON.stringify({ error: "Missing FIREBASE_PROJECT_ID" }), { status: 500 });
                }

                // 1. Fetch token document from Firestore REST API
                const tokenUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/telegram_connection_tokens/${token}`;
                const tokenRes = await fetch(tokenUrl);

                if (!tokenRes.ok) {
                    await sendTelegramMessage(
                        botToken,
                        chatId,
                        "❌ Link koneksi tidak ditemukan atau tidak valid.\n\nSilakan kembali ke MyTask dan buat link baru."
                    );
                    return new Response(JSON.stringify({ status: "invalid_token" }), {
                        headers: { "Content-Type": "application/json" }
                    });
                }

                const tokenDoc = await tokenRes.json();
                const fields = tokenDoc.fields || {};
                const used = fields.used?.booleanValue || false;

                if (used) {
                    await sendTelegramMessage(
                        botToken,
                        chatId,
                        "❌ Link koneksi ini sudah pernah digunakan.\n\nSilakan kembali ke MyTask dan buat link baru."
                    );
                    return new Response(JSON.stringify({ status: "token_used" }), {
                        headers: { "Content-Type": "application/json" }
                    });
                }

                // Expiration check
                const expiresAtStr = fields.expires_at?.timestampValue || fields.expires_at?.stringValue;
                if (expiresAtStr) {
                    const expiresAtMs = new Date(expiresAtStr).getTime();
                    if (Date.now() > expiresAtMs) {
                        await sendTelegramMessage(
                            botToken,
                            chatId,
                            "❌ Link koneksi sudah expired.\n\nSilakan kembali ke MyTask dan buat link baru."
                        );
                        return new Response(JSON.stringify({ status: "token_expired" }), {
                            headers: { "Content-Type": "application/json" }
                        });
                    }
                }

                const uid = fields.uid?.stringValue;
                const idUser = fields.id_user?.stringValue || uid;

                if (!uid) {
                    await sendTelegramMessage(botToken, chatId, "❌ Data token tidak lengkap.");
                    return new Response(JSON.stringify({ status: "incomplete_token" }), { status: 400 });
                }

                // 2. Write connection document to `telegram_connections/{uid}`
                const connUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/telegram_connections/${uid}`;
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

                await fetch(connUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(connBody)
                });

                // 3. Update users/{uid} for compatibility
                const userUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/users/${uid}?updateMask.fieldPaths=telegram`;
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

                await fetch(userUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(userBody)
                });

                // 4. Mark token as used
                const markTokenUrl = `${tokenUrl}?updateMask.fieldPaths=used`;
                const markTokenBody = {
                    fields: {
                        used: { booleanValue: true }
                    }
                };
                await fetch(markTokenUrl, {
                    method: "PATCH",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(markTokenBody)
                });

                // 5. Reply Telegram
                await sendTelegramMessage(
                    botToken,
                    chatId,
                    "✅ <b>Telegram berhasil terhubung!</b>\n\nSekarang kamu akan menerima pengingat tugas dari MyTask secara otomatis."
                );

                return new Response(JSON.stringify({ status: "success" }), {
                    headers: { "Content-Type": "application/json" }
                });
            }

            return new Response(JSON.stringify({ status: "ignored" }), {
                headers: { "Content-Type": "application/json" }
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 500,
                headers: { "Content-Type": "application/json" }
            });
        }
    }
};

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
