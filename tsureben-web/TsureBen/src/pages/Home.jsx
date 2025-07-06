import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from "../firebase";
import { doc, getDoc, setDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { FaRegEdit, FaBook, FaUsers } from "react-icons/fa";
import { AiOutlineClose } from 'react-icons/ai';
import { Dialog } from '@headlessui/react';
import InitialSetupDialog from '../components/InitialSetupDialog';
import ScheduleColumn from '../components/ScheduleColumn';
import TimeInputDialog from '../components/TimeInputDialog';
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

        await setDoc(doc(db, 'users', user.email), {
            grade,
            class: classNum,
            number,
            shareScope
        });

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
        <div className="min-h-screen bg-[#4b4039] text-[#3a2e28] pt-24 p-6 font-sans">
            <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* 左列 */}
                <div className="lg:col-span-2 space-y-6">
                    {/* メニュー */}
                    <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md flex flex-col gap-4">
                        <h2 className="text-xl font-bold text-[#6b4a2b]">メニュー</h2>
                        <div className="grid grid-cols-3 gap-4">
                            <button
                                onClick={() => navigate('/studyplan')}
                                className="btn bg-[#a67c52] hover:bg-[#b68b60] flex items-center justify-center gap-2"
                            >
                                <FaRegEdit className="w-5 h-5" />
                                学習計画
                            </button>
                            <button className="btn bg-[#8f735a] hover:bg-[#a1866b] flex items-center justify-center gap-2">
                                <FaBook className="w-5 h-5" />
                                学習記録
                            </button>
                            <button className="btn bg-[#726256] hover:bg-[#85756a] flex items-center justify-center gap-2">
                                <FaUsers className="w-5 h-5" />
                                友達の様子
                            </button>
                        </div>
                    </section>

                    {/* グラフ・ランキング */}
                    <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md h-64 flex items-center justify-center text-[#927b65]">
                        グラフ（準備中）
                    </section>
                    <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md h-64 flex items-center justify-center text-[#927b65]">
                        連れ勉仲間（準備中）
                    </section>
                </div>

                {/* 右列 */}
                <div className="bg-[#ede3d2] p-6 rounded-2xl shadow-md">
                    <h2 className="text-xl font-bold text-[#6b4a2b] mb-4 text-center">
                        {selectedDate.format('M月D日（ddd）')}のスケジュール
                    </h2>
                    <div className="h-[calc(100vh-120px)] overflow-y-auto pr-2">
                        <ScheduleColumn
                            title=""
                            titleDate={selectedDate.format('YYYY-MM-DD')} // ← 🔸追加
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
    );
}