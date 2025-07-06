import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FaPenNib } from "react-icons/fa";
import { AiOutlineClockCircle, AiOutlineMenu, AiOutlineClose } from 'react-icons/ai';

export default function Header({ isRunning, startTime, elapsedSeconds }) {
    const [userName, setUserName] = useState(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const navigate = useNavigate();


    useEffect(() => {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setUserName(user?.displayName || null);
        });
        return () => unsubscribe();
    }, []);

    return (
        <header className="bg-[#ede3d2] shadow-md px-4 fixed top-0 w-full z-50 flex items-center justify-between flex-wrap sm:flex-nowrap gap-2 sm:gap-4 min-h-16 sm:min-h-auto py-2 sm:py-3">
            {/* 🔸 左側 Study ボタン（PCのみ） */}
            <button
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-105 hover:brightness-110 transition text-lg sm:text-2xl font-script"
                onClick={() => navigate('/pomodoro')}
            >
                <AiOutlineClockCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                <span className="whitespace-nowrap">Study with us！</span>
            </button>

            {/* 🔸 中央タイトル（常時表示） */}
            <div
                className="flex items-center gap-2 mx-auto cursor-pointer hover:opacity-80 transition order-last sm:order-none absolute left-1/2 transform -translate-x-1/2"
                onClick={() => {
                    if (isRunning || (startTime && elapsedSeconds > 0)) {
                        const confirmed = window.confirm("学習中のようです。移動すると記録されません。移動してもよろしいですか？");
                        if (!confirmed) return;
                    }
                    navigate('/home');
                }}
            >
                <h1 className="text-4xl sm:text-6xl font-script text-[#5a3e28] drop-shadow-sm">
                    TsureBen
                </h1>
                <FaPenNib className="text-[#5a3e28] w-8 h-8 sm:w-12 sm:h-12 mt-1" />
            </div>

            {/* 🔸 ユーザー名（PCのみ） */}
            {userName && (
                <div className="hidden sm:block text-[#fffaf3] bg-[#5a3e28] px-4 py-2 rounded-full text-base sm:text-lg font-script shadow-md hover:scale-105 transition whitespace-nowrap">
                    {userName} さん
                </div>
            )}

            {/* 🔸 ハンバーガーアイコン（スマホ用・右上） */}
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="sm:hidden text-[#5a3e28] text-3xl absolute right-4 top-3"
            >
                {menuOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
            </button>

            {/* 🔸 モバイルメニュー展開 */}
            {menuOpen && (
                <nav className="sm:hidden absolute top-full left-0 w-full bg-[#ede3d2] px-4 pb-4 pt-2 shadow-md space-y-3 z-50">
                    <button
                        onClick={() => {
                            navigate('/pomodoro');
                            setMenuOpen(false);
                        }}
                        className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full font-script text-lg shadow hover:scale-105 transition"
                    >
                        <AiOutlineClockCircle className="text-white" />
                        Study with us！
                    </button>
                    {userName && (
                        <div className="text-center text-[#fffaf3] bg-[#5a3e28] px-4 py-2 rounded-md font-script shadow-md">
                            {userName} さん
                        </div>
                    )}
                </nav>
            )}
        </header>
    );
}