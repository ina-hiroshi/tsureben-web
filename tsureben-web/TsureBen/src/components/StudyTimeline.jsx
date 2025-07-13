import React, { useEffect, useState } from 'react';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import dayjs from 'dayjs';
import { FaChevronLeft, FaChevronRight, FaCalendarDay, FaBookOpen, FaClock, FaChalkboardTeacher, FaFileAlt } from 'react-icons/fa';

export default function StudyTimeline({ userEmail }) {
    const [logsPerDay, setLogsPerDay] = useState({});
    const [weekStartDate, setWeekStartDate] = useState(dayjs().startOf('week'));

    const subjectColors = {
        国語: 'bg-pink-200 text-pink-800 border-l-4 border-pink-400',
        数学: 'bg-blue-200 text-blue-800 border-l-4 border-blue-400',
        英語: 'bg-purple-200 text-purple-800 border-l-4 border-purple-400',
        理科: 'bg-green-200 text-green-800 border-l-4 border-green-400',
        社会: 'bg-yellow-200 text-yellow-800 border-l-4 border-yellow-400',
        情報: 'bg-indigo-200 text-indigo-800 border-l-4 border-indigo-400',
        その他: 'bg-gray-200 text-gray-800 border-l-4 border-gray-400',
    };

    useEffect(() => {
        const fetchLogs = async () => {
            if (!userEmail) return;

            try {
                const docRef = doc(db, 'studyPomodoroLogs', userEmail);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    console.warn("ログが見つかりません:", userEmail);
                    setLogsPerDay({});
                    return;
                }

                const allLogs = docSnap.data();
                const newLogsPerDay = {};

                for (let i = 0; i < 7; i++) {
                    const date = weekStartDate.add(i, 'day');
                    const key = date.format('YYYY-MM-DD');
                    const logs = allLogs[key] || [];

                    newLogsPerDay[key] = [...logs].sort((a, b) =>
                        (a.startTime || '').localeCompare(b.startTime || '')
                    );
                }

                setLogsPerDay(newLogsPerDay);
            } catch (e) {
                console.error("ログ取得エラー:", e);
            }
        };

        fetchLogs();
    }, [weekStartDate, userEmail]);

    const handlePrev = () => {
        setWeekStartDate(prev => prev.subtract(7, 'day'));
    };

    const handleNext = () => {
        setWeekStartDate(prev => prev.add(7, 'day'));
    };

    const handleToday = () => {
        setWeekStartDate(dayjs().startOf('week'));
    };

    return (
        <div className="text-[#6b4a2b]">
            {/* ナビゲーション */}
            <div className="flex justify-center flex-wrap gap-2 sm:gap-3 mb-4">
                <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                >
                    <FaChevronLeft className="w-4 h-4" /> 前の週
                </button>
                <button
                    onClick={handleToday}
                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                >
                    <FaCalendarDay className="w-4 h-4" /> 今週
                </button>
                <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                >
                    次の週 <FaChevronRight className="w-4 h-4" />
                </button>
            </div>

            {/* ログ表示 */}
            <div className="space-y-6">
                {/* PC：1週間を横に7列グリッド表示 */}
                <div className="hidden sm:grid grid-cols-7 gap-4">
                    {Array.from({ length: 7 }).map((_, i) => {
                        const date = weekStartDate.add(i, 'day');
                        const key = date.format('YYYY-MM-DD');
                        const display = date.format('M月D日（ddd）');
                        const logs = logsPerDay[key] || [];

                        return (
                            <div
                                key={key}
                                className="rounded-lg p-2 shadow-none min-w-0 flex flex-col gap-2"
                            >
                                <h3 className="text-sm font-semibold mb-2 border-b border-[#6b4a2b] pb-1 text-center">
                                    {display}
                                </h3>

                                {logs.length === 0 ? (
                                    <p className="text-xs text-gray-500 text-center">記録なし</p>
                                ) : (
                                    <ul className="space-y-2">
                                        {logs.map((log, idx) => (
                                            <li
                                                key={idx}
                                                className={`relative rounded-md text-xs sm:text-sm shadow-sm cursor-pointer transition-transform overflow-hidden ${subjectColors[log.subject] || subjectColors.その他}`}
                                            >
                                                <div className="px-2 py-2 space-y-1 whitespace-normal break-words">
                                                    <div className="font-bold text-sm">
                                                        <FaClock className="inline-block mr-1 text-[#6b4a2b]" />
                                                        {log.startTime || '未記録'}（{log.duration}分）
                                                    </div>
                                                    <div className="text-xs font-semibold">
                                                        <FaBookOpen className="inline-block mr-1 text-[#6b4a2b]" />
                                                        {log.book || '未指定'}
                                                    </div>
                                                    <div className="text-xs">
                                                        <FaChalkboardTeacher className="inline-block mr-1 text-[#6b4a2b]" />
                                                        {log.subject || '教科未設定'} / {log.topic || '単元未設定'}
                                                    </div>
                                                    {log.content && (
                                                        <div className="text-xs font-normal text-[#4b3b2b] whitespace-pre-wrap break-words">
                                                            <FaFileAlt className="inline-block mr-1 text-[#6b4a2b]" />
                                                            {log.content}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* スマホ：縦並びで従来通りの表示 */}
                <div className="sm:hidden space-y-6">
                    {Array.from({ length: 7 }).map((_, i) => {
                        const date = weekStartDate.add(i, 'day');
                        const key = date.format('YYYY-MM-DD');
                        const display = date.format('M月D日（ddd）');
                        const logs = logsPerDay[key] || [];

                        return (
                            <section key={key}>
                                <h3 className="text-base sm:text-lg font-semibold mb-2 border-b border-[#6b4a2b] pb-1">
                                    {display}
                                </h3>

                                {logs.length === 0 ? (
                                    <p className="text-sm text-gray-500">この日の記録はありません。</p>
                                ) : (
                                    <ul className="space-y-3">
                                        {logs.map((log, idx) => (
                                            <li
                                                key={idx}
                                                className={`relative rounded-md text-xs sm:text-sm shadow-sm cursor-pointer transition-transform overflow-hidden ${subjectColors[log.subject] || subjectColors.その他}`}
                                            >
                                                <div className="px-2 py-2 space-y-1 whitespace-nowrap">
                                                    <div className="font-bold text-sm sm:text-base">
                                                        <FaClock className="inline-block mr-1 text-[#6b4a2b]" />
                                                        {log.startTime || '未記録'}（{log.duration}分）
                                                    </div>
                                                    <div className="text-xs sm:text-sm font-semibold">
                                                        <FaBookOpen className="inline-block mr-1 text-[#6b4a2b]" />
                                                        {log.book || '未指定'}
                                                    </div>
                                                    <div className="text-xs sm:text-sm">
                                                        <FaChalkboardTeacher className="inline-block mr-1 text-[#6b4a2b]" />
                                                        {log.subject || '教科未設定'} / {log.topic || '単元未設定'}
                                                    </div>
                                                    {log.content && (
                                                        <div className="text-xs sm:text-sm font-normal text-[#4b3b2b] break-words whitespace-pre-wrap">
                                                            <FaFileAlt className="inline-block mr-1 text-[#6b4a2b]" />
                                                            {log.content}
                                                        </div>
                                                    )}
                                                </div>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </section>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}