import { db } from "@/lib/firebase";
import {
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    updateDoc,
    deleteDoc,
    query,
    where,
    orderBy,
    serverTimestamp,
    Timestamp,
    runTransaction
} from "firebase/firestore";

/**
 * Generates sequential task ID (TASK-000001 format)
 */
async function generateTaskId() {
    const counterRef = doc(db, "counters", "tasks_counter");
    return await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextCount = 1;
        if (counterDoc.exists()) {
            nextCount = counterDoc.data().current + 1;
        }
        transaction.set(counterRef, { current: nextCount }, { merge: true });
        return `TASK-${String(nextCount).padStart(6, '0')}`;
    });
}

export async function createTask(uid, userId, taskData) {
    const taskId = await generateTaskId();
    const taskRef = doc(collection(db, "tasks"));

    // Ensure deadline is stored as Firebase Timestamp
    const deadlineTimestamp = Timestamp.fromDate(new Date(taskData.deadline));

    const payload = {
        task_id: taskId,
        uid: uid,
        user_id: userId,
        judul: taskData.judul,
        deskripsi: taskData.deskripsi || "",
        matkul: taskData.matkul,
        jenis_tugas: taskData.jenis_tugas || [],
        jenis_tugas_lainnya: taskData.jenis_tugas.includes("lainnya") ? (taskData.jenis_tugas_lainnya || null) : null,
        status: taskData.status || "new",
        deadline: deadlineTimestamp,
        pertemuan: parseInt(taskData.pertemuan, 10),
        reminder: {
            wajib: {
                dua_hari: true,
                satu_hari: true
            },
            khusus: taskData.reminder_khusus || []
        },
        reminder_status: {
            dua_hari: false,
            satu_hari: false,
            khusus: (taskData.reminder_khusus || []).map((rem) => ({
                reminder_id: rem.id,
                sent: false,
                sentAt: null
            }))
        },
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
    };

    await setDoc(taskRef, payload);
    return { id: taskRef.id, ...payload };
}

export async function getUserTasks(uid) {
    const q = query(
        collection(db, "tasks"),
        where("uid", "==", uid),
        orderBy("deadline", "asc")
    );
    const querySnapshot = await getDocs(q);
    const tasks = [];
    querySnapshot.forEach((docSnap) => {
        tasks.push({ id: docSnap.id, ...docSnap.data() });
    });
    return tasks;
}

export async function updateTask(docId, taskData) {
    const taskRef = doc(db, "tasks", docId);
    const deadlineTimestamp = Timestamp.fromDate(new Date(taskData.deadline));

    const updatePayload = {
        judul: taskData.judul,
        deskripsi: taskData.deskripsi || "",
        matkul: taskData.matkul,
        jenis_tugas: taskData.jenis_tugas || [],
        jenis_tugas_lainnya: taskData.jenis_tugas.includes("lainnya") ? (taskData.jenis_tugas_lainnya || null) : null,
        status: taskData.status,
        deadline: deadlineTimestamp,
        pertemuan: parseInt(taskData.pertemuan, 10),
        "reminder.khusus": taskData.reminder_khusus || [],
        updatedAt: serverTimestamp()
    };

    await updateDoc(taskRef, updatePayload);
}

export async function updateTaskStatus(docId, newStatus) {
    const taskRef = doc(db, "tasks", docId);
    await updateDoc(taskRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
    });
}

export async function deleteTask(docId) {
    const taskRef = doc(db, "tasks", docId);
    await deleteDoc(taskRef);
}