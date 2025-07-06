import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { AiOutlineClockCircle, AiOutlineEdit } from 'react-icons/ai';
import dayjs from 'dayjs';
import TimeInputDialog from '../components/TimeInputDialog';
import PomodoroClock from '../components/PomodoroClock';

export default function StudyPomodoroPage() {
    const navigate = useNavigate();
    const [user, setUser] = useState(null);
    const [selectedPlan, setSelectedPlan] = useState(null);
    const [plans, setPlans] = useState([]);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEntryIndex, setSelectedEntryIndex] = useState(null);
    const [startTime, setStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const [editingData, setEditingData] = useState(null); // 編集 or 新規登録用データ
    const todayStr = dayjs().format('YYYY-MM-DD');
    const currentHour = String(dayjs().hour()).padStart(2, '0');
    const currentMinute = String(dayjs().minute()).padStart(2, '0');


    const timerRef = useRef(null);

    const fetchPlans = async (u) => {
        const snap = await getDoc(doc(db, 'studyPlans', u.email));
        const data = snap.exists() ? snap.data()?.[todayStr] || {} : {};

        const allPlans = Object.values(data).flat();
        const now = dayjs();

        // 🔹 現在進行中の計画を探す
        const currentPlan = allPlans.find(p => {
            const start = dayjs(`${todayStr}T${p.start}`);
            const end = dayjs(`${todayStr}T${p.end}`);
            return now.isAfter(start) && now.isBefore(end);
        });

        if (!currentPlan) {
            // 現在の時間帯に該当するプランがなければ何もしない
            setSelectedPlan(null);
            setSelectedEntryIndex(null);
            setPlans([]);
            return;
        }

        // 🔸 future（これから始まるもの）も更新しておく（任意）
        const futurePlans = allPlans.filter(p =>
            dayjs(`${todayStr}T${p.start}`).isAfter(now)
        );
        const sortedPlans = futurePlans.sort((a, b) =>
            dayjs(`${todayStr}T${a.start}`).isAfter(dayjs(`${todayStr}T${b.start}`)) ? 1 : -1
        );
        setPlans(futurePlans);

        // 🔸 該当 index の取得（今の currentPlan に一致するインデックス）
        const hourKey = Object.keys(data).find(hour =>
            data[hour].some(p =>
                p.start === currentPlan.start &&
                p.end === currentPlan.end
            )
        );
        const idx = hourKey
            ? data[hourKey].findIndex(p =>
                p.start === currentPlan.start && p.end === currentPlan.end
            )
            : null;

        setSelectedPlan(currentPlan);
        setSelectedEntryIndex(idx);
    };

    const handleStart = () => {
        setIsRunning(true);
        setStartTime(dayjs());
        timerRef.current = setInterval(() => {
            setElapsedSeconds((prev) => prev + 1);
        }, 1000);
    };

    const handleStop = async () => {
        setIsRunning(false);
        clearInterval(timerRef.current);

        const endTime = dayjs();
        const subject = selectedPlan?.subject || 'その他';
        const topic = selectedPlan?.topic || 'ポモドーロ';
        const book = selectedPlan?.book || '';

        const newRecord = {
            start: startTime.format('HH:mm'),
            end: endTime.format('HH:mm'),
            date: todayStr,
            subject,
            topic,
            book,
        };

        const docRef = doc(db, 'studyPomodoroLogs', user.email);
        const snap = await getDoc(docRef);
        const data = snap.exists() ? snap.data() : {};
        const todayLogs = data[todayStr] || [];

        todayLogs.push(newRecord);
        await setDoc(docRef, {
            ...data,
            [todayStr]: todayLogs,
        });

        setElapsedSeconds(0);
    };

    const formatTime = (s) => {
        const m = Math.floor(s / 60);
        const sec = s % 60;
        return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (u) => {
            if (u) {
                setUser(u);
                await fetchPlans(u);
            }
        });
        return () => unsubscribe();
    }, []);

    return (
        <div className="min-h-screen bg-[#4b4039] text-[#3a2e28] pt-24 p-6 font-sans">
            <div className="max-w-7xl mx-auto">
                <h1 className="text-2xl font-bold flex items-center gap-2 text-[#ede3d2] mb-6">
                    <AiOutlineClockCircle className="w-6 h-6" /> Study Pomodoro
                </h1>

                {/* 🔸 現在の学習計画表示エリア（常に表示） */}
                {/* 🔸 現在の学習計画表示エリア（常に表示） */}
                <div className="mb-4 p-4 bg-[#ede3d2] rounded shadow text-[#5a3e28] space-y-1 relative">
                    <div className="text-sm font-bold">この時間の学習</div>

                    {selectedPlan ? (
                        <>
                            <div className="flex flex-wrap gap-x-6 gap-y-1 text-base">
                                <div>
                                    <span className="font-semibold">教科：</span>
                                    {selectedPlan.subject}
                                </div>
                                <div>
                                    <span className="font-semibold">科目：</span>
                                    {selectedPlan.topic}
                                </div>
                                <div>
                                    <span className="font-semibold">問題集：</span>
                                    {selectedPlan.book || '－'}
                                </div>
                                <div>
                                    <span className="font-semibold">時間：</span>
                                    {selectedPlan.start} ～ {selectedPlan.end}
                                </div>
                                <div>
                                    <span className="font-semibold">学習内容：</span>
                                    {selectedPlan.content}
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="text-base text-gray-500">現在の学習は設定されていません</div>
                    )}

                    <button
                        onClick={() => {
                            const index = selectedPlan
                                ? plans.findIndex(
                                    (p) =>
                                        p.start === selectedPlan.start &&
                                        p.end === selectedPlan.end &&
                                        p.subject === selectedPlan.subject &&
                                        p.topic === selectedPlan.topic &&
                                        p.book === selectedPlan.book &&
                                        p.content === selectedPlan.content
                                )
                                : null;
                            setSelectedEntryIndex(index);
                            setDialogOpen(true);
                        }}
                        className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2 px-3 py-1.5 bg-[#5a3e28] text-white rounded-lg border border-[#4a2f1f] shadow hover:bg-[#7a5639] transition"
                    >
                        <AiOutlineEdit size={20} />
                        <span className="font-semibold text-base">編集</span>
                    </button>
                </div>
                {/* アナログタイマー */}
                <div className="mb-6">
                    <PomodoroClock
                        elapsedMinutes={elapsedSeconds / 60}
                        isRunning={isRunning}
                        onToggle={isRunning ? handleStop : handleStart}
                    />
                </div>

                {/* スクロールメッセージ */}
                <div className="mt-10 overflow-hidden h-8 relative">
                    <div className="absolute whitespace-nowrap animate-marquee text-[#ede3d2] text-sm">
                        勉強中のユーザー：Yamadaさん / Satoさん / Suzukiさん
                    </div>
                </div>

                {/* ダイアログ */}
                <TimeInputDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    selectedHour={currentHour}
                    selectedMinute={currentMinute}
                    selectedDate={dayjs()}
                    selectedEntryIndex={selectedEntryIndex}
                    reloadPlans={() => window.location.reload()}
                />
            </div>
        </div>
    );
}