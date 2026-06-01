// firebase.js
import { initializeApp } from "firebase/app";
import {
    getAuth,
    initializeAuth,
    browserLocalPersistence,
    setPersistence,
} from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { Capacitor } from '@capacitor/core';

let analytics;
// トップレベル await はモジュールを非同期化し、一部 WKWebView で起動に影響する。
// 解析は非同期 IIFE で遅延ロードし、トップレベル await を排除する。
if (typeof window !== 'undefined' && 'measurementId' in import.meta.env) {
    (async () => {
        try {
            const { getAnalytics } = await import("firebase/analytics");
            analytics = getAnalytics();
        } catch (e) {
            console.warn("Analytics の初期化に失敗しました（アプリ環境では問題ありません）");
        }
    })();
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

// ✅ Auth
// ネイティブ(WKWebView)では indexedDB 永続化が不安定で onAuthStateChanged が
// ハングし、起動時にログイン画面が出るまで時間がかかる事象がある。
// localStorage ベースの永続化を明示指定して initializeAuth することで回避する。
const auth = isNative
    ? initializeAuth(app, { persistence: browserLocalPersistence })
    : getAuth(app);

// ✅ Firestore
// ネイティブ(WKWebView)ではストリーミング輸送(WebChannel)が確立できず
// getDoc/getDocs/setDoc が応答しないことがある（→ ログイン後「処理中…」のまま）。
// ロングポーリングを強制して回避する。
const db = isNative
    ? initializeFirestore(app, { experimentalForceLongPolling: true })
    : getFirestore(app);

// ✅ Webのみ永続化（ネイティブは initializeAuth で指定済み）
if (!isNative) {
    setPersistence(auth, browserLocalPersistence).catch((error) =>
        console.error("Persistence設定失敗:", error)
    );
}

export { app, auth, db, analytics };
