import React, { useEffect, useState } from "react";
import { useNavigate } from 'react-router-dom';
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { FaPenNib, FaCog } from "react-icons/fa";
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
        <header className="bg-[#ede3d2] shadow-md fixed top-0 w-full z-50">
            <div className="max-w-7xl mx-auto px-4 flex items-center justify-between flex-wrap sm:flex-nowrap gap-2 sm:gap-4 min-h-16 sm:min-h-auto py-2 sm:py-3">
                {/* 🔸 左側 Study ボタン（PCのみ） */}
                <button
                    className="hidden sm:flex items-center gap-2 px-4 py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-105 hover:brightness-110 transition text-lg sm:text-2xl"
                    onClick={() => navigate('/pomodoro')}
                >
                    <AiOutlineClockCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                    <span className="whitespace-nowrap">学習計測</span>
                </button>

                {/* 🔸 中央タイトル（常時表示） */}
                <div
                    className="flex items-center gap-2 mx-auto cursor-pointer hover:opacity-80 transition order-last sm:order-none absolute left-1/2 transform -translate-x-1/2"
                    onClick={() => {
                        if (isRunning || (startTime && elapsedSeconds > 0)) {
                            alert("学習中は他の画面に移動できません。終了してから移動してください。");
                            return;
                        }
                        navigate('/home');
                    }}
                >
                    <h1 className="text-4xl sm:text-6xl font-script text-[#5a3e28] drop-shadow-sm">
                        TsureBen
                    </h1>
                    <FaPenNib className="text-[#5a3e28] w-8 h-8 sm:w-12 sm:h-12 mt-1" />
                </div>

                {/* 🔸 ユーザー名（PC） */}
                {userName && (
                    <button
                        onClick={() => navigate('/settings')}
                        className="hidden sm:flex items-center gap-2 text-[#fffaf3] bg-[#5a3e28] px-4 py-2 rounded-full text-base sm:text-lg shadow-md hover:scale-105 transition whitespace-nowrap"
                        title="設定ページへ"
                    >
                        <FaCog className="w-5 h-5" />
                        {userName} さん
                    </button>
                )}

                {/* 🔸 ハンバーガーアイコン */}
                <button
                    onClick={() => setMenuOpen(!menuOpen)}
                    className="sm:hidden text-[#5a3e28] text-3xl absolute right-4 top-3"
                >
                    {menuOpen ? <AiOutlineClose /> : <AiOutlineMenu />}
                </button>
            </div>

            {/* 🔸 モバイルメニュー展開 */}
            {menuOpen && (
                <nav className="sm:hidden w-full bg-[#ede3d2] px-4 pb-4 pt-2 shadow-md space-y-3 z-50">
                    <div className="max-w-7xl mx-auto space-y-3">
                        <button
                            onClick={() => {
                                navigate('/pomodoro');
                                setMenuOpen(false);
                            }}
                            className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-105 hover:brightness-110 transition text-[3vw] sm:text-base"
                        >
                            <AiOutlineClockCircle className="w-5 h-5 text-[#fffaf3]" />
                            <span className="whitespace-nowrap">学習計測</span>
                        </button>

                        {userName && (
                            <button
                                onClick={() => {
                                    navigate('/settings');
                                    setMenuOpen(false);
                                }}
                                className="w-full flex justify-center items-center gap-2 px-4 py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-105 hover:brightness-110 transition text-[3vw] sm:text-base"
                                title="設定ページへ"
                            >
                                <FaCog className="w-5 h-5 text-[#fffaf3]" />
                                <span className="whitespace-nowrap">{userName} さんの設定</span>
                            </button>
                        )}
                    </div>
                </nav>
            )}
        </header>
    );
}