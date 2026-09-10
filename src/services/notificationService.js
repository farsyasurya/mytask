import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    updateDoc,
    doc,
    onSnapshot
} from "firebase/firestore";

// Realtime Listener untuk Badge Angka & Popup (Client-side sorting agar tidak error karena missing composite index)
export const subscribeNotifications = (userId, callback) => {
    if (!userId) return () => {};

    const q = query(
        collection(db, "notifications"),
        where("userId", "==", userId)
    );

    return onSnapshot(
        q,
        (snapshot) => {
            const notifs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            
            // Sort client-side secara desc berdasarkan waktu dibuat (createdAt)
            notifs.sort((a, b) => {
                const ta = a.createdAt?.seconds
                    ? a.createdAt.seconds * 1000
                    : (a.createdAt ? new Date(a.createdAt).getTime() : Date.now());
                const tb = b.createdAt?.seconds
                    ? b.createdAt.seconds * 1000
                    : (b.createdAt ? new Date(b.createdAt).getTime() : Date.now());
                return tb - ta;
            });

            callback(notifs);
        },
        (error) => {
            console.error("Gagal berlangganan notifikasi realtime:", error);
        }
    );
};

// Tandai notifikasi sebagai dibaca
export const markAsRead = async (notifId) => {
    try {
        const ref = doc(db, "notifications", notifId);
        await updateDoc(ref, { read: true });
    } catch (err) {
        console.error("Gagal update status dibaca notifikasi:", err);
    }
};