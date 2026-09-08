import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    getDocs,
    updateDoc,
    doc,
    onSnapshot,
    orderBy
} from "firebase/firestore";

// Realtime Listener untuk Badge Angka & Popup
export const subscribeNotifications = (userId, callback) => {
    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
    );

    return onSnapshot(q, (snapshot) => {
        const notifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        callback(notifs);
    });
};

// Tandai notifikasi sebagai dibaca
export const markAsRead = async (notifId) => {
    try {
        const ref = doc(db, "notifications", notifId);
        await updateDoc(ref, { read: true });
    } catch (err) {
        console.error("Gagal update notifikasi:", err);
    }
};