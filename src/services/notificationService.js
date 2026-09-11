import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    updateDoc,
    doc,
    setDoc,
    getDocs,
    serverTimestamp,
    onSnapshot
} from "firebase/firestore";

// Realtime Listener untuk Notifikasi User (Client-side sorting)
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

// Kirim dokumen notifikasi tugas baru dari Admin ke tiap mahasiswa di kelas
export const createStudentTaskNotifications = async (targetUsers, taskData, broadcastId) => {
    try {
        for (const u of targetUsers) {
            const notifRef = doc(collection(db, "notifications"));
            await setDoc(notifRef, {
                userId: u.uid || u.id,
                type: "new_task",
                category: "Tugas Baru",
                title: `📌 Tugas Baru: ${taskData.judul}`,
                message: `Admin telah merilis tugas baru untuk ${taskData.matkul} Pertemuan ${taskData.pertemuan}. Deadline: ${new Date(taskData.deadline).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })} WIB.`,
                matkul: taskData.matkul,
                pertemuan: taskData.pertemuan,
                broadcast_id: broadcastId,
                read: false,
                createdAt: serverTimestamp()
            });
        }
    } catch (err) {
        console.error("Gagal membuat dokumen notifikasi tugas baru:", err);
    }
};

// Tandai notifikasi sebagai dibaca di Firestore
export const markAsRead = async (notifId) => {
    try {
        const ref = doc(db, "notifications", notifId);
        await updateDoc(ref, { read: true });
    } catch (err) {
        console.error("Gagal update status dibaca notifikasi:", err);
    }
};