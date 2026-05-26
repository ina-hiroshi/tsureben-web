import React, { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { FaBook, FaChevronLeft, FaChevronRight, FaCalendarDay } from 'react-icons/fa';
import Header from '../components/Header';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import StudyStackedBarChart from '../components/StudyStackedBarChart';
import StudyTimeline from '../components/StudyTimeline';
import StudyScatterChart from '../components/StudyScatterChart';
import { useTeacherStatus } from '../hooks/useTeacherStatus';

export default function StudyRecordPage() {
    const [selectedDate, setSelectedDate] = useState(dayjs());
    const { isTeacher } = useTeacherStatus();
    const [grades, setGrades] = useState(["中1", "中2", "中3", "高1", "高2", "高3"]);
    const [classes, setClasses] = useState(["1", "2", "3", "4", "5", "6", "7", "8", "9"]);
    const [selectedGrade, setSelectedGrade] = useState("");
    const [selectedClass, setSelectedClass] = useState("");
    const [students, setStudents] = useState([]);
    const [selectedStudentEmail, setSelectedStudentEmail] = useState("");

    // ✅ 学年・クラスが選ばれたら生徒を取得
    useEffect(() => {
        const fetchStudents = async () => {
            if (!selectedGrade || !selectedClass) return;

            const q = query(
                collection(db, "users"),
                where("grade", "==", selectedGrade),
                where("class", "==", selectedClass)
            );

            const snapshot = await getDocs(q);
            const list = snapshot.docs
                .map(doc => ({ id: doc.id, ...doc.data() }))
                .filter(user => user.role !== 'teacher' && user.teacher !== true)
                .sort((a, b) => a.number - b.number);

            setStudents(list);
        };

        fetchStudents();
    }, [selectedGrade, selectedClass]);

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#4b4039] text-[#3a2e28] pt-24 px-3 sm:px-6 font-sans">
                <div className="w-full sm:max-w-7xl sm:mx-auto">
                    {/* タイトル */}
                    <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 text-[#ede3d2] mb-4">
                        <FaBook className="w-5 h-5 sm:w-6 sm:h-6" />
                        学習記録
                    </h1>

                    {/* ✅ 教員用フィルタ */}
                    {isTeacher && (
                        <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md mb-6">
                            {/* 🔸 見出しと説明 */}
                            <div className="mb-3 flex items-center gap-2">
                                <span className="px-2 py-1 text-xs font-bold bg-[#8f735a] text-white rounded">
                                    教員限定
                                </span>
                                <span className="text-sm text-[#4b3b2b]">
                                    生徒の学習記録を確認できます
                                </span>
                            </div>

                            {/* 🔸 フィルター */}
                            <div className="flex flex-col sm:flex-row gap-3 items-center">
                                <select
                                    value={selectedGrade}
                                    onChange={e => setSelectedGrade(e.target.value)}
                                    className="p-2 border border-[#8f735a] rounded-md w-full sm:w-auto bg-white text-[#4b3b2b]"
                                >
                                    <option value="">学年選択</option>
                                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                                </select>

                                <select
                                    value={selectedClass}
                                    onChange={e => setSelectedClass(e.target.value)}
                                    className="p-2 border border-[#8f735a] rounded-md w-full sm:w-auto bg-white text-[#4b3b2b]"
                                >
                                    <option value="">組選択</option>
                                    {classes.map(c => <option key={c} value={c}>{c}組</option>)}
                                </select>

                                <select
                                    value={selectedStudentEmail}
                                    onChange={e => setSelectedStudentEmail(e.target.value)}
                                    className="p-2 border border-[#8f735a] rounded-md w-full sm:w-auto bg-white text-[#4b3b2b]"
                                >
                                    <option value="">生徒選択</option>
                                    {students.map(s => (
                                        <option key={s.id} value={s.id}>
                                            {s.number}番 {s.name}
                                        </option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}


                    {/* 🔸積み上げ棒グラフセクション */}
                    <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md mb-6">
                        <h2 className="text-lg font-bold text-[#5a3e28] mb-3">学習時間の推移</h2>
                        <StudyStackedBarChart
                            userEmail={selectedStudentEmail || auth.currentUser?.email}
                        />
                    </div>

                    {/* 🔸学習時間と偏差値の相関（散布図） */}

                    {((!isTeacher && !selectedStudentEmail && auth.currentUser?.email) ||
                        (selectedStudentEmail && students.find(s => s.id === selectedStudentEmail)?.grade === '高3') ||
                        (isTeacher && !selectedStudentEmail && grades.includes('高3') && auth.currentUser)) && (
                            <StudyScatterChart userEmail={selectedStudentEmail || auth.currentUser?.email} />
                        )}

                    {/* 🔸タイムラインセクション */}
                    <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md mb-6">
                        <h2 className="text-lg font-bold text-[#5a3e28] mb-3">学習タイムライン</h2>
                        <StudyTimeline
                            userEmail={selectedStudentEmail || auth.currentUser?.email}
                        />
                    </div>
                </div>
            </div>
        </>
    );
}