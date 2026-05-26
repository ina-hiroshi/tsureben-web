import React, { useRef, useEffect, useState } from 'react';
import { FaUsers } from 'react-icons/fa';
import { collection, doc, getDoc, getDocs, onSnapshot, query } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import dayjs from 'dayjs';

export default function TsurebenActiveUsers() {
    const [activeUsers, setActiveUsers] = useState([]);
    const [mutualMates, setMutualMates] = useState([]);
    const [hiddenRequests, setHiddenRequests] = useState([]);
    const marqueeRef = useRef();
    const todayStr = dayjs().format('YYYY-MM-DD');
    const animationDuration = 10 + activeUsers.length * 2;

    // 🔸 ログインユーザーのメール取得＋仲間データ取得
    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async user => {
            if (!user) return;

            const email = user.email;

            try {
                const usersSnapshot = await getDocs(collection(db, 'users'));
                const usersList = usersSnapshot.docs.map(doc => ({ ...doc.data(), email: doc.id }));

                const me = usersList.find(u => u.email === email);
                const myRequests = me?.turebenRequests || [];
                const hidden = me?.hiddenRequests || [];

                const mutual = [];
                const hiddenMateList = [];

                for (const u of usersList) {
                    if (u.email === email) continue;

                    const theirRequests = u.turebenRequests || [];
                    const iSent = myRequests.includes(u.email);
                    const theySent = theirRequests.includes(email);
                    const isHidden = hidden.includes(u.email);

                    if (iSent && theySent) {
                        if (isHidden) {
                            hiddenMateList.push(u);
                        } else {
                            mutual.push(u);
                        }
                    }
                }

                setMutualMates(mutual);
                setHiddenRequests(hiddenMateList);
            } catch (e) {
                console.error('連れ勉データの取得に失敗', e);
            }
        });

        return () => unsubscribe();
    }, []);

    // 🔸 学習中ユーザーの取得
    useEffect(() => {
        const q = collection(db, 'activePomodoroUsers');

        const unsubscribe = onSnapshot(q, snapshot => {
            const users = snapshot.docs.map(docSnap => {
                const email = docSnap.id;
                const data = docSnap.data();

                return {
                    email,
                    name: data.name || email.split('@')[0],
                    subject: data.subject || '－',
                    topic: data.topic || '－',
                    book: data.book || '－',
                    content: data.content || '－',
                };
            });

            // mutualMates, hiddenRequests を使ってフィルタリング
            const filtered = users.filter(user =>
                user &&
                mutualMates.some(m => m.email === user.email) &&
                !hiddenRequests.some(h => h.email === user.email)
            );

            setActiveUsers(filtered);
        });

        return () => unsubscribe();
    }, [mutualMates, hiddenRequests]);

    // 🔸 Safari再描画対策
    useEffect(() => {
        const el = marqueeRef.current;
        if (!el) return;

        const original = el.style.animation;
        el.style.animation = 'none';

        const timeout = setTimeout(() => {
            el.style.animation = original;
        }, 300);

        return () => clearTimeout(timeout);
    }, [activeUsers]);

    // 🔸 データなしメッセージ
    if (activeUsers.length === 0) {
        return (
            <div className="text-center text-[#927b65] text-lg">
                学習中の連れ勉仲間はいません。
            </div>
        );
    }

    // 🔸 通常表示
    return (
        <div className="w-full text-[#5a3e28]">
            <div className="text-xl font-bold flex items-center gap-2 mb-2">
                <FaUsers className="text-[#5a3e28]" />
                勉強中の連れ勉仲間
            </div>

            <div className="overflow-hidden relative w-full h-[200px]">
                <div
                    ref={marqueeRef}
                    className={`absolute top-0 whitespace-nowrap flex gap-6 ${activeUsers.length > 1 ? 'animate-marqueeHorizontal' : ''}`}
                    style={{
                        animationDuration: `${animationDuration}s`,
                        animationTimingFunction: 'linear',
                        animationIterationCount: 'infinite',
                    }}
                >
                    {[...activeUsers, ...activeUsers].map((user, i) => (
                        <div
                            key={i}
                            className="min-w-[260px] h-[180px] px-4 py-3 rounded-xl shadow-md border border-[#b3936a] bg-[#f0e0c0] text-[#5a3e28] font-bold flex flex-col justify-center"
                        >
                            <div className="text-lg">{user.name} さん</div>
                            <div className="text-base mt-1">
                                {user.subject} / {user.topic} / {user.book || '－'}
                            </div>
                            <div className="text-base mt-1">{user.content}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}