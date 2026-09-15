import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    Timestamp,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";

/**
 * Creates a secure connection token in `telegram_connection_tokens/{token}`
 * and returns the deep-link URL to connect with the Telegram Bot.
 */
export async function createTelegramLinkToken(uid, userId) {
    if (!uid) throw new Error("UID is required to generate Telegram connection token.");

    // Generate a secure random token
    let tokenStr = "";
    if (typeof window !== "undefined" && window.crypto && window.crypto.getRandomValues) {
        const array = new Uint8Array(16);
        window.crypto.getRandomValues(array);
        tokenStr = Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join("");
    } else {
        tokenStr = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    }

    // Expiration: 15 minutes from now
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const tokenRef = doc(db, "telegram_connection_tokens", tokenStr);
    await setDoc(tokenRef, {
        uid: uid,
        id_user: userId || uid,
        token: tokenStr,
        expires_at: Timestamp.fromDate(expiresAt),
        used: false,
        created_at: serverTimestamp()
    });

    const botUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME || "MyTaskReminderBot";
    const telegramLink = `https://t.me/${botUsername}?start=${tokenStr}`;

    return {
        token: tokenStr,
        telegramLink,
        botUsername
    };
}

/**
 * Realtime listener for user's Telegram connection status from `telegram_connections/{uid}`
 */
export function subscribeTelegramConnection(uid, callback) {
    if (!uid) return () => {};
    const connRef = doc(db, "telegram_connections", uid);
    return onSnapshot(
        connRef,
        (snapshot) => {
            if (snapshot.exists()) {
                callback({ id: snapshot.id, ...snapshot.data() });
            } else {
                callback(null);
            }
        },
        (error) => {
            console.error("Error subscribing to Telegram connection:", error);
            callback(null);
        }
    );
}

/**
 * Gets Telegram connection data once for user
 */
export async function getTelegramConnection(uid) {
    if (!uid) return null;
    const connRef = doc(db, "telegram_connections", uid);
    const snap = await getDoc(connRef);
    if (snap.exists()) {
        return { id: snap.id, ...snap.data() };
    }
    return null;
}

/**
 * Disconnect Telegram for user
 */
export async function disconnectTelegram(uid) {
    if (!uid) return;

    // 1. Update telegram_connections collection
    const connRef = doc(db, "telegram_connections", uid);
    await setDoc(
        connRef,
        {
            connected: false,
            telegram_chat_id: null,
            telegram_username: null,
            updated_at: serverTimestamp()
        },
        { merge: true }
    );

    // 2. Also update users collection for backwards compatibility
    try {
        const userRef = doc(db, "users", uid);
        await updateDoc(userRef, {
            "telegram.connected": false,
            "telegram.chat_id": null,
            "telegram.username": null,
            "telegram.connectedAt": null,
            updatedAt: serverTimestamp()
        });
    } catch (e) {
        console.warn("User doc update for telegram disconnect skipped:", e.message);
    }
}