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
import { checkAndUpdateTaskReminders } from "@/services/reminderCheckService";

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

    // Trigger reminder check immediately for newly created task
    try {
        await checkAndUpdateTaskReminders(uid);
    } catch (e) {
        console.error("Auto reminder check error after createTask:", e);
    }

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

    // Trigger reminder check immediately for updated task
    if (taskData.uid) {
        try {
            await checkAndUpdateTaskReminders(taskData.uid);
        } catch (e) {
            console.error("Auto reminder check error after updateTask:", e);
        }
    }
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

/**
 * Creates and broadcasts a task for all users registered in a specific class
 */
export async function createAdminTaskForClass(selectedKelas, taskData) {
    try {
        // 1. Query users in selected class
        const qUsers = query(
            collection(db, "users"),
            where("kelas", "==", selectedKelas)
        );
        const usersSnapshot = await getDocs(qUsers);
        
        const targetUsers = [];
        usersSnapshot.forEach((docSnap) => {
            targetUsers.push({ id: docSnap.id, ...docSnap.data() });
        });

        if (targetUsers.length === 0) {
            throw new Error(`Tidak ditemukan mahasiswa terdaftar di kelas ${selectedKelas}`);
        }

        const deadlineTimestamp = Timestamp.fromDate(new Date(taskData.deadline));
        const createdTasks = [];
        const broadcastId = `BCAST-${Date.now()}`;

        for (const targetUser of targetUsers) {
            let taskId = `TASK-${Date.now().toString().slice(-6)}`;
            try {
                taskId = await generateTaskId();
            } catch (errCount) {
                console.warn("Transaction counter failed, fallback to timestamp ID:", errCount);
            }

            const taskRef = doc(collection(db, "tasks"));

            const payload = {
                task_id: taskId,
                broadcast_id: broadcastId,
                uid: targetUser.uid || targetUser.id,
                user_id: targetUser.id_user || targetUser.uid,
                kelas: selectedKelas,
                judul: taskData.judul,
                deskripsi: taskData.deskripsi || "",
                matkul: taskData.matkul,
                jenis_tugas: taskData.jenis_tugas || [],
                jenis_tugas_lainnya: (taskData.jenis_tugas || []).includes("lainnya") ? (taskData.jenis_tugas_lainnya || null) : null,
                status: "new",
                deadline: deadlineTimestamp,
                pertemuan: parseInt(taskData.pertemuan, 10),
                createdByAdmin: true,
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
            createdTasks.push({ id: taskRef.id, ...payload });
        }

        return {
            totalDistributed: createdTasks.length,
            kelas: selectedKelas,
            broadcast_id: broadcastId,
            tasks: createdTasks
        };
    } catch (err) {
        console.error("Detail Error createAdminTaskForClass:", err);
        if (err?.code === "permission-denied" || err?.message?.includes("permissions")) {
            throw new Error(
                "Akses Firestore ditolak (Missing permissions). Mohon pastikan Rules di Firebase Console sudah diizinkan untuk dibaca & ditulis oleh Admin."
            );
        }
        throw err;
    }
}

/**
 * Retrieves list of tasks added by Admin grouped by broadcast_id/task identifier for management page
 */
export async function getAdminManagementTasks(selectedKelas = "01TPLE002") {
    // 1. Fetch all users in class (excluding ADMIN role)
    const qUsers = query(
        collection(db, "users"),
        where("kelas", "==", selectedKelas)
    );
    const usersSnap = await getDocs(qUsers);
    const usersMap = {};
    usersSnap.forEach((docSnap) => {
        const uData = docSnap.data();
        if (uData.role !== "ADMIN") {
            usersMap[uData.uid || docSnap.id] = { id: docSnap.id, ...uData };
        }
    });

    // 2. Fetch all tasks for selectedKelas
    const qTasks = query(
        collection(db, "tasks"),
        where("kelas", "==", selectedKelas)
    );
    const tasksSnap = await getDocs(qTasks);

    const taskGroupsMap = {}; // { groupKey: { taskInfo, studentStatuses: [] } }

    tasksSnap.forEach((docSnap) => {
        const tData = { id: docSnap.id, ...docSnap.data() };
        
        // Group key: broadcast_id if present, else composite key (matkul + pertemuan + judul)
        const groupKey = tData.broadcast_id || `${tData.matkul || ""}_${tData.pertemuan || 1}_${tData.judul || ""}`;

        if (!taskGroupsMap[groupKey]) {
            taskGroupsMap[groupKey] = {
                groupKey: groupKey,
                broadcast_id: tData.broadcast_id || groupKey,
                judul: tData.judul || "Tugas",
                matkul: tData.matkul || "-",
                pertemuan: tData.pertemuan || 1,
                jenis_tugas: tData.jenis_tugas || [],
                jenis_tugas_lainnya: tData.jenis_tugas_lainnya || "",
                deadline: tData.deadline,
                deskripsi: tData.deskripsi || "",
                kelas: tData.kelas || selectedKelas,
                createdAt: tData.createdAt,
                studentStatuses: []
            };
        }

        // Only include if user is not Admin
        const studentObj = usersMap[tData.uid];
        if (studentObj) {
            taskGroupsMap[groupKey].studentStatuses.push({
                uid: tData.uid,
                taskDocId: docSnap.id,
                name: studentObj.name || studentObj.email?.split("@")[0] || "Mahasiswa",
                email: studentObj.email,
                id_user: studentObj.id_user || "-",
                status: tData.status || "new",
                updatedAt: tData.updatedAt
            });
        }
    });

    const resultList = Object.values(taskGroupsMap).map((group) => {
        const total = group.studentStatuses.length;
        const doneCount = group.studentStatuses.filter((s) => s.status === "done").length;
        const onProgressCount = group.studentStatuses.filter((s) => s.status === "on_progress").length;
        const newCount = group.studentStatuses.filter((s) => s.status === "new").length;
        const rejectCount = group.studentStatuses.filter((s) => s.status === "reject").length;
        const progressPercent = total > 0 ? Math.round((doneCount / total) * 100) : 0;

        return {
            ...group,
            totalStudents: total,
            doneCount: doneCount,
            onProgressCount: onProgressCount,
            newCount: newCount,
            rejectCount: rejectCount,
            progressPercent: progressPercent
        };
    });

    // Sort by pertemuan / deadline
    resultList.sort((a, b) => (a.pertemuan || 0) - (b.pertemuan || 0));

    return resultList;
}

/**
 * Retrieves task status for all users in a class filtered by matkul and pertemuan
 */
export async function getClassTaskManagementData(selectedKelas = "01TPLE002", matkul = "", pertemuan = null) {
    // 1. Get all users in the class, excluding ADMIN role
    const qUsers = query(
        collection(db, "users"),
        where("kelas", "==", selectedKelas)
    );
    const usersSnap = await getDocs(qUsers);
    const users = [];
    usersSnap.forEach((docSnap) => {
        const uData = docSnap.data();
        if (uData.role !== "ADMIN") {
            users.push({ id: docSnap.id, ...uData });
        }
    });

    // 2. Query all tasks for this class
    const qClassTasks = query(
        collection(db, "tasks"),
        where("kelas", "==", selectedKelas)
    );
    const tasksSnap = await getDocs(qClassTasks);

    const userTasksMap = {}; // { uid: [task1, task2, ...] }
    tasksSnap.forEach((docSnap) => {
        const tData = { id: docSnap.id, ...docSnap.data() };
        if (tData.uid) {
            if (!userTasksMap[tData.uid]) {
                userTasksMap[tData.uid] = [];
            }
            userTasksMap[tData.uid].push(tData);
        }
    });

    // 3. Combine student user data with their task statistics & list
    const studentStatusList = users.map((u) => {
        const uid = u.uid || u.id;
        const allStudentTasks = userTasksMap[uid] || [];

        // Filter tasks if matkul or pertemuan filters are applied
        let relevantTasks = allStudentTasks;
        if (matkul) {
            relevantTasks = relevantTasks.filter((t) => t.matkul === matkul);
        }
        if (pertemuan) {
            relevantTasks = relevantTasks.filter((t) => parseInt(t.pertemuan, 10) === parseInt(pertemuan, 10));
        }

        const totalRelevantTasks = relevantTasks.length;
        const completedRelevantTasks = relevantTasks.filter((t) => t.status === "done").length;
        const completionPercentage = totalRelevantTasks > 0
            ? Math.round((completedRelevantTasks / totalRelevantTasks) * 100)
            : (allStudentTasks.length > 0
                ? Math.round((allStudentTasks.filter((t) => t.status === "done").length / allStudentTasks.length) * 100)
                : 0);

        // Find status for current selected matkul & pertemuan filter
        let currentTask = relevantTasks[0] || null;
        let currentStatus = currentTask ? currentTask.status : "belum_ada_tugas";

        return {
            uid: uid,
            id_user: u.id_user || "-",
            name: u.name || u.email?.split("@")[0] || "Mahasiswa",
            email: u.email,
            kelas: u.kelas || selectedKelas,
            hasTaskAssigned: totalRelevantTasks > 0,
            taskStatus: currentStatus, // 'done', 'on_progress', 'new', 'reject', 'belum_ada_tugas'
            isCompleted: currentStatus === "done",
            totalTasks: totalRelevantTasks,
            completedTasksCount: completedRelevantTasks,
            completionPercentage: completionPercentage,
            allStudentTasks: allStudentTasks, // Full list for detail modal
            relevantTasks: relevantTasks,
            taskDetails: currentTask
        };
    });

    return studentStatusList;
}