import React, { useState, useEffect, useRef } from 'react';
import { collection, getDocs, doc, updateDoc, arrayUnion, arrayRemove } from 'firebase/firestore';
import { db, auth } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import Header from '../components/Header';
import { FaUsers, FaHandshake, FaHourglassHalf, FaSearch, FaUserCheck, FaUserSlash } from 'react-icons/fa';

export default function TureBenMatePage() {
    const [currentUserEmail, setCurrentUserEmail] = useState(null);
    const [query, setQuery] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedEmails, setSelectedEmails] = useState([]);
    const [loading, setLoading] = useState(false);
    const [turebenRequests, setTurebenRequests] = useState([]);
    const [mutualMates, setMutualMates] = useState([]);
    const [receivedRequests, setReceivedRequests] = useState([]);
    const [hiddenRequests, setHiddenRequests] = useState([]);
    const [showHidden, setShowHidden] = useState(false);
    const [showHiddenMates, setShowHiddenMates] = useState(false);
    const [hiddenMutualMates, setHiddenMutualMates] = useState([]);

    const userCache = useRef({});

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            if (user) {
                setCurrentUserEmail(user.email);
                await loadMateData(user.email);
            }
        });
        return () => unsubscribe();
    }, []);

    const loadMateData = async (email) => {
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersList = usersSnapshot.docs.map(doc => ({ ...doc.data(), email: doc.id }));
        userCache.current = Object.fromEntries(usersList.map(u => [u.email, u]));

        const me = usersList.find(u => u.email === email);
        const myRequests = me?.turebenRequests || [];
        const hidden = me?.hiddenRequests || [];

        const mutual = [];
        const requests = [];
        const received = [];
        const hiddenPending = [];
        const hiddenMateList = [];

        for (const user of usersList) {
            if (user.email === email) continue;

            const othersRequests = user.turebenRequests || [];
            const iSent = myRequests.includes(user.email);
            const theySent = othersRequests.includes(email);
            const isHidden = hidden.includes(user.email);

            if (isHidden) {
                // 🔹 非表示の中でも、承認待ちか、仲間かで分岐
                if (theySent && !iSent) {
                    hiddenPending.push(user); // 承認待ち
                } else if (iSent && theySent) {
                    hiddenMateList.push(user); // 仲間の非表示
                }
                continue;
            }

            if (iSent && theySent) {
                mutual.push(user);
            } else if (iSent) {
                requests.push(user);
            } else if (theySent) {
                received.push(user);
            }
        }

        setTurebenRequests(requests);
        setMutualMates(mutual);
        setReceivedRequests(received);
        setHiddenRequests(hiddenPending);     // ← 承認待ち非表示
        setHiddenMutualMates(hiddenMateList); // ← 仲間の非表示
    };

    const handleSearch = async () => {
        if (!query.trim()) return;

        setLoading(true);
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const results = [];

        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (
                data.name?.includes(query) &&
                doc.id !== currentUserEmail
            ) {
                results.push({ ...data, id: doc.id, email: doc.id });
            }
        });

        setSearchResults(results.slice(0, 10));
        setLoading(false);
    };

    const toggleSelect = (email) => {
        setSelectedEmails(prev =>
            prev.includes(email) ? prev.filter(e => e !== email) : [...prev, email]
        );
    };

    const handleRequest = async () => {
        if (!currentUserEmail || selectedEmails.length === 0) return;

        const userRef = doc(db, 'users', currentUserEmail);
        await updateDoc(userRef, {
            turebenRequests: arrayUnion(...selectedEmails),
        });

        const names = selectedEmails.map(email => userCache.current[email]?.name || email);
        alert(`以下のユーザーに申請を送信しました：\n${names.join(', ')}`);
        setSelectedEmails([]);
        await loadMateData(currentUserEmail);
    };


    const handleCancelRequest = async (emailToCancel) => {
        if (!currentUserEmail) return;

        try {
            const userRef = doc(db, "users", currentUserEmail);
            await updateDoc(userRef, {
                turebenRequests: arrayRemove(emailToCancel),
            });

            // UI上からも削除
            setTurebenRequests(prev => prev.filter(user => user.email !== emailToCancel));
        } catch (error) {
            console.error("申請取消エラー:", error);
        }
    };

    const handleAccept = async (emailToAccept) => {
        if (!currentUserEmail) return;

        // turebenRequests に相手を追加
        const userRef = doc(db, 'users', currentUserEmail);
        await updateDoc(userRef, {
            turebenRequests: arrayUnion(emailToAccept),
        });

        // 承認待ちから削除、連れ勉仲間に追加
        const acceptedUser = receivedRequests.find(user => user.email === emailToAccept);
        setReceivedRequests(prev => prev.filter(user => user.email !== emailToAccept));
        if (acceptedUser) {
            setMutualMates(prev => [...prev, acceptedUser]);
        }
    };

    const handleHide = async (targetEmail) => {
        const userRef = doc(db, 'users', currentUserEmail);

        // 対象ユーザーを取得
        const targetUser = userCache.current[targetEmail];
        const userName = targetUser?.name || targetEmail;

        // 今の状態を確認してどのリストにいるか判断
        const isMutual = mutualMates.some(u => u.email === targetEmail);

        // Firestoreに登録（hiddenRequests or hiddenMates）
        await updateDoc(userRef, {
            [isMutual ? 'hiddenMates' : 'hiddenRequests']: arrayUnion(targetEmail),
        });

        // 各表示リストから除外
        setReceivedRequests(prev => prev.filter(user => user.email !== targetEmail));
        setTurebenRequests(prev => prev.filter(user => user.email !== targetEmail));
        setMutualMates(prev => prev.filter(user => user.email !== targetEmail));

        // 非表示リストに追加
        if (isMutual) {
            setHiddenMutualMates(prev => [...prev, targetUser]);
        } else {
            setHiddenRequests(prev => [...prev, targetUser]);
        }

        alert(`${userName} さんを非表示にしました`);
    };

    const handleUnhide = async (emailToUnhide) => {
        const userRef = doc(db, 'users', currentUserEmail);
        const user = userCache.current[emailToUnhide];
        const myRequests = userCache.current[currentUserEmail]?.turebenRequests || [];
        const theirRequests = user?.turebenRequests || [];

        const isMutual = myRequests.includes(emailToUnhide) && theirRequests.includes(currentUserEmail);

        // Firestoreのhidden◯から削除
        await updateDoc(userRef, {
            [isMutual ? 'hiddenMates' : 'hiddenRequests']: arrayRemove(emailToUnhide),
        });

        // ローカルリスト更新
        if (isMutual) {
            setHiddenMutualMates(prev => prev.filter(u => u.email !== emailToUnhide));
            setMutualMates(prev => [...prev, user]);
        } else {
            setHiddenRequests(prev => prev.filter(u => u.email !== emailToUnhide));

            if (myRequests.includes(emailToUnhide)) {
                setTurebenRequests(prev => [...prev, user]);
            } else if (theirRequests.includes(currentUserEmail)) {
                setReceivedRequests(prev => [...prev, user]);
            }
        }
    };

    return (
        <>
            <Header />
            <div className="h-[calc(100vh-6rem)] bg-[#4b4039] text-[#3a2e28] pt-24 px-3 sm:px-6 font-sans overflow-hidden">
                <div className="w-full sm:max-w-7xl sm:mx-auto h-full flex flex-col">
                    <h1 className="text-lg sm:text-2xl font-bold flex items-center gap-2 text-[#ede3d2] mb-4">
                        <FaUsers className="w-5 h-5 sm:w-6 sm:h-6" />
                        連れ勉仲間管理
                    </h1>

                    {/* 検索カード */}
                    <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md mb-4">
                        <h2 className="font-bold mb-2 flex items-center gap-2">
                            <FaSearch className="text-[#5a3e28]" />
                            連れ勉仲間を探す
                        </h2>

                        <div className="flex gap-2 mb-4">
                            <input
                                type="text"
                                className="flex-1 p-2 border rounded"
                                placeholder="名前で検索..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                            />
                            <button
                                onClick={handleSearch}
                                className="bg-[#5a3e28] hover:bg-[#7c5d45] hover:scale-105 transition duration-200 text-white px-4 py-2 rounded shadow"
                            >
                                検索
                            </button>
                        </div>

                        {loading ? (
                            <p>検索中...</p>
                        ) : (
                            <ul className="space-y-2">
                                {searchResults.map(user => (
                                    <li key={user.email} className="flex items-center gap-2 border p-2 rounded">
                                        <input
                                            type="checkbox"
                                            checked={selectedEmails.includes(user.email)}
                                            onChange={() => toggleSelect(user.email)}
                                        />
                                        <span>{user.name}</span>
                                    </li>
                                ))}
                            </ul>
                        )}

                        {selectedEmails.length > 0 && (
                            <button
                                onClick={handleRequest}
                                className="mt-4 bg-[#5a3e28] hover:bg-[#7c5d45] hover:scale-105 transition duration-200 text-white px-4 py-2 rounded shadow"
                            >
                                選択したユーザーに連れ勉仲間申請する
                            </button>
                        )}
                    </div>

                    {/* 3カラム表示 */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-hidden">
                        {/* 連れ勉仲間 */}
                        <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md h-full overflow-y-auto">
                            <h2 className="font-bold mb-2 flex items-center gap-2">
                                <FaHandshake className="text-green-700" />
                                連れ勉仲間
                            </h2>
                            <ul className="list-disc list-inside space-y-1">
                                {mutualMates.length > 0
                                    ? mutualMates.map(user => (
                                        <li key={user.email} className="flex items-center justify-between border p-2 rounded">
                                            <span>{user.name}</span>
                                            <button
                                                onClick={() => handleHide(user.email)}
                                                className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                                            >
                                                非表示
                                            </button>
                                        </li>
                                    ))
                                    : <li className="text-gray-500">いません</li>
                                }
                            </ul>

                            {/* 非表示リストのトグル表示 */}
                            <button
                                onClick={() => setShowHiddenMates(prev => !prev)}
                                className="text-sm text-blue-700 underline mt-4"
                            >
                                {showHiddenMates ? '非表示仲間を隠す' : '非表示仲間を表示'}
                            </button>

                            {showHiddenMates && (
                                <>
                                    <h3 className="font-bold mb-2 flex items-center gap-2 mt-4">
                                        <FaUserSlash className="text-gray-600" />
                                        非表示仲間
                                    </h3>
                                    <ul className="space-y-2">
                                        {hiddenMutualMates.length > 0 ? hiddenMutualMates.map(user => (
                                            <li key={user.email} className="flex items-center justify-between border p-2 rounded">
                                                <span>{user.name}</span>
                                                <button
                                                    onClick={() => handleUnhide(user.email)}
                                                    className="bg-[#5a3e28] hover:bg-[#7c5d45] text-white px-3 py-1 rounded text-sm"
                                                >
                                                    再表示
                                                </button>
                                            </li>
                                        )) : (
                                            <li className="text-gray-500">いません</li>
                                        )}
                                    </ul>
                                </>
                            )}
                        </div>

                        {/* 自分からの申請 */}
                        <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md h-full overflow-y-auto">
                            <h2 className="font-bold mb-2 flex items-center gap-2">
                                <FaHourglassHalf className="text-yellow-600" />
                                申請中
                            </h2>
                            <ul className="space-y-2">
                                {turebenRequests.length > 0 ? turebenRequests.map(user => (
                                    <li key={user.email} className="flex items-center justify-between border p-2 rounded">
                                        <span>{user.name}（承認待ち）</span>
                                        <button
                                            onClick={() => handleCancelRequest(user.email)}
                                            className="bg-[#5a3e28] hover:bg-[#7c5d45] text-white px-3 py-1 rounded text-sm"
                                        >
                                            申請取消
                                        </button>
                                    </li>
                                )) : <li className="text-gray-500">いません</li>}
                            </ul>
                        </div>

                        {/* 相手からの申請 & 非表示リスト */}
                        <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md h-full overflow-y-auto">
                            <h2 className="font-bold mb-2 flex items-center gap-2">
                                <FaUserCheck className="text-blue-600" />
                                承認待ち（相手から）
                            </h2>

                            {/* 承認一覧 */}
                            <ul className="space-y-2 mb-4">
                                {receivedRequests.length > 0 ? receivedRequests.map(user => (
                                    <li key={user.email} className="flex items-center justify-between border p-2 rounded">
                                        <span>{user.name}</span>
                                        <div className="flex gap-2">
                                            <button
                                                onClick={() => handleAccept(user.email)}
                                                className="bg-[#5a3e28] hover:bg-[#7c5d45] text-white px-3 py-1 rounded text-sm"
                                            >
                                                承認する
                                            </button>
                                            <button
                                                onClick={() => handleHide(user.name)}
                                                className="bg-gray-400 hover:bg-gray-500 text-white px-3 py-1 rounded text-sm"
                                            >
                                                非表示
                                            </button>
                                        </div>
                                    </li>
                                )) : <li className="text-gray-500">いません</li>}
                            </ul>

                            <button
                                onClick={() => setShowHidden(prev => !prev)}
                                className="text-sm text-blue-700 underline mb-2"
                            >
                                {showHidden ? '非表示リストを隠す' : '非表示リストを表示'}
                            </button>

                            {showHidden && (
                                <>
                                    <h3 className="font-bold mb-2 flex items-center gap-2 mt-4">
                                        <FaUserSlash className="text-gray-600" />
                                        非表示リスト
                                    </h3>
                                    <ul className="space-y-2">
                                        {hiddenRequests.length > 0 ? hiddenRequests.map(user => (
                                            <li key={user.email} className="flex items-center justify-between border p-2 rounded">
                                                <span>{user.name}</span>
                                                <button
                                                    onClick={() => handleUnhide(user.email)}
                                                    className="bg-[#5a3e28] hover:bg-[#7c5d45] text-white px-3 py-1 rounded text-sm"
                                                >
                                                    再表示
                                                </button>
                                            </li>
                                        )) : <li className="text-gray-500">いません</li>}
                                    </ul>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}