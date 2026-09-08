import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    setDoc,
    updateDoc,
    Timestamp,
    serverTimestamp
} from "firebase/firestore";

export async function createTelegramLinkToken(uid, userId) {
    // Generate temporary random token
    const randomToken = "LINK_" + Math.random().toString(36).substring(2, 12).toUpperCase();

    // Set expiration for 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    const linkRef = doc(collection(db, "telegram_links"));
    await setDoc(linkRef, {
        token: randomToken,
        uid: uid,
        user_id: userId,
        expiresAt: Timestamp.fromDate(expiresAt),
        used: false,
        createdAt: serverTimestamp()
    });

    return randomToken;
}

export async function disconnectTelegram(uid) {
    const userRef = doc(db, "users", uid);
    await updateDoc(userRef, {
        "telegram.connected": false,
        "telegram.chat_id": null,
        "telegram.username": null,
        "telegram.connectedAt": null,
        updatedAt: serverTimestamp()
    });
}