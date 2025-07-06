import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { AiOutlineClose } from 'react-icons/ai';
import { db, auth } from '../firebase';
import { doc, setDoc, getDoc, deleteField } from 'firebase/firestore';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';

const TimeInputDialog = ({ open, onClose, selectedMinute = null, selectedHour, selectedDate, selectedEntryIndex, reloadPlans }) => {
    const [form, setForm] = useState({ start: '', end: '', subject: '', topic: '', book: '', content: '' });
    const [hourOptions, setHourOptions] = useState([]);
    const [subjectMap, setSubjectMap] = useState({});
    const [subjectList] = useState(['国語', '数学', '英語', '理科', '社会', '情報', 'その他']);



    useEffect(() => {
        if (!open || selectedEntryIndex !== null) return;

        const minute = selectedMinute ?? '00';

        const start = `${selectedHour}:${minute}`;
        const end = `${selectedHour}:00`;

        console.log("🟡 selectedMinute:", selectedMinute);
        console.log("🟡 初期start:", start);

        setForm((prev) => ({
            ...prev,
            start,
            end,
        }));

        // ✅ 時間選択肢を 00〜24 にする
        const allHours = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, '0'));
        setHourOptions(allHours);
    }, [open, selectedHour, selectedMinute, selectedEntryIndex]);

    useEffect(() => {
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
        fetchHistory();
    }, []);

    useEffect(() => {
        const fetchExistingData = async () => {
            const user = auth.currentUser;
            if (!user || !user.email) return;

            const docRef = doc(db, 'studyPlans', user.email);
            const snapshot = await getDoc(docRef);
            if (!snapshot.exists()) return;

            const data = snapshot.data();
            const dateKey = selectedDate.format('YYYY-MM-DD');
            const entries = Array.isArray(data?.[dateKey]?.[selectedHour]) ? data[dateKey][selectedHour] : [];

            const target = entries[selectedEntryIndex];
            if (target) {
                setForm({
                    start: target.start,
                    end: target.end,
                    subject: target.subject,
                    topic: target.topic,
                    book: target.book,
                    content: target.content,
                });
            }
        };

        if (open && selectedEntryIndex !== null) {
            fetchExistingData();
        }
    }, [open, selectedDate, selectedHour, selectedEntryIndex]);

    const handleSave = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) return;

        const requiredFields = ['start', 'end', 'subject', 'topic', 'book', 'content'];
        for (const field of requiredFields) {
            if (!form[field] || form[field].trim() === '') {
                alert('すべての項目を入力してください。');
                return;
            }
        }

        const start = dayjs(`${selectedDate.format('YYYY-MM-DD')}T${form.start}`);
        const end = dayjs(`${selectedDate.format('YYYY-MM-DD')}T${form.end}`);

        if (!start.isValid() || !end.isValid()) {
            alert('時刻の形式が不正です。');
            return;
        }

        if (start.isSame(end)) {
            alert('開始時刻と終了時刻が同じです。時間帯を見直してください。');
            return;
        }

        if (start.isAfter(end)) {
            alert('開始時刻が終了時刻より後になっています。正しい時間帯を選択してください。');
            return;
        }

        const docRef = doc(db, 'studyPlans', user.email);
        const dateKey = selectedDate.format('YYYY-MM-DD');
        const newHourKey = form.start.split(':')[0];

        const snapshot = await getDoc(docRef);
        const existingData = snapshot.exists() ? snapshot.data() : {};
        const existingDayPlans = existingData[dateKey] || {};

        // ─────────────────────
        // 編集モードかつ hour が変更された場合、旧データを削除
        // ─────────────────────
        if (selectedEntryIndex !== null && selectedHour !== newHourKey) {
            const oldHourPlans = Array.isArray(existingDayPlans[selectedHour])
                ? [...existingDayPlans[selectedHour]]
                : existingDayPlans[selectedHour]
                    ? [existingDayPlans[selectedHour]]
                    : [];

            oldHourPlans.splice(selectedEntryIndex, 1); // 該当entryを削除

            if (oldHourPlans.length > 0) {
                // → データが残っていればそのまま残す
                existingDayPlans[selectedHour] = oldHourPlans;
            } else {
                // → データが空なら削除予約を入れる
                await setDoc(docRef, {
                    [dateKey]: {
                        [selectedHour]: deleteField(), // ✅ 明示的に削除
                    }
                }, { merge: true });

                delete existingDayPlans[selectedHour]; // ローカルデータも消しておく
            }
        }

        // ─────────────────────
        // 新hourKey に登録
        // ─────────────────────
        const newHourPlans = Array.isArray(existingDayPlans[newHourKey])
            ? [...existingDayPlans[newHourKey]]
            : existingDayPlans[newHourKey]
                ? [existingDayPlans[newHourKey]]
                : [];

        const newEntry = {
            date: dateKey,
            hour: newHourKey,
            ...form,
        };

        if (selectedEntryIndex !== null && selectedHour === newHourKey) {
            // same hour: 上書き
            newHourPlans[selectedEntryIndex] = newEntry;
        } else {
            // new hour or 新規: 追加
            newHourPlans.push(newEntry);
        }

        // Firestore 保存
        await setDoc(docRef, {
            [dateKey]: {
                ...existingDayPlans,
                [newHourKey]: newHourPlans,
            }
        }, { merge: true });

        await loadOptions();
        await reloadPlans(selectedDate);
        setForm({ start: '', end: '', subject: '', topic: '', book: '', content: '' });
        onClose();
    };

    const loadOptions = async () => {
        const user = auth.currentUser;
        if (!user || !user.email) return;

        const docSnap = await getDoc(doc(db, 'studyPlans', user.email));
        const data = docSnap.exists() ? docSnap.data() : {};
        const allEntries = Object.values(data).flatMap(day => Object.values(day).flat());

        const newMap = {};
        for (const entry of allEntries) {
            const subject = entry.subject?.trim();
            const topic = entry.topic?.trim();
            const book = entry.book?.trim();
            if (!subject || !topic || !book) continue;

            if (!newMap[subject]) newMap[subject] = {};
            if (!newMap[subject][topic]) newMap[subject][topic] = [];
            if (!newMap[subject][topic].includes(book)) {
                newMap[subject][topic].push(book);
            }
        }

        setSubjectMap(newMap);
    };

    const baseMinuteOptions = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));
    const [minuteOptions, setMinuteOptions] = useState(baseMinuteOptions);
    const currentTopics = subjectMap[form.subject] ? Object.keys(subjectMap[form.subject]) : [];
    const currentBooks = subjectMap[form.subject]?.[form.topic] || [];

    useEffect(() => {
        if (selectedMinute && !baseMinuteOptions.includes(selectedMinute)) {
            setMinuteOptions([selectedMinute, ...baseMinuteOptions].sort());
        } else {
            setMinuteOptions(baseMinuteOptions);
        }
    }, [selectedMinute]);

    // ✅ 修正済み useEffect
    useEffect(() => {
        if (!open) return;

        // 🔸 常に 00〜24 を選択肢とする
        const allHours = Array.from({ length: 25 }, (_, i) => String(i).padStart(2, '0'));
        setHourOptions(allHours);
    }, [open]);

    useEffect(() => {
        if (open) {
            loadOptions();
        }
    }, [open]);

    return (
        <Dialog open={open} onClose={onClose} className="relative z-50">
            <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-30">
                <div className="relative bg-white p-6 rounded-xl w-[28rem] shadow-lg">
                    <button onClick={onClose} className="absolute top-2 right-2 text-gray-500 hover:text-gray-700 text-xl">
                        <AiOutlineClose />
                    </button>

                    <h3 className="text-xl font-bold mb-4">学習内容の登録  {selectedHour}:00 〜</h3>

                    <div className="space-y-4">
                        <div className="flex gap-8">
                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-600 mb-1">開始時間</p>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={form.start.split(':')[0] || selectedHour}
                                        onChange={e =>
                                            setForm({
                                                ...form,
                                                start: `${e.target.value}:${form.start.split(':')[1] || '00'}`
                                            })
                                        }
                                        className="border px-2 py-1 rounded"
                                    >
                                        {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <span className="text-base font-semibold">:</span>
                                    <select
                                        value={form.start.split(':')[1] || '00'}
                                        onChange={e =>
                                            setForm({
                                                ...form,
                                                start: `${form.start.split(':')[0] || selectedHour}:${e.target.value}`
                                            })
                                        }
                                        className="border px-2 py-1 rounded"
                                    >
                                        {minuteOptions.map(min => <option key={min} value={min}>{min}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="flex-1">
                                <p className="text-sm font-bold text-gray-600 mb-1">終了時間</p>
                                <div className="flex items-center gap-2">
                                    <select
                                        value={form.end.split(':')[0] || ''}
                                        onChange={e => setForm({ ...form, end: `${e.target.value}:${form.end.split(':')[1] || '00'}` })}
                                        className="border px-2 py-1 rounded"
                                    >
                                        {hourOptions.map(h => <option key={h} value={h}>{h}</option>)}
                                    </select>
                                    <span className="text-lg font-semibold">:</span>
                                    <select
                                        value={form.end.split(':')[1] || '00'}
                                        onChange={e => setForm({ ...form, end: `${form.end.split(':')[0] || hourOptions[0]}:${e.target.value}` })}
                                        className="border px-2 py-1 rounded"
                                    >
                                        {minuteOptions.map(min => <option key={min} value={min}>{min}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-bold text-gray-600 mb-1">教科</p>
                            <div className="flex gap-2">
                                <select
                                    value={form.subject}
                                    onChange={e => setForm({ ...form, subject: e.target.value, topic: '', book: '' })}
                                    className="w-1/2 border px-3 py-1 rounded"
                                >
                                    <option value="">選択してください</option>
                                    {subjectList.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                                </select>
                                <input
                                    className="w-1/2 border px-3 py-1 rounded"
                                    placeholder="新規教科"
                                    value={form.subject}
                                    onChange={e => setForm({ ...form, subject: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-bold text-gray-600 mb-1">科目</p>
                            <div className="flex gap-2">
                                <select
                                    value={form.topic}
                                    onChange={e => setForm({ ...form, topic: e.target.value, book: '' })}
                                    className="w-1/2 border px-3 py-1 rounded"
                                >
                                    <option value="">選択してください</option>
                                    {currentTopics.map(topic => <option key={topic} value={topic}>{topic}</option>)}
                                </select>
                                <input
                                    className="w-1/2 border px-3 py-1 rounded"
                                    placeholder="新規科目"
                                    value={form.topic}
                                    onChange={e => setForm({ ...form, topic: e.target.value })}
                                />
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-bold text-gray-600 mb-1">問題集名</p>
                            <div className="flex gap-2">
                                <select
                                    value={form.book}
                                    onChange={e => setForm({ ...form, book: e.target.value })}
                                    className="w-1/2 border px-3 py-1 rounded"
                                >
                                    <option value="">選択してください</option>
                                    {currentBooks.map(book => <option key={book} value={book}>{book}</option>)}
                                </select>
                                <input
                                    className="w-1/2 border px-3 py-1 rounded"
                                    placeholder="新規問題集名"
                                    value={form.book}
                                    onChange={e => setForm({ ...form, book: e.target.value })}
                                />
                            </div>
                        </div>

                        <textarea
                            className="w-full border px-3 py-1 rounded"
                            placeholder="学習内容"
                            value={form.content}
                            onChange={e => setForm({ ...form, content: e.target.value })}
                        />
                    </div>

                    <button
                        onClick={handleSave}
                        className="mt-6 w-full bg-[#5a3e28] text-white py-2 rounded hover:bg-[#7a5639]"
                    >
                        保存
                    </button>
                </div>
            </div>
        </Dialog>
    );
};

export default TimeInputDialog;