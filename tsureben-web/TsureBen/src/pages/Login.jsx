// pages/LoginPage.jsx
import React from 'react';
import { auth } from '../firebase';
import { FaPenNib } from "react-icons/fa";
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function LoginPage() {
    const navigate = useNavigate();

    const handleLogin = async () => {
        const provider = new GoogleAuthProvider();

        try {
            const result = await signInWithPopup(auth, provider);
            const user = result.user;
            const email = user.email;

            // ✅ ドメイン制限チェック
            const allowedDomain = "dokkyo-saitama.ed.jp";
            if (!email.endsWith(`@${allowedDomain}`)) {
                alert(`このシステムは ${allowedDomain} のアカウントでのみ利用できます。`);

                await auth.signOut();            // 強制ログアウト
                window.location.reload();        // 自動ログインを防ぐためリロード
                return;
            }

            // ✅ ドメインOKならホームへ遷移
            navigate("/home");

        } catch (error) {
            console.error("ログイン失敗:", error);
            alert("ログインに失敗しました");
        }
    };


    return (
        <div className="min-h-screen bg-[#ede3d2] flex items-center justify-center">
            <div className="bg-white p-8 rounded-xl shadow-md text-center">
                {/* タイトル行 */}
                <div className="flex justify-center items-center gap-2 mb-6">
                    <h1 className="font-script text-4xl text-[#5a3e28]">TsureBen</h1>
                    <FaPenNib className="text-[#5a3e28] w-6 h-6 mt-1" />
                </div>

                {/* 説明文 */}
                <p className="text-[#5a3e28] text-lg mb-4 font-semibold">にログイン</p>

                {/* ログインボタン */}
                <button
                    onClick={handleLogin}
                    className="btn bg-[#5a3e28] hover:bg-[#7a5639] px-6"
                >
                    Googleでログイン
                </button>
            </div>
        </div>
    );
}