"use client";

import { useState, useEffect, createContext, useContext } from "react";
import {
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    sendPasswordResetEmail
} from "firebase/auth";
import { auth } from "@/lib/firebase";
import { createUserProfile, getUserProfile } from "@/services/userService";

const AuthContext = createContext({});

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            if (currentUser) {
                setUser(currentUser);

                // 🚀 Buka loading aplikasi SEGERA!
                setLoading(false);

                // 🚀 Ambil data profil secara asinkron di background
                getUserProfile(currentUser.uid)
                    .then((profile) => setUserData(profile))
                    .catch((err) => console.error("Gagal load profile:", err));
            } else {
                setUser(null);
                setUserData(null);
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const login = (email, password) => {
        return signInWithEmailAndPassword(auth, email, password);
    };

    const register = async (name, email, password) => {
        const res = await createUserWithEmailAndPassword(auth, email, password);
        await createUserProfile(res.user.uid, name, email);
        return res;
    };

    const logout = () => {
        setUserData(null);
        return signOut(auth);
    };

    const resetPassword = (email) => {
        return sendPasswordResetEmail(auth, email);
    };

    const refreshUserData = async () => {
        if (user) {
            const profile = await getUserProfile(user.uid);
            setUserData(profile);
            return profile;
        }
    };

    return (
        <AuthContext.Provider value={{ user, userData, loading, login, register, logout, resetPassword, refreshUserData }}>
            {children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);