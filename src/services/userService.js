import { db } from "@/lib/firebase";
import {
    doc,
    getDoc,
    setDoc,
    updateDoc,
    collection,
    query,
    where,
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

export async function createUserProfile(uid, name, email, kelas = "01TPLE002", role = "USER", nim = "", nickname = "") {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);

    const defaultNickname = nickname ? nickname.trim() : (name ? name.trim().split(" ")[0] : "");

    if (!userSnap.exists()) {
        const customId = await generateCustomUserId();
        const userData = {
            uid: uid,
            id_user: customId,
            name: name ? name.trim() : "",
            nickname: defaultNickname,
            nim: nim ? nim.trim() : "",
            email: email,
            kelas: kelas || "01TPLE002",
            role: role || "USER",
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
    const data = userSnap.data();
    // Default fallback values for legacy accounts without kelas / role / nim / nickname
    return {
        ...data,
        nickname: data.nickname || defaultNickname,
        nim: data.nim || "",
        kelas: data.kelas || "01TPLE002",
        role: data.role || "USER"
    };
}

export async function getUserProfile(uid) {
    const userRef = doc(db, "users", uid);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
        const data = userSnap.data();
        return {
            ...data,
            nickname: data.nickname || (data.name ? data.name.trim().split(" ")[0] : ""),
            nim: data.nim || "",
            kelas: data.kelas || "01TPLE002",
            role: data.role || "USER"
        };
    }
    return null;
}

export async function getUsersByKelas(kelasCode = "01TPLE002") {
    const q = query(
        collection(db, "users"),
        where("kelas", "==", kelasCode)
    );
    const querySnapshot = await getDocs(q);
    const users = [];
    querySnapshot.forEach((docSnap) => {
        users.push({ id: docSnap.id, ...docSnap.data() });
    });
    return users;
}