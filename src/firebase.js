// firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { Capacitor } from '@capacitor/core';

let analytics;
if (typeof window !== 'undefined' && 'measurementId' in import.meta.env) {
    try {
        const { getAnalytics } = await import("firebase/analytics");
        analytics = getAnalytics();
    } catch (e) {
        console.warn("Analytics の初期化に失敗しました（アプリ環境では問題ありません）");
    }
}

// ✅ Firebase config（Webとアプリで分岐）
const isNative = Capacitor.isNativePlatform();

const firebaseConfig = isNative
    ? {
        apiKey: "AIzaSyDcGpXuofSqCj3Ngc22lKq3VZoeXAV2hUw",
        projectId: "tsureben",
        storageBucket: "tsureben.appspot.com",
        messagingSenderId: "77789669140",
        appId: "1:77789669140:web:65acf425f634ebc8b58401",
        measurementId: "G-X6VXB3N196"
        // ← authDomain を **削除**
    }
    : {
        apiKey: "AIzaSyDcGpXuofSqCj3Ngc22lKq3VZoeXAV2hUw",
        authDomain: "tsureben.firebaseapp.com", // ✅ Web用のみ指定
        projectId: "tsureben",
        storageBucket: "tsureben.appspot.com",
        messagingSenderId: "77789669140",
        appId: "1:77789669140:web:65acf425f634ebc8b58401",
        measurementId: "G-X6VXB3N196"
    };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// ✅ Webのみ永続化
if (!isNative) {
    setPersistence(auth, browserLocalPersistence).catch((error) =>
        console.error("Persistence設定失敗:", error)
    );
}

export { app, auth, db, analytics };