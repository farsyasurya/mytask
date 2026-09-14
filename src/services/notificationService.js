import { db } from "@/lib/firebase";
import {
    collection,
    query,
    where,
    updateDoc,
    deleteDoc,
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
export const createStudentTaskNotifications = async (createdTasks, taskData, broadcastId) => {
    try {
        for (const taskItem of createdTasks) {
            if (taskItem.role === "ADMIN") continue;
            const notifRef = doc(collection(db, "notifications"));
            await setDoc(notifRef, {
                userId: taskItem.uid || taskItem.user_id,
                taskId: taskItem.id,
                task_id: taskItem.task_id || null,
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

// Hapus seluruh dokumen notifikasi yang terkait dengan broadcast_id atau groupKey tertentu
export const deleteNotificationsByBroadcastId = async (broadcastId, groupKey = "") => {
    try {
        const qNotifs = collection(db, "notifications");
        const snap = await getDocs(qNotifs);
        const deletePromises = [];
        snap.forEach((docSnap) => {
            const data = docSnap.data();
            const matchBroadcast = broadcastId && data.broadcast_id === broadcastId;
            let matchKey = false;
            if (groupKey && data.matkul && data.pertemuan) {
                if (groupKey.includes(data.matkul) && groupKey.includes(String(data.pertemuan))) {
                    matchKey = true;
                }
            }
            if (matchBroadcast || matchKey) {
                deletePromises.push(deleteDoc(doc(db, "notifications", docSnap.id)));
            }
        });
        await Promise.all(deletePromises);
    } catch (err) {
        console.error("Gagal menghapus notifikasi tugas broadcast:", err);
    }
};

// Hapus dokumen notifikasi spesifik berdasarkan taskId
export const deleteNotificationsByTaskId = async (taskId) => {
    if (!taskId) return;
    try {
        const qNotifs = query(
            collection(db, "notifications"),
            where("taskId", "==", taskId)
        );
        const snap = await getDocs(qNotifs);
        const deletePromises = [];
        snap.forEach((docSnap) => {
            deletePromises.push(deleteDoc(doc(db, "notifications", docSnap.id)));
        });
        await Promise.all(deletePromises);
    } catch (err) {
        console.error("Gagal menghapus notifikasi taskId:", err);
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

// Membersihkan notifikasi mahasiswa jika terbuat untuk akun Admin
export const cleanupAdminNotifications = async (adminUid) => {
    if (!adminUid) return;
    try {
        const qNotifs = query(
            collection(db, "notifications"),
            where("userId", "==", adminUid)
        );
        const snap = await getDocs(qNotifs);
        const deletePromises = [];
        snap.forEach((d) => {
            deletePromises.push(deleteDoc(doc(db, "notifications", d.id)));
        });
        await Promise.all(deletePromises);
    } catch (err) {
        console.error("Gagal membersihkan notifikasi admin:", err);
    }
};