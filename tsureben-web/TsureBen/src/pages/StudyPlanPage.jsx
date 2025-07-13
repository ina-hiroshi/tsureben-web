import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { doc, getDoc, updateDoc, deleteField } from 'firebase/firestore';
import { db } from '../firebase';
import { FaRegEdit, FaChevronLeft, FaChevronRight, FaCalendarDay } from 'react-icons/fa';
import Header from '../components/Header';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import ScheduleColumn from '../components/ScheduleColumn';
import TimeInputDialog from '../components/TimeInputDialog';

dayjs.locale('ja');

export default function StudyPlanPage() {
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const [selectedHour, setSelectedHour] = useState(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedEntryIndex, setSelectedEntryIndex] = useState(null);
    const [user, setUser] = useState(null);
    const [dayPlans, setDayPlans] = useState({});

    const hoursAM = [
        '00:00', '01:00', '02:00', '03:00', '04:00',
        '05:00', '06:00', '07:00', '08:00', '09:00',
        '10:00', '11:00', '12:00'
    ];

    const hoursPM = [
        '12:00', '13:00', '14:00', '15:00', '16:00',
        '17:00', '18:00', '19:00', '20:00', '21:00',
        '22:00', '23:00', '24:00'
    ];

    const selectedDateStr = selectedDate.format('YYYY-MM-DD');

    const openDialog = (hourStr, entryIdx = null) => {
        setSelectedHour(hourStr);
        setSelectedEntryIndex(entryIdx);
        setDialogOpen(true);
    };

    const reloadPlans = async (targetDate = selectedDate) => {
        const currentUser = auth.currentUser;
        if (!currentUser || !currentUser.email) return;

        const docRef = doc(db, 'studyPlans', currentUser.email);
        const snapshot = await getDoc(docRef);
        const data = snapshot.exists() ? snapshot.data() : {};
        const dateKey = targetDate.format('YYYY-MM-DD');
        setDayPlans(data[dateKey] || {});
    };

    useEffect(() => {
        const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
            if (currentUser) {
                setUser(currentUser);
                await reloadPlans(selectedDate);
            }
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        if (user && selectedDate) {
            reloadPlans(selectedDate);
        }
    }, [user, selectedDate]);

    const handlePrevDay = () => {
        const newDate = selectedDate.subtract(1, 'day');
        setSelectedDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = selectedDate.add(1, 'day');
        setSelectedDate(newDate);
    };

    const handleToday = () => {
        const today = dayjs();
        setSelectedDate(today);
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

    return (
        <>
            <Header />
            <div className="h-[calc(100vh-6rem)] bg-[#4b4039] text-[#3a2e28] pt-24 px-4 sm:px-6 font-sans overflow-hidden">
                <div className="max-w-7xl mx-auto w-full h-full flex flex-col">
                    <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2 text-[#ede3d2] mb-4">
                        <FaRegEdit className="w-5 h-5 sm:w-6 sm:h-6" />
                        学習計画
                    </h1>

                    <div className="bg-[#ede3d2] p-4 rounded-xl shadow-md mb-0 flex-1 overflow-hidden">
                        {/* 日付ナビ */}
                        <div className="mb-4 flex flex-col sm:relative sm:items-center">
                            {/* 日付テキスト：モバイルでは上に表示 */}
                            <span className="text-base sm:text-lg font-bold text-[#6b4a2b] mb-2 sm:mb-0 sm:absolute sm:left-4 sm:top-1/2 sm:-translate-y-1/2">
                                {selectedDate.format('YYYY年M月D日（ddd）')}
                            </span>

                            {/* ボタン群 */}
                            <div className="flex justify-center flex-wrap gap-2 sm:gap-3">
                                <button
                                    onClick={handlePrevDay}
                                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                                >
                                    <FaChevronLeft className="w-4 h-4" /> 前の日
                                </button>
                                <button
                                    onClick={handleToday}
                                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                                >
                                    <FaCalendarDay className="w-4 h-4" /> 今日
                                </button>
                                <button
                                    onClick={handleNextDay}
                                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                                >
                                    次の日 <FaChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* AM / PM 列 */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 h-full overflow-y-auto pr-2">
                            <ScheduleColumn
                                title="AM（0:00〜12:00）"
                                hours={hoursAM}
                                plans={dayPlans}
                                onClickSlot={openDialog}
                                onDeleteSlot={handleDelete}
                            />
                            <ScheduleColumn
                                title="PM（12:00〜24:00）"
                                hours={hoursPM}
                                plans={dayPlans}
                                onClickSlot={openDialog}
                                onDeleteSlot={handleDelete}
                            />
                        </div>
                    </div>
                </div>

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