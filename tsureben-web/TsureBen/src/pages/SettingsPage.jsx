import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { auth } from '../firebase';
import { db } from '../firebase';
import Header from '../components/Header';

export default function SettingsPage() {
    const [grade, setGrade] = useState('');
    const [classNum, setClassNum] = useState('');
    const [number, setNumber] = useState('');
    const [shareScope, setShareScope] = useState('学年のみ');
    const [subjectMap, setSubjectMap] = useState({});
    const [selectedSubject, setSelectedSubject] = useState('');
    const [selectedTopic, setSelectedTopic] = useState('');
    const [selectedBook, setSelectedBook] = useState('');
    const [newTopic, setNewTopic] = useState('');
    const [newBook, setNewBook] = useState('');
    const [aprilScore, setAprilScore] = useState(50);
    const [mayScore, setMayScore] = useState(50);
    const [isHigh3OrTeacher, setIsHigh3OrTeacher] = useState(false);

    const classOptions = [...Array(9)].map((_, i) => `${i + 1}`);
    const numberOptions = [...Array(45)].map((_, i) => `${i + 1}`);


    useEffect(() => {
        const checkUserEligibility = async () => {
            const user = auth.currentUser;
            if (!user) return;

            const snap = await getDoc(doc(db, 'users', user.email));
            if (!snap.exists()) return;

            const data = snap.data();
            const isTeacher = data.teacher === true;
            const isHigh3 = data.grade === '高3';
            setIsHigh3OrTeacher(isTeacher || isHigh3);
        };

        checkUserEligibility();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            const user = auth.currentUser;
            if (!user?.email) return;
            const docRef = doc(db, 'users', user.email);
            const snap = await getDoc(docRef);
            if (snap.exists()) {
                const data = snap.data();
                setGrade(data.grade || '');
                setClassNum(data.class || '');
                setNumber(data.number || '');
                setShareScope(data.shareScope || '学年のみ');

                if (data.scores) {
                    const april = data.scores.find(s => s.testName === '4月河合塾全統共テ模試');
                    const may = data.scores.find(s => s.testName === '5月河合記述模試');
                    if (april) setAprilScore(april.value);
                    if (may) setMayScore(may.value);
                }
            }
        };

        const fetchHistory = async () => {
            const user = auth.currentUser;
            if (!user || !user.email) return;
            const docRef = doc(db, 'studyPlans', user.email);
            const snapshot = await getDoc(docRef);
            if (!snapshot.exists()) return;

            const data = snapshot.data();
            const nestedMap = {};
            Object.values(data).forEach(day => {
                Object.values(day).flat().forEach(entry => {
                    const { subject, topic, book } = entry;
                    if (!nestedMap[subject]) nestedMap[subject] = {};
                    if (!nestedMap[subject][topic]) nestedMap[subject][topic] = new Set();
                    nestedMap[subject][topic].add(book);
                });
            });

            const objMap = {};
            for (const subject in nestedMap) {
                objMap[subject] = {};
                for (const topic in nestedMap[subject]) {
                    objMap[subject][topic] = Array.from(nestedMap[subject][topic]);
                }
            }
            setSubjectMap(objMap);
        };

        loadData();
        fetchHistory();
    }, []);

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user?.email) return;
        const docRef = doc(db, 'users', user.email);
        await updateDoc(docRef, {
            grade,
            class: classNum,
            number,
            shareScope,
            scores: [
                { testName: '4月河合塾全統共テ模試', value: aprilScore },
                { testName: '5月河合記述模試', value: mayScore },
            ],
        });
        alert('設定を保存しました');
    };

    const handleBulkUpdate = async () => {
        if (!auth.currentUser?.email) return;
        const email = auth.currentUser.email;

        const planRef = doc(db, 'studyPlans', email);
        const planSnap = await getDoc(planRef);
        if (planSnap.exists()) {
            const data = planSnap.data();

            for (const date in data) {
                const hourMap = data[date];
                for (const hour in hourMap) {
                    const entries = hourMap[hour];
                    hourMap[hour] = entries.map(entry => {
                        let updated = { ...entry };

                        if (entry.topic === selectedTopic) {
                            updated.topic = newTopic.trim() ? newTopic : entry.topic;
                        }
                        if (entry.book === selectedBook) {
                            updated.book = newBook.trim() ? newBook : entry.book;
                        }

                        return updated;
                    });
                }
            }

            await updateDoc(planRef, data);
        }

        const logRef = doc(db, 'studyPomodoroLogs', email);
        const logSnap = await getDoc(logRef);
        if (logSnap.exists()) {
            const logs = logSnap.data();

            for (const date in logs) {
                logs[date] = logs[date].map(entry => {
                    let updated = { ...entry };

                    if (entry.topic === selectedTopic) {
                        updated.topic = newTopic.trim() ? newTopic : entry.topic;
                    }
                    if (entry.book === selectedBook) {
                        updated.book = newBook.trim() ? newBook : entry.book;
                    }

                    return updated;
                });
            }

            await updateDoc(logRef, logs);
        }

        alert('一括変更を完了しました。');
    };

    return (
        <>
            <Header />
            <div className="min-h-screen bg-[#4b4039] text-[#3a2e28] pt-24 p-6 font-sans">
                <div className="max-w-3xl mx-auto space-y-10">
                    {/* 初期設定 */}
                    <div className="bg-[#ede3d2] p-6 rounded-2xl shadow-md">
                        <h2 className="text-2xl font-bold mb-6 text-[#5a3e28]">初期設定の変更</h2>
                        <div className="space-y-6">
                            <div className="flex gap-4">
                                <div className="w-1/3">
                                    <label className="block font-semibold mb-1">学年</label>
                                    <select
                                        className="w-full border rounded px-3 py-1"
                                        value={grade}
                                        onChange={e => setGrade(e.target.value)}
                                    >
                                        <option value="">選択</option>
                                        {["中1", "中2", "中3", "高1", "高2", "高3"].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="block font-semibold mb-1">組</label>
                                    <select
                                        className="w-full border rounded px-3 py-1"
                                        value={classNum}
                                        onChange={e => setClassNum(e.target.value)}
                                    >
                                        <option value="">選択</option>
                                        {classOptions.map(opt => (
                                            <option key={opt} value={opt}>{opt}組</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="w-1/3">
                                    <label className="block font-semibold mb-1">出席番号</label>
                                    <select
                                        className="w-full border rounded px-3 py-1"
                                        value={number}
                                        onChange={e => setNumber(e.target.value)}
                                    >
                                        <option value="">選択</option>
                                        {numberOptions.map(n => (
                                            <option key={n} value={n}>{n}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block font-semibold mb-1">公開範囲（一緒に勉強中の公開）</label>
                                <select
                                    className="w-full border rounded px-3 py-1"
                                    value={shareScope}
                                    onChange={e => setShareScope(e.target.value)}
                                >
                                    <option value="学年のみ">学年のみ</option>
                                    <option value="組のみ">組のみ</option>
                                    <option value="連れ勉仲間のみ">連れ勉仲間のみ</option>
                                </select>
                            </div>
                            <button
                                onClick={handleSave}
                                className="w-full mt-4 bg-[#5a3e28] text-white py-2 rounded hover:bg-[#7a5639]"
                            >
                                保存する
                            </button>
                        </div>
                    </div>


                    {/* 模試の成績 */}
                    {isHigh3OrTeacher && (
                        <div className="bg-[#ede3d2] p-6 rounded-2xl shadow-md">
                            <h2 className="text-2xl font-bold mb-6 text-[#5a3e28]">模試の偏差値</h2>
                            <p className="text-sm text-gray-600 mb-4">
                                ※「学習の記録」のグラフや相関図で使用されます。名前は表示されません。
                            </p>
                            <p className="text-sm text-gray-600 mb-4">
                                ※受験で使う代表的な偏差値を入力してください。例：文系国社英3教科, 理系共テ6教科 など
                            </p>
                            <div className="flex gap-4">
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold mb-1">4月河合塾全統共テ模試</label>
                                    <select
                                        className="w-full border rounded px-3 py-1"
                                        value={aprilScore}
                                        onChange={e => setAprilScore(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 51 }, (_, i) => i + 30).map(score => (
                                            <option key={score} value={score}>{score}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="flex-1">
                                    <label className="block text-sm font-semibold mb-1">5月河合記述模試</label>
                                    <select
                                        className="w-full border rounded px-3 py-1"
                                        value={mayScore}
                                        onChange={e => setMayScore(Number(e.target.value))}
                                    >
                                        {Array.from({ length: 51 }, (_, i) => i + 30).map(score => (
                                            <option key={score} value={score}>{score}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                            <button
                                onClick={handleSave}
                                className="w-full mt-4 bg-[#5a3e28] text-white py-2 rounded hover:bg-[#7a5639]"
                            >
                                保存する
                            </button>
                        </div>
                    )}

                    {/* 学習内容変更 */}
                    <div className="bg-[#ede3d2] p-6 rounded-2xl shadow-md">
                        <h2 className="text-2xl font-bold mb-6 text-[#5a3e28]">登録済みの学習内容の一括変更</h2>
                        <div className="space-y-4">
                            <div>
                                <label className="block font-semibold mb-1">教科</label>
                                <select
                                    className="w-full border rounded px-3 py-1"
                                    value={selectedSubject}
                                    onChange={e => setSelectedSubject(e.target.value)}
                                >
                                    <option value="">選択</option>
                                    {Object.keys(subjectMap).map(sub => (
                                        <option key={sub} value={sub}>{sub}</option>
                                    ))}
                                </select>
                            </div>
                            {selectedSubject && (
                                <div>
                                    <label className="block font-semibold mb-1">科目</label>
                                    <select
                                        className="w-full border rounded px-3 py-1"
                                        value={selectedTopic}
                                        onChange={e => setSelectedTopic(e.target.value)}
                                    >
                                        <option value="">選択</option>
                                        {Object.keys(subjectMap[selectedSubject]).map(t => (
                                            <option key={t} value={t}>{t}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {selectedTopic && (
                                <div>
                                    <label className="block font-semibold mb-1">問題集</label>
                                    <select
                                        className="w-full border rounded px-3 py-1"
                                        value={selectedBook}
                                        onChange={e => setSelectedBook(e.target.value)}
                                    >
                                        <option value="">選択</option>
                                        {subjectMap[selectedSubject][selectedTopic].map(book => (
                                            <option key={book} value={book}>{book}</option>
                                        ))}
                                    </select>
                                </div>
                            )}
                            {(selectedBook || selectedTopic) && (
                                <div className="space-y-2">
                                    <div>
                                        <label className="block font-semibold mb-1">変更後の科目名</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded px-3 py-1"
                                            value={newTopic}
                                            onChange={e => setNewTopic(e.target.value)}
                                            placeholder="（例）数A→数学A"
                                        />
                                    </div>
                                    <div>
                                        <label className="block font-semibold mb-1">変更後の問題集名</label>
                                        <input
                                            type="text"
                                            className="w-full border rounded px-3 py-1"
                                            value={newBook}
                                            onChange={e => setNewBook(e.target.value)}
                                            placeholder="（例）セミナー物理→重要問題集"
                                        />
                                    </div>
                                    <button
                                        onClick={handleBulkUpdate}
                                        className="w-full mt-2 bg-[#5a3e28] text-white py-2 rounded hover:bg-[#7a5639]"
                                    >
                                        一括変更を適用する
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}