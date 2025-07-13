import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from "../firebase";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteField, collection, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { FaRegEdit, FaBook, FaUsers, FaUserCheck } from "react-icons/fa";
import { AiOutlineClockCircle, AiOutlineClose } from 'react-icons/ai';
import { Dialog } from '@headlessui/react';
import Header from '../components/Header';
import InitialSetupDialog from '../components/InitialSetupDialog';
import ScheduleColumn from '../components/ScheduleColumn';
import TimeInputDialog from '../components/TimeInputDialog';
import DailySubjectPieChart from '../components/DailySubjectPieChart';
import StudyTimeLineChart from '../components/StudyTimeLineChart';
import TsurebenActiveUsers from '../components/TsurebenActiveUsers';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

export default function Home() {
    const [user, setUser] = useState(null);
    const [showSetupDialog, setShowSetupDialog] = useState(false);
    const [checkingUserData, setCheckingUserData] = useState(true);
    const navigate = useNavigate();

    // 初期設定用のステート
    const [grade, setGrade] = useState('');
    const [classNum, setClassNum] = useState('');
    const [number, setNumber] = useState('');
    const [shareScope, setShareScope] = useState('全体公開');

    //学習計画設定用のステート

    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [selectedHour, setSelectedHour] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEntryIndex, setSelectedEntryIndex] = useState(null);
    const [form, setForm] = useState({
        start: '',
        end: '',
        subject: '',
        topic: '',
        book: '',
        content: '',
    });

    //連れ勉仲間申請

    const [receivedRequests, setReceivedRequests] = useState([]);

    const loadPendingTurebenRequests = async (email) => {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ ...doc.data(), email: doc.id }));

        const me = usersList.find(u => u.email === email);
        if (!me) return [];

        const myRequests = me.turebenRequests ?? [];
        const hidden = me.hiddenRequests ?? [];

        const pending = [];

        for (const user of usersList) {
            if (user.email === email) continue;

            const othersRequests = user.turebenRequests ?? [];
            const iSent = myRequests.includes(user.email);
            const theySent = othersRequests.includes(email);
            const isHidden = hidden.includes(user.email);

            if (theySent && !iSent && !isHidden) {
                pending.push(user); // 承認待ちリストに追加
            }
        }

        return pending; // ここで受信した申請だけを返す
    };

    const handleAccept = async (targetEmail) => {
        const docRef = doc(db, 'users', user.email);
        await updateDoc(docRef, {
            turebenRequests: arrayUnion(targetEmail),
        });
        const updated = await loadPendingTurebenRequests(user.email);
        setReceivedRequests(updated);
    };

    useEffect(() => {
        if (user?.email) {
            loadPendingTurebenRequests(user.email).then(setReceivedRequests); // 状態に保存
        }
    }, [user]);

    const openDialog = (hourStr = dayjs().hour().toString().padStart(2, '0'), entryIdx = null) => {
        setSelectedHour(hourStr);
        setSelectedEntryIndex(entryIdx);

        if (entryIdx !== null && dayPlans[hourStr]) {
            const entry = dayPlans[hourStr][entryIdx];
            setForm(entry);
        } else {
            setForm({
                start: '',
                end: '',
                subject: '',
                topic: '',
                book: '',
                content: '',
            });
        }

        setDialogOpen(true);
    };

    const hoursFullDay = Array.from({ length: 25 }, (_, i) => `${i}:00`.padStart(5, '0'));

    const [dayPlans, setDayPlans] = useState({});
    const selectedDateStr = selectedDate.format('YYYY-MM-DD');

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const docRef = doc(db, 'users', currentUser.email);
                const docSnap = await getDoc(docRef);
                if (!docSnap.exists()) {
                    setShowSetupDialog(true);
                }
                setCheckingUserData(false);
            }
        });
        return () => unsubscribe();
    }, []);

    // 🔁 学習計画の読み込み：user と selectedDate が揃ったら実行
    useEffect(() => {
        if (!user || !user.email || !selectedDate) return;
        reloadPlans(selectedDate);
    }, [user, selectedDate]);

    // 🔁 reloadPlans の定義
    const reloadPlans = async (targetDate = selectedDate) => {
        if (!user || !user.email) return;

        const docRef = doc(db, 'studyPlans', user.email);
        const snapshot = await getDoc(docRef);
        if (!snapshot.exists()) {
            setDayPlans({});
            return;
        }

        const data = snapshot.data();
        const dateKey = targetDate.format('YYYY-MM-DD');
        setDayPlans(data[dateKey] || {});
    };
    // Firebase Auth からユーザー取得
    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                const docRef = doc(db, 'users', currentUser.email); // ✅ emailで取得
                const docSnap = await getDoc(docRef);

                if (!docSnap.exists()) {
                    setShowSetupDialog(true);
                }
                setCheckingUserData(false);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleSaveUserSettings = async () => {
        if (!user || !user.email) return;

        const emailPrefix = user.email.split('@')[0];
        const isTeacher = /^\d{1,4}$/.test(emailPrefix); // ← 数字のみで4桁以下かを判定

        const userData = {
            name: user.displayName || '',
            grade,
            class: classNum,
            number,
            shareScope,
        };

        if (isTeacher) {
            userData.teacher = true;
        }

        await setDoc(doc(db, 'users', user.email), userData);

        setShowSetupDialog(false);
    };

    const handleDelete = async (hour, entryIdx) => {
        const confirmDelete = window.confirm('この学習計画を削除しますか？');
        if (!confirmDelete) return;

        const user = auth.currentUser;
        if (!user || !user.email) return;

        const docRef = doc(db, 'studyPlans', user.email);
        const dateKey = selectedDate.format('YYYY-MM-DD');

        try {
            const snapshot = await getDoc(docRef);
            if (!snapshot.exists()) return;

            const data = snapshot.data();
            const current = data?.[dateKey]?.[hour] || [];

            const updated = [...current];
            updated.splice(entryIdx, 1); // 対象の1件だけ削除

            const newData =
                updated.length > 0
                    ? { [`${dateKey}.${hour}`]: updated }
                    : { [`${dateKey}.${hour}`]: deleteField() };

            await updateDoc(docRef, newData);
            await reloadPlans();
        } catch (e) {
            console.error('削除に失敗:', e);
        }
    };
    if (checkingUserData) return null;

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#4b4039] text-[#3a2e28] pt-24 p-6 font-sans">
                {/* フィードバックリンク */}
                <div className="max-w-7xl mx-auto mb-6">
                    <div className="bg-[#fff8e6] border border-[#e6cfa4] rounded-2xl shadow p-4 text-[#5a3e28]">
                        <h2 className="text-lg font-bold mb-2">このアプリについてのご意見・ご要望</h2>
                        <p className="mb-3 text-sm">
                            改善のために、ぜひ皆さんのフィードバックをお聞かせください。
                            不具合の報告・機能の提案など、どんなことでも歓迎です。（伊奈）
                        </p>
                        <p className="mb-3 text-sm"> ☆一時停止した学習計測で，保存できない不具合を修正しました。</p>
                        <p className="mb-3 text-sm">☆学習計測での学習計画の編集の不具合を修正しました。</p>
                        <p className="mb-3 text-sm">☆HOME画面の円グラフの表示を最適化しました。</p>
                        <p className="mb-3 text-sm">☆一緒に勉強中の公開範囲が選択通りになりました（ヘッダーの歯車のアイコンから設定を変更できます）</p>
                        <p className="mb-3 text-sm">☆すでに登録した科目・問題集を一括で変更できるようになりました。</p>
                        <a
                            href="https://docs.google.com/forms/d/e/1FAIpQLSembw-uo9NbOfUD-w4YLxvYoWTRU-koEwPoAM7BXoH5QBQG7g/viewform?usp=dialog"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-block bg-[#a67c52] hover:bg-[#b68b60] text-white font-semibold py-2 px-4 rounded transition"
                        >
                            フィードバックフォームを開く
                        </a>
                    </div>
                </div>

                <div className="max-w-7xl mx-auto mb-6 space-y-6">
                    <div className="bg-[#fff8e6] ..."> {/* フィードバックエリア */} </div>

                    {receivedRequests.length > 0 && (
                        <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md">
                            <h2 className="font-bold mb-2 flex items-center gap-2">
                                <FaUserCheck className="text-blue-600" />
                                連れ勉仲間申請 承認待ち（相手から）
                            </h2>
                            <ul className="space-y-2">
                                {receivedRequests.map(user => (
                                    <li key={user.email} className="flex items-center justify-between border p-2 rounded">
                                        <span>{user.name}</span>
                                        <button
                                            onClick={() => handleAccept(user.email)}
                                            className="bg-[#5a3e28] hover:bg-[#7c5d45] text-white px-3 py-1 rounded text-sm"
                                        >
                                            承認する
                                        </button>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 左列 */}
                    <div className="lg:col-span-2 space-y-6 min-h-[calc(100vh-120px)]">
                        {/* メニュー */}
                        <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md flex flex-col gap-6">
                            <h2 className="text-xl font-bold text-[#6b4a2b]">メニュー</h2>

                            {/* ✅ タイマーボタン：横幅いっぱい＆細め（フォント統一） */}
                            <div>
                                <button
                                    onClick={() => navigate('/pomodoro')}
                                    className="w-full flex items-center justify-center gap-2 px-4 py-2 sm:py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-[1.02] hover:brightness-110 transition text-[3vw] sm:text-base"
                                >
                                    <AiOutlineClockCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                                    <span className="whitespace-nowrap">学習計測</span>
                                </button>
                            </div>

                            {/* ✅ その他のボタン：常に3列表示に変更 */}
                            <div className="grid grid-cols-3 gap-2 sm:gap-4 text-[3vw] sm:text-base">
                                <button
                                    onClick={() => navigate('/studyplan')}
                                    className="btn bg-[#a67c52] hover:bg-[#b68b60] flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2"
                                >
                                    <FaRegEdit className="w-5 h-5" />
                                    <span className="truncate">学習計画</span>
                                </button>

                                <button
                                    onClick={() => navigate('/studyrecord')}
                                    className="btn bg-[#8f735a] hover:bg-[#a1866b] flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2"
                                >
                                    <FaBook className="w-5 h-5" />
                                    <span className="truncate">学習記録</span>
                                </button>

                                <button
                                    onClick={() => navigate('/turebenmate')}
                                    className="btn bg-[#726256] hover:bg-[#85756a] flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2"
                                >
                                    <FaUsers className="w-5 h-5" />
                                    <span className="truncate">連れ勉仲間</span>
                                </button>
                            </div>
                        </section>

                        {/* グラフ・ランキング */}
                        <div className="flex flex-col lg:flex-row gap-4">
                            {/* 円グラフ */}
                            <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md text-[#927b65] flex-1 h-80">
                                <DailySubjectPieChart />
                            </section>

                            {/* 折れ線グラフ */}
                            <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md text-[#927b65] flex-1 h-80">
                                <StudyTimeLineChart />
                            </section>
                        </div>
                        <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md h-64 flex items-center justify-center">
                            <TsurebenActiveUsers />
                        </section>
                    </div>

                    {/* 右列 */}
                    <div className="bg-[#ede3d2] p-6 rounded-2xl shadow-md h-[840px] flex flex-col">
                        <h2 className="text-xl font-bold text-[#6b4a2b] mb-4 text-center">
                            {selectedDate.format('M月D日（ddd）')}のスケジュール
                        </h2>
                        <div className="overflow-y-auto pr-2 flex-1">
                            <ScheduleColumn
                                title=""
                                titleDate={selectedDate.format('YYYY-MM-DD')}
                                hours={hoursFullDay}
                                onClickSlot={openDialog}
                                plans={dayPlans}
                                onDeleteSlot={handleDelete}
                            />
                        </div>
                    </div>
                </div>

                {/* 初回設定ダイアログ */}
                <InitialSetupDialog
                    show={showSetupDialog}
                    grade={grade}
                    classNum={classNum}
                    number={number}
                    shareScope={shareScope}
                    setGrade={setGrade}
                    setClassNum={setClassNum}
                    setNumber={setNumber}
                    setShareScope={setShareScope}
                    onSave={handleSaveUserSettings}
                />

                <TimeInputDialog
                    open={dialogOpen}
                    onClose={() => setDialogOpen(false)}
                    selectedHour={selectedHour}
                    selectedDate={selectedDate}
                    selectedEntryIndex={selectedEntryIndex}
                    reloadPlans={reloadPlans}
                />
            </div>
        </>
    );
}