import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { auth, db } from '../firebase';
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import { doc, getDoc, setDoc, collection, deleteDoc, onSnapshot } from 'firebase/firestore';
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
    const [initialStartTime, setInitialStartTime] = useState(null);
    const [elapsedSeconds, setElapsedSeconds] = useState(0);
    const [isRunning, setIsRunning] = useState(false);
    const todayStr = dayjs().format('YYYY-MM-DD');
    const [startDateStr, setStartDateStr] = useState(dayjs().format('YYYY-MM-DD'));
    const [activeUsers, setActiveUsers] = useState([]);
    const [pauseElapsedSeconds, setPauseElapsedSeconds] = useState(0);
    const intervalRef = useRef(null);
    const [selectedHour, setSelectedHour] = useState(null);
    const [selectedGrade, setSelectedGrade] = useState(null);
    const [selectedClass, setSelectedClass] = useState(null);
    const [isTeacher, setIsTeacher] = useState(false);

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
        setSelectedHour(hourKey);
    };

    const reloadPlans = async () => {
        if (user) {
            await fetchPlans(user);
        }
    };

    useEffect(() => {
        if (selectedHour !== null && selectedEntryIndex !== null) {
            setDialogOpen(true);
        }
    }, [selectedHour, selectedEntryIndex]);

    const handleStart = async () => {
        if (!selectedPlan) {
            alert("この時間の学習計画が登録されていません。先に登録してください。");
            return;
        }

        if (isRunning) return;

        const now = dayjs();

        if (!initialStartTime) {
            setInitialStartTime(now);
        }

        const dateStr = now.format('YYYY-MM-DD');
        setStartDateStr(dateStr);
        localStorage.setItem('pomodoro-start-date', dateStr); // 🔸 永続化

        setStartTime(now);
        setIsRunning(true);

        // ✅ 初回スタート時
        if (elapsedSeconds === 0 && user) {
            const docRef = doc(db, 'studyPomodoroLogs', user.email);
            const snap = await getDoc(docRef);
            const data = snap.exists() ? snap.data() : {};
            let logsForDate = data[dateStr] || [];

            // duration: null を duration: 0 に補正
            logsForDate = logsForDate.map(log =>
                log.duration == null ? { ...log, duration: 0 } : log
            );

            const newRecord = {
                startTime: now.format('HH:mm'),
                date: dateStr,
                subject: selectedPlan.subject || 'その他',
                topic: selectedPlan.topic || 'ポモドーロ',
                book: selectedPlan.book || '',
                content: selectedPlan.content || '',
                duration: null,
            };

            logsForDate.push(newRecord);

            await setDoc(docRef, {
                ...data,
                [dateStr]: logsForDate,
            });

            const userDoc = await getDoc(doc(db, 'users', user.email));
            if (!userDoc.exists()) return;

            const userData = userDoc.data();

            // ✅ 🔸activePomodoroUsers にも登録
            await setDoc(doc(db, 'activePomodoroUsers', user.email), {
                subject: newRecord.subject,
                topic: newRecord.topic,
                book: newRecord.book,
                content: newRecord.content,
                startTime: newRecord.startTime,

                // 🔸 キャッシュ（名前・表示範囲情報）
                name: userData.name || user.email.split('@')[0],
                grade: userData.grade,
                class: userData.class,
                shareScope: userData.shareScope || '学年のみ',
                turebenRequests: userData.turebenRequests ?? [],
                hiddenRequests: userData.hiddenRequests ?? [],
                hiddenMates: userData.hiddenMates ?? [],
            });
        }
    };

    const handleStop = () => {
        setIsRunning(false);
        setPauseElapsedSeconds(elapsedSeconds);
        clearInterval(timerRef.current);
    };

    const handleFinish = async () => {
        let currentUser = auth.currentUser;

        // ✅ ユーザーまたはメールアドレスがない場合 → 再ログイン
        if (!startTime || !currentUser || !currentUser.email) {
            try {
                const provider = new GoogleAuthProvider();
                const result = await signInWithPopup(auth, provider);
                currentUser = result.user;

                if (!currentUser?.email) {
                    throw new Error("メールアドレスの取得に失敗しました。");
                }

                localStorage.setItem('userEmail', currentUser.email);
                alert("再ログインに成功しました。記録を続けます。");

            } catch (error) {
                console.error("再ログイン失敗:", error);

                let manualMinutes = null;

                while (true) {
                    const manual = window.prompt("再ログインに失敗しました。\n手動で学習時間（分）を入力してください。\n（1〜1000の数値）");

                    if (manual === null) {
                        alert("キャンセルされました。記録は保存されませんでした。");
                        return;
                    }

                    manualMinutes = Number(manual);
                    if (Number.isFinite(manualMinutes) && manualMinutes > 0 && manualMinutes <= 1000) break;

                    alert("入力が不正です。もう一度、1〜1000の数値で入力してください。");
                }

                alert(`${manualMinutes}分として記録しました。`);
                return;
            }
        }

        const userEmail = currentUser.email;

        const confirmed = window.confirm("学習を終了して保存します。よろしいですか？");
        if (!confirmed) return;

        // 🔸 startDateStr を localStorage から復元（なければ fallback）
        const startDateStr = localStorage.getItem('pomodoro-start-date') || dayjs().format('YYYY-MM-DD');

        const docRef = doc(db, 'studyPomodoroLogs', userEmail);
        const snap = await getDoc(docRef);
        if (!snap.exists()) return;

        const data = snap.data();
        const logsForDate = data[startDateStr] || [];

        const formattedStart = initialStartTime?.format('HH:mm');
        if (!formattedStart) return;

        const index = [...logsForDate].reverse().findIndex(
            r => r.startTime === formattedStart && r.duration == null
        );
        if (index === -1) return;

        const realIndex = logsForDate.length - 1 - index;
        let minutes = Math.floor(elapsedSeconds / 60);

        if (!Number.isFinite(minutes) || minutes <= 0 || minutes > 1000) {
            let manualMinutes = null;

            while (true) {
                const manual = window.prompt("学習時間が不正です。\n手動で学習時間（分）を入力してください。\n（1〜1000の数値）");

                if (manual === null) {
                    alert("キャンセルされました。記録は保存されませんでした。");
                    return;
                }

                manualMinutes = Number(manual);
                if (Number.isFinite(manualMinutes) && manualMinutes > 0 && manualMinutes <= 1000) break;

                alert("入力が不正です。もう一度、1〜1000の数値で入力してください。");
            }

            minutes = manualMinutes;
            alert(`${minutes}分として手動記録します`);
        }

        logsForDate[realIndex].duration = minutes;

        await setDoc(docRef, {
            ...data,
            [startDateStr]: logsForDate,
        });

        // ✅ 後始末
        localStorage.removeItem('pomodoro-timer-state');
        localStorage.removeItem('pomodoro-start-date');

        setStartTime(null);
        setElapsedSeconds(0);
        setPauseElapsedSeconds(0);
        setIsRunning(false);
        clearInterval(timerRef.current);

        try {
            await deleteDoc(doc(db, 'activePomodoroUsers', userEmail));
        } catch (e) {
            console.warn("activePomodoroUsers の削除に失敗:", e);
        }
    };

    useEffect(() => {
        if (!isRunning || !startTime) return;

        const updateElapsed = () => {
            const now = dayjs();
            const seconds = now.diff(startTime, 'second') + pauseElapsedSeconds;
            setElapsedSeconds(seconds);
        };

        updateElapsed();
        timerRef.current = setInterval(updateElapsed, 200);

        return () => clearInterval(timerRef.current);
    }, [isRunning, startTime, pauseElapsedSeconds]);

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
        if (!user) return;

        let unsubscribe;

        const fetchAndSubscribe = async () => {
            const currentEmail = user.email;

            // 🔸 自分のユーザーデータを取得（grade/class 判定用）
            const currentUserDoc = await getDoc(doc(db, 'users', currentEmail));
            if (!currentUserDoc.exists()) return;

            const currentUserData = currentUserDoc.data();
            const currentGrade = currentUserData.grade;
            const currentClass = currentUserData.class;
            setIsTeacher(currentUserData.teacher === true);
            if (selectedGrade === null) setSelectedGrade(currentGrade);
            if (selectedClass === null) setSelectedClass(currentClass);

            // 🔸 アクティブユーザーの監視
            unsubscribe = onSnapshot(collection(db, 'activePomodoroUsers'), snapshot => {
                const users = snapshot.docs.map(docSnap => {
                    const email = docSnap.id;
                    if (email === currentEmail) return null;

                    const data = docSnap.data();

                    // 🔸 教員ならすべて表示（公開設定に関わらず）
                    if (isTeacher) {
                        return {
                            email,
                            name: data.name || email.split('@')[0],
                            subject: data.subject || '－',
                            topic: data.topic || '－',
                            book: data.book || '－',
                            content: data.content || '－',
                            grade: data.grade || '',
                            class: data.class || '',
                        };
                    }

                    const show = (() => {
                        switch (data.shareScope) {
                            case 'すべて公開':
                                return true;
                            case '学年のみ':
                                return data.grade === currentGrade;
                            case '組のみ':
                                return data.grade === currentGrade && data.class === currentClass;
                            case '連れ勉仲間のみ':
                                return (
                                    (data.turebenRequests || []).includes(currentEmail) &&
                                    !(data.hiddenMates || []).includes(currentEmail)
                                );
                            default:
                                return false;
                        }
                    })();

                    return show
                        ? {
                            email,
                            name: data.name || email.split('@')[0],
                            subject: data.subject || '－',
                            topic: data.topic || '－',
                            book: data.book || '－',
                            content: data.content || '－',
                            grade: data.grade || '',
                            class: data.class || '',
                        }
                        : null;
                });

                let filtered = users.filter(Boolean);

                if (isTeacher) {
                    if (selectedGrade) {
                        filtered = filtered.filter(u => u.grade === selectedGrade);
                    }
                    if (selectedClass) {
                        filtered = filtered.filter(u => u.class === selectedClass);
                    }
                }

                setActiveUsers(filtered);
            });
        };

        fetchAndSubscribe();

        return () => {
            if (unsubscribe) unsubscribe();
        };
    }, [user, selectedGrade, selectedClass]);

    useEffect(() => {
        if (marqueeRef.current) {
            const height = marqueeRef.current.offsetHeight;
            // 高さに応じて時間を決定（例えば1pxあたり0.1秒）
            const duration = Math.max(60, height * 0.01);
            setAnimationDuration(duration);
        }
    }, [activeUsers]);

    useEffect(() => {
        const handleBeforeUnload = (e) => {
            if (elapsedSeconds > 0) {
                e.preventDefault();
                e.returnValue = ''; // Chromeなどで警告を出すために必要
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
        };
    }, [elapsedSeconds]);

    useEffect(() => {
        const el = marqueeRef.current;
        if (!el) return;

        el.classList.remove('animate-marqueeVertical');
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.classList.add('animate-marqueeVertical');
            });
        });
    }, [activeUsers.length, animationDuration]);


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
                        <div className="md:w-1/3 flex flex-col space-y-4 h-full md:h-[calc(100vh-7rem)]">
                            {/* この時間の学習 */}
                            <div className="p-4 bg-[#ede3d2] rounded shadow text-[#5a3e28] space-y-2">
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

                            {/* 🔸 教員限定のプルダウンを外に出す */}
                            {isTeacher && (
                                <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md">
                                    <div className="mb-3 flex items-center gap-2">
                                        <span className="px-2 py-1 text-xs font-bold bg-[#8f735a] text-white rounded">
                                            教員限定
                                        </span>
                                        <span className="text-sm text-[#4b3b2b]">
                                            勉強中の生徒を絞り込んで表示できます
                                        </span>
                                    </div>

                                    <div className="flex flex-col sm:flex-row gap-3 items-center">
                                        <select
                                            value={selectedGrade}
                                            onChange={e => setSelectedGrade(e.target.value)}
                                            className="p-2 border border-[#8f735a] rounded-md w-full sm:w-auto bg-white text-[#4b3b2b]"
                                        >
                                            <option value="">学年選択</option>
                                            {['中1', '中2', '中3', '高1', '高2', '高3'].map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>

                                        <select
                                            value={selectedClass}
                                            onChange={e => setSelectedClass(e.target.value)}
                                            className="p-2 border border-[#8f735a] rounded-md w-full sm:w-auto bg-white text-[#4b3b2b]"
                                        >
                                            <option value="">全クラス</option>
                                            {[...Array(9)].map((_, i) => (
                                                <option key={i + 1} value={String(i + 1)}>{i + 1}組</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            )}

                            {/* 一緒に勉強中 */}
                            <div
                                className="p-4 bg-[#ede3d2] rounded shadow text-[#5a3e28] flex flex-col grow justify-start"
                                style={{ maxHeight: 'calc(100vh - 7rem - 280px)' }} // ← 高さ調整は必要に応じて微調整
                            >
                                <div className="text-xl font-bold flex items-center gap-2 mb-2">
                                    <FaUsers className="text-[#5a3e28]" />
                                    一緒に勉強中
                                </div>

                                <div className="relative overflow-hidden h-full">
                                    {activeUsers.length === 0 ? (
                                        <div className="text-sm text-gray-500">現在一緒に勉強中の仲間はいません</div>
                                    ) : (
                                        <div
                                            ref={marqueeRef}
                                            className="w-full space-y-4 animate-marqueeVertical"
                                            style={{
                                                ['--tw-animation-duration']: `${animationDuration}s`,
                                            }}
                                        >
                                            {[...activeUsers, ...activeUsers].map((user, i) => (
                                                <div
                                                    key={i}
                                                    className="w-full px-4 py-2 rounded-xl shadow-md border border-[#b3936a] bg-[#f0e0c0] text-[#5a3e28] font-bold"
                                                    style={{ whiteSpace: 'normal' }}
                                                >
                                                    <div className="text-base">{user.name} さん</div>
                                                    <div className="text-sm">{user.subject} / {user.topic} / {user.book || '－'}</div>
                                                    <div className="text-sm mt-1">{user.content}</div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
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
                                    onToggle={() => {
                                        if (selectedPlan) {
                                            isRunning ? handleStop() : handleStart();
                                        } else {
                                            // 🔸編集ダイアログを開く処理をここに
                                            setDialogOpen(true); // 例：TimeInputDialog表示用state
                                        }
                                    }}
                                    onFinish={handleFinish}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ダイアログ */}
                    <TimeInputDialog
                        open={dialogOpen}
                        onClose={() => setDialogOpen(false)}
                        selectedHour={selectedHour}
                        selectedEntryIndex={selectedEntryIndex}
                        selectedDate={dayjs()}
                        reloadPlans={reloadPlans}
                    />
                </div>
            </div>
        </>
    );
}