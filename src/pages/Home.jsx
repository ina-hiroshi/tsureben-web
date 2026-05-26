import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { auth } from "../firebase";
import { doc, getDoc, getDocs, setDoc, updateDoc, deleteField, collection, arrayUnion } from 'firebase/firestore';
import { db } from '../firebase';
import { FaRegEdit, FaBook, FaUsers, FaUserCheck } from "react-icons/fa";
import { AiOutlineClockCircle } from 'react-icons/ai';
import Header from '../components/Header';
import InitialSetupDialog from '../components/InitialSetupDialog';
import ScheduleColumn from '../components/ScheduleColumn';
import TimeInputDialog from '../components/TimeInputDialog';
import DailySubjectPieChart from '../components/DailySubjectPieChart';
import StudyTimeLineChart from '../components/StudyTimeLineChart';
import TsurebenActiveUsers from '../components/TsurebenActiveUsers';
import CafeBeanCharacter from '../components/CafeBeanCharacter';
import CafeMugNekoCharacter from '../components/CafeMugNekoCharacter';
import CafeMarshmallowCharacter from '../components/CafeMarshmallowCharacter';
import CafeCookieCharacter from '../components/CafeCookieCharacter';
import dayjs from 'dayjs';
import 'dayjs/locale/ja';
import { useUiFeedback } from '../contexts/UiFeedbackContext';

export default function Home() {
  const [user, setUser] = useState(null);
  const [showSetupDialog, setShowSetupDialog] = useState(false);
  const [checkingUserData, setCheckingUserData] = useState(true);
  const navigate = useNavigate();
  const { toast, confirm } = useUiFeedback();

  // 初期設定用のステート
  const [grade, setGrade] = useState('');
  const [classNum, setClassNum] = useState('');
  const [number, setNumber] = useState('');
  const [shareScope, setShareScope] = useState('学年のみ');

  // 学習計画関連
  const [selectedDate] = useState(dayjs());
  const [selectedHour, setSelectedHour] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedEntryIndex, setSelectedEntryIndex] = useState(null);
  const [dayPlans, setDayPlans] = useState({});

  // 連れ勉仲間申請
  const [receivedRequests, setReceivedRequests] = useState([]);

  /** 🔁 連れ勉リクエストの読み込み */
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
      if (theySent && !iSent && !isHidden) pending.push(user);
    }

    return pending;
  };

  const handleAccept = async (targetEmail) => {
    const docRef = doc(db, 'users', user.email);
    await updateDoc(docRef, { turebenRequests: arrayUnion(targetEmail) });
    const updated = await loadPendingTurebenRequests(user.email);
    setReceivedRequests(updated);
  };

  /** 🔁 reloadPlans (useCallback化) */
  const reloadPlans = useCallback(async (targetDate = selectedDate) => {
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
  }, [user, selectedDate]);

  /** 📅 時間帯クリック時のダイアログ表示 */
  const openDialog = (hourStr = dayjs().hour().toString().padStart(2, '0'), entryIdx = null) => {
    setSelectedHour(hourStr);
    setSelectedEntryIndex(entryIdx);
    setDialogOpen(true);
  };

  /** Firebase Auth 初期化 */
  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        const docRef = doc(db, 'users', currentUser.email);
        const docSnap = await getDoc(docRef);
        if (!docSnap.exists()) {
          setShowSetupDialog(true);
        } else {
          const data = docSnap.data();
          if (data.profileComplete === false) {
            setShowSetupDialog(true);
            setGrade(data.grade || '');
            setClassNum(data.class || '');
            setNumber(data.number || '');
            setShareScope(data.shareScope || '学年のみ');
          }
        }
      }
      setCheckingUserData(false);
    });
    return () => unsubscribe();
  }, []);

  /** 🔁 user変更時：申請リスト再取得 */
  useEffect(() => {
    if (user?.email) {
      loadPendingTurebenRequests(user.email).then(setReceivedRequests);
    }
  }, [user]);

  /** 🔁 学習計画ロード */
  useEffect(() => {
    if (user && user.email) reloadPlans(selectedDate);
  }, [user, selectedDate, reloadPlans]);

  /** ユーザー設定保存 */
  const handleSaveUserSettings = async () => {
    if (!user || !user.email) return;
    const userData = {
      name: user.displayName || '',
      grade,
      class: classNum,
      number,
      shareScope,
      profileComplete: true,
      role: 'student',
    };
    await setDoc(doc(db, 'users', user.email), userData, { merge: true });
    setShowSetupDialog(false);
  };

  /** 学習計画削除 */
  const handleDelete = async (hour, entryIdx) => {
    const confirmDelete = await confirm({
      title: '学習計画の削除',
      message: 'この学習計画を削除しますか？',
      confirmText: '削除',
      cancelText: 'キャンセル',
      tone: 'danger',
    });
    if (!confirmDelete) return;
    const currentUser = auth.currentUser;
    if (!currentUser?.email) return;

    const docRef = doc(db, 'studyPlans', currentUser.email);
    const dateKey = selectedDate.format('YYYY-MM-DD');
    try {
      const snapshot = await getDoc(docRef);
      if (!snapshot.exists()) return;
      const data = snapshot.data();
      const current = data?.[dateKey]?.[hour] || [];
      const updated = [...current];
      updated.splice(entryIdx, 1);
      const newData =
        updated.length > 0
          ? { [`${dateKey}.${hour}`]: updated }
          : { [`${dateKey}.${hour}`]: deleteField() };
      await updateDoc(docRef, newData);
      await reloadPlans();
      toast.success('学習計画を削除しました');
    } catch (e) {
      console.error('削除に失敗:', e);
      toast.error('削除に失敗しました');
    }
  };

  // 🧩 Hooksはすべてreturnの前に配置
  useEffect(() => {
    console.log("🏠 Homeページマウント");
  }, []);

  if (checkingUserData) return null;

  const hoursFullDay = Array.from({ length: 25 }, (_, i) => `${i}:00`.padStart(5, '0'));

  return (
    <>
      <Header />
      <div className="min-h-screen bg-[#4b4039] text-[#3a2e28] pt-24 p-6 font-sans">
        {/* フィードバック */}
        <div className="max-w-7xl mx-auto mb-6">
          <div className="bg-[#ede3d2] border border-[#e6cfa4] rounded-2xl shadow p-4 text-[#5a3e28]">
            <h2 className="text-lg font-bold mb-2">このアプリについてのご意見・ご要望</h2>
            <p className="mb-3 text-sm">
              改善のために、ぜひ皆さんのフィードバックをお聞かせください。
              不具合の報告・機能の提案など、どんなことでも歓迎です。（伊奈）
            </p>
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

        {/* 連れ勉仲間申請 */}
        <div className="max-w-7xl mx-auto mb-6 space-y-6">
          {receivedRequests.length > 0 && (
            <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md">
              <h2 className="font-bold mb-2 flex items-center gap-2">
                <FaUserCheck className="text-blue-600" />
                連れ勉仲間申請 承認待ち（相手から）
              </h2>
              <ul className="space-y-2">
                {receivedRequests.map(u => (
                  <li key={u.email} className="flex items-center justify-between border p-2 rounded">
                    <span>{u.name}</span>
                    <button
                      onClick={() => handleAccept(u.email)}
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

        {/* メインエリア */}
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 左列 */}
          <div className="lg:col-span-2 space-y-6">
          <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md flex flex-col gap-6">
            <h2 className="text-xl font-bold text-[#6b4a2b]">メニュー</h2>
            <div>
              <button
                  onClick={() => navigate('/pomodoro')}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2 sm:py-2 bg-[#5a3e28] text-[#fffaf3] rounded-full shadow-md border-2 border-[#fffaf3] ring-2 ring-offset-2 ring-[#fffaf3] hover:scale-[1.02] hover:brightness-110 transition text-[3vw] sm:text-base"
                >
                  <AiOutlineClockCircle className="w-5 h-5 sm:w-6 sm:h-6" />
                  <span className="whitespace-nowrap">学習計測</span>
                </button>
              </div>

              <div className="grid grid-cols-3 gap-2 sm:gap-4 text-[3vw] sm:text-base">
                <button onClick={() => navigate('/studyplan')} className="btn bg-[#a67c52] hover:bg-[#b68b60] flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2">
                  <FaRegEdit className="w-5 h-5" /><span className="truncate">学習計画</span>
                </button>
                <button onClick={() => navigate('/studyrecord')} className="btn bg-[#8f735a] hover:bg-[#a1866b] flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2">
                  <FaBook className="w-5 h-5" /><span className="truncate">学習記録</span>
                </button>
                <button onClick={() => navigate('/turebenmate')} className="btn bg-[#726256] hover:bg-[#85756a] flex items-center justify-center gap-1 sm:gap-2 px-1 sm:px-2">
                  <FaUsers className="w-5 h-5" /><span className="truncate">連れ勉仲間</span>
                </button>
            </div>
          </section>

            <div className="flex flex-col lg:flex-row gap-4">
              <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md text-[#927b65] flex-1 h-80"><DailySubjectPieChart /></section>
              <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md text-[#927b65] flex-1 h-80"><StudyTimeLineChart /></section>
            </div>
            <section className="bg-[#ede3d2] p-6 rounded-2xl shadow-md h-64 flex items-center justify-center"><TsurebenActiveUsers /></section>
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
