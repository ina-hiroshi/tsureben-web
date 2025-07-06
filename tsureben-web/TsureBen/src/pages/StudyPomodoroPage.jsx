import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth, db } from '../firebase';
import { doc, getDoc, setDoc, collection, query, onSnapshot } from 'firebase/firestore';
import { AiOutlineClockCircle, AiOutlineEdit } from 'react-icons/ai';
import { MdMenuBook } from 'react-icons/md';
import { FaUsers } from 'react-icons/fa';
import Header from '../components/Header';
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
    const [activeUsers, setActiveUsers] = useState([]);
    const timerRef = useRef(null);
    const [animationDuration, setAnimationDuration] = useState(30); // 秒数
    const marqueeRef = useRef(null);

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

    const handleStart = async () => {
        if (!selectedPlan) {
            alert("この時間の学習計画が登録されていません。先に登録してください。");
            return;
        }

        if (isRunning) return;

        setIsRunning(true);
        const now = dayjs();
        setStartTime(now);

        if (elapsedSeconds === 0 && user) {
            const newRecord = {
                startTime: now.format('HH:mm'),
                date: todayStr,
                subject: selectedPlan.subject || 'その他',
                topic: selectedPlan.topic || 'ポモドーロ',
                book: selectedPlan.book || '',
                content: selectedPlan.content || '',
                duration: null,
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
        }

        timerRef.current = setInterval(() => {
            setElapsedSeconds(prev => prev + 1);
        }, 1000);
    };

    const handleStop = () => {
        setIsRunning(false);
        clearInterval(timerRef.current);
    };

    const handleFinish = async () => {
        if (!startTime || !user) return;

        const confirmed = window.confirm("学習を終了して保存します。よろしいですか？");
        if (!confirmed) return;

        const docRef = doc(db, 'studyPomodoroLogs', user.email);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const todayLogs = data[todayStr] || [];

        const formattedStart = startTime.format('HH:mm');

        // 後ろから duration が null の該当 startTime を探す
        const index = [...todayLogs].reverse().findIndex(
            r => r.startTime === formattedStart && r.duration == null
        );
        if (index === -1) return;

        const realIndex = todayLogs.length - 1 - index;
        todayLogs[realIndex].duration = Math.floor(elapsedSeconds / 60);

        await setDoc(docRef, {
            ...data,
            [todayStr]: todayLogs,
        });

        // 状態リセット
        setStartTime(null);
        setElapsedSeconds(0);
        setIsRunning(false);
        clearInterval(timerRef.current);
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

    useEffect(() => {
        const q = query(collection(db, 'studyPomodoroLogs'));

        const unsubscribe = onSnapshot(q, async snapshot => {
            const result = [];

            const promises = snapshot.docs.map(async docSnap => {
                const data = docSnap.data();
                const todayLogs = data[todayStr] || [];

                const unfinished = todayLogs.find(log => log.duration == null);
                if (!unfinished) return null;

                const email = docSnap.id;

                // 🔍 users コレクションから名前を取得
                try {
                    const userDoc = await getDoc(doc(db, 'users', email));
                    const userName = userDoc.exists() ? userDoc.data().name || email.split('@')[0] : email.split('@')[0];

                    return {
                        name: userName,
                        subject: unfinished.subject || '－',
                        topic: unfinished.topic || '－',
                        book: unfinished.book || '－',
                        content: unfinished.content || '－',
                    };
                } catch (e) {
                    console.error(`ユーザー情報の取得に失敗: ${email}`, e);
                    return {
                        name: email.split('@')[0],
                        subject: unfinished.subject || '－',
                        topic: unfinished.topic || '－',
                        book: unfinished.book || '－',
                        content: unfinished.content || '－',
                    };
                }
            });

            const resolved = await Promise.all(promises);
            setActiveUsers(resolved.filter(Boolean)); // nullを除く
        });

        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (marqueeRef.current) {
            const height = marqueeRef.current.offsetHeight;
            // 高さに応じて時間を決定（例えば1pxあたり0.1秒）
            const duration = Math.max(10, height * 0.06);
            setAnimationDuration(duration);
        }
    }, [activeUsers]);

    return (
        <>
            <Header
                isRunning={isRunning}
                startTime={startTime}
                elapsedSeconds={elapsedSeconds}
            />
            <div className="bg-[#4b4039] text-[#3a2e28] pt-24 pb-12 px-4 font-sans min-h-screen">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold flex items-center gap-2 text-[#ede3d2] mb-6">
                        <AiOutlineClockCircle className="w-6 h-6" /> 学習の計測
                    </h1>

                    <div className="flex flex-col md:flex-row gap-6">
                        {/* 🔸 左側：学習計画 + 一緒に勉強中 */}
                        <div className="md:w-1/3 space-y-4">
                            {/* この時間の学習 */}
                            <div className="p-4 bg-[#ede3d2] rounded shadow text-[#5a3e28] space-y-2 relative">
                                <div className="text-xl font-bold flex items-center gap-2">
                                    <MdMenuBook className="text-[#5a3e28]" />
                                    この時間の学習
                                </div>

                                {selectedPlan ? (
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
                                ) : (
                                    <div className="text-base text-gray-500">現在の学習は設定されていません</div>
                                )}

                                {/* 編集ボタン（常に表示） */}
                                <div className="mt-2 flex justify-end">
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
                                        className="flex items-center gap-2 px-3 py-1.5 bg-[#5a3e28] text-white rounded-lg border border-[#4a2f1f] shadow hover:bg-[#7a5639] transition transform hover:scale-105"
                                    >
                                        <AiOutlineEdit size={20} />
                                        <span className="font-semibold text-base">編集</span>
                                    </button>
                                </div>
                            </div>

                            {/* 一緒に勉強中 */}
                            <div className="p-4 bg-[#ede3d2] rounded shadow text-[#5a3e28] space-y-2">
                                <div className="text-xl font-bold flex items-center gap-2">
                                    <FaUsers className="text-[#5a3e28]" />
                                    一緒に勉強中
                                </div>

                                <div className="overflow-hidden relative h-80">
                                    <div
                                        ref={marqueeRef}
                                        className="absolute top-0 space-y-4"
                                        style={{
                                            animation: `marqueeVertical ${animationDuration}s linear infinite`,
                                        }}
                                    >
                                        {[...activeUsers, ...activeUsers].map((user, i) => (
                                            <div
                                                key={i}
                                                className="mx-auto px-4 py-2 rounded-xl shadow-md border border-[#b3936a]"
                                                style={{
                                                    backgroundColor: '#f0e0c0',
                                                    minWidth: '220px',
                                                    maxWidth: '300px',
                                                    whiteSpace: 'normal',
                                                    fontWeight: 'bold',
                                                    color: '#5a3e28',
                                                }}
                                            >
                                                <div className="text-base">{user.name} さん</div>
                                                <div className="text-sm">
                                                    {user.subject} / {user.topic} / {user.book || '－'}
                                                </div>
                                                <div className="text-sm mt-1">{user.content}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* 🔸 右側：タイマー */}
                        {/* 🔸 右側：2/3 幅（タイマー） */}
                        {/* 🔸 右側：画面高いっぱいタイマー */}
                        <div className="md:w-2/3 flex justify-center items-center h-full md:h-[calc(100vh-7rem)]">
                            <div className="w-full max-w-[900px] aspect-square h-full">
                                <PomodoroClock
                                    elapsedMinutes={elapsedSeconds / 60}
                                    isRunning={isRunning}
                                    onToggle={selectedPlan ? (isRunning ? handleStop : handleStart) : null}
                                    onFinish={handleFinish}
                                />
                            </div>
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
        </>
    );
}