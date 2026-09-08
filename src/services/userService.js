import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    runTransaction
} from "firebase/firestore";

/**
 * Generates sequential user ID (USR-000001 format) using Firestore Transaction
 */
export async function generateCustomUserId() {
    const counterRef = doc(db, "counters", "users_counter");

    return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextCount = 1;

        if (counterDoc.exists()) {
            nextCount = counterDoc.data().current + 1;
        }

        transaction.set(counterRef, { current: nextCount }, { merge: true });

        const formattedId = `USR-${String(nextCount).padStart(6, '0')}`;
        return formattedId;
    });
}

export async function createUserProfile(uid, name, email) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
        const customId = await generateCustomUserId();
        const userData = {
            uid: uid,
            id_user: customId,
            name: name,
            email: email,
            telegram: {
                connected: false,
                chat_id: null,
                username: null,
                connectedAt: null
            },
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        };
        await setDoc(userRef, userData);
        return userData;
    }
    return userSnap.data();
}

export async function getUserProfile(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        console.log(userSnap.data())
        return userSnap.data();

    }
    return null;
}