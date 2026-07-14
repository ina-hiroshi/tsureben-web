import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { adminResetStudentPassword } from '../../services/authApi';
import { fetchStudentsForSchool, uniqueSorted } from '../../utils/adminStudents';
import { useUiFeedback } from '../../contexts/UiFeedbackContext';
import {
  MIN_PASSWORD_LENGTH,
  PASSWORD_MIN_LENGTH_MESSAGE,
} from '../../constants/password';
import LoadingOverlay from '../ui/LoadingOverlay';
import FilterSelect from '../ui/FilterSelect';
import SuggestInput from '../ui/SuggestInput';

function PasswordResetModal({ student, schoolName, onClose, onSuccess }) {
  const { toast } = useUiFeedback();
  const [password, setPassword] = useState('');
  const [resetting, setResetting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!password || password.length < MIN_PASSWORD_LENGTH) {
      toast.warning(PASSWORD_MIN_LENGTH_MESSAGE);
      return;
    }
    setResetting(true);
    try {
      await adminResetStudentPassword({ email: student.email, newPassword: password });
      toast.success(`${student.name} のパスワードを更新しました`);
      onSuccess();
      onClose();
    } catch (err) {
      toast.error(err.message || 'パスワードリセットに失敗しました');
    } finally {
      setResetting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <LoadingOverlay open={resetting} label="パスワードを更新しています..." />
      <button
        type="button"
        className="absolute inset-0 bg-[#2a211c]/60"
        aria-label="閉じる"
        onClick={onClose}
      />
      <form
        onSubmit={handleSubmit}
        className="relative w-full max-w-md bg-[#ede3d2] border border-[#c4b5a0] rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="h-1.5 bg-[#5a3e28]" />
        <div className="p-6 space-y-4">
          <h3 className="text-lg font-bold text-[#5a3e28]">パスワードリセット</h3>
          <div className="bg-[#f5ebe0] border border-[#c4b5a0] rounded-lg p-3 text-sm space-y-1">
            <p>
              <span className="text-gray-600">所属学校: </span>
              {schoolName || '—'}
            </p>
            <p>
              <span className="text-gray-600">氏名: </span>
              <span className="font-semibold text-[#5a3e28]">{student.name}</span>
            </p>
            <p>
              {student.grade}年{student.class}組 {student.number}番
            </p>
            <p className="text-gray-500 break-all">{student.email}</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#5a3e28] mb-1">
              新しいパスワード
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={`${MIN_PASSWORD_LENGTH}文字以上`}
              className="w-full border border-[#c4b5a0] rounded-lg px-3 py-2"
              autoFocus
              required
              minLength={MIN_PASSWORD_LENGTH}
            />
            <p className="text-xs text-gray-500 mt-1">
              リセット後、生徒はこのパスワードでログインし、初期設定画面（パスワード変更）で新しいパスワードを設定します。
            </p>
          </div>
          <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={resetting}
              className="px-4 py-2 rounded-lg border border-[#8f735a] text-[#5a3e28] hover:bg-[#f5ebe0] disabled:opacity-50"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={resetting}
              className="px-4 py-2 rounded-lg bg-[#5a3e28] text-white hover:bg-[#7a5639] disabled:opacity-50"
            >
              {resetting ? '処理中...' : 'リセットする'}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

export default function StudentManagementPanel({ schoolId, refreshKey = 0 }) {
  const [students, setStudents] = useState([]);
  const [schoolName, setSchoolName] = useState('');
  const [loading, setLoading] = useState(false);
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [nameQuery, setNameQuery] = useState('');
  const [emailQuery, setEmailQuery] = useState('');
  const [resetTarget, setResetTarget] = useState(null);

  const loadStudents = useCallback(async () => {
    if (!schoolId) {
      setStudents([]);
      setSchoolName('');
      return;
    }
    setLoading(true);
    try {
      const [list, schoolSnap] = await Promise.all([
        fetchStudentsForSchool(schoolId),
        getDoc(doc(db, 'schools', schoolId)),
      ]);
      setStudents(list);
      setSchoolName(schoolSnap.exists() ? schoolSnap.data()?.name || '' : '');
    } catch (err) {
      console.error('Failed to load students:', err);
      setStudents([]);
    } finally {
      setLoading(false);
    }
  }, [schoolId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents, refreshKey]);

  useEffect(() => {
    setFilterGrade('');
    setFilterClass('');
    setNameQuery('');
    setEmailQuery('');
  }, [schoolId]);

  const gradeOptions = useMemo(
    () => uniqueSorted(students.map((s) => s.grade)),
    [students]
  );

  const classOptions = useMemo(() => {
    const source = filterGrade
      ? students.filter((s) => String(s.grade ?? '') === filterGrade)
      : students;
    return uniqueSorted(source.map((s) => s.class));
  }, [students, filterGrade]);

  const nameSuggestions = useMemo(
    () => uniqueSorted(students.map((s) => s.name)),
    [students]
  );

  const emailSuggestions = useMemo(
    () => uniqueSorted(students.map((s) => s.email)),
    [students]
  );

  const filteredStudents = useMemo(() => {
    let list = students;
    if (filterGrade) {
      list = list.filter((s) => String(s.grade ?? '') === filterGrade);
    }
    if (filterClass) {
      list = list.filter((s) => String(s.class ?? '') === filterClass);
    }
    const name = nameQuery.trim();
    if (name) {
      list = list.filter((s) => String(s.name ?? '').includes(name));
    }
    const email = emailQuery.trim().toLowerCase();
    if (email) {
      list = list.filter((s) => s.email.toLowerCase().includes(email));
    }
    return list;
  }, [students, filterGrade, filterClass, nameQuery, emailQuery]);

  return (
    <div className="space-y-4">
      {!schoolId && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          生徒を表示するには、先に学校を選択してください。
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <FilterSelect
          label="学年"
          value={filterGrade}
          onChange={(value) => {
            setFilterGrade(value);
            setFilterClass('');
          }}
          options={[
            { value: '', label: 'すべて' },
            ...gradeOptions.map((g) => ({ value: g, label: `${g}年` })),
          ]}
          disabled={!schoolId || loading}
        />
        <FilterSelect
          label="組"
          value={filterClass}
          onChange={setFilterClass}
          options={[
            { value: '', label: 'すべて' },
            ...classOptions.map((c) => ({ value: c, label: `${c}組` })),
          ]}
          disabled={!schoolId || loading}
        />
        <SuggestInput
          label="氏名"
          value={nameQuery}
          onChange={setNameQuery}
          suggestions={nameSuggestions}
          placeholder="氏名で検索"
          disabled={!schoolId || loading}
        />
        <SuggestInput
          label="メールアドレス"
          value={emailQuery}
          onChange={setEmailQuery}
          suggestions={emailSuggestions}
          placeholder="メールで検索"
          disabled={!schoolId || loading}
        />
      </div>

      <p className="text-sm text-gray-600">
        {schoolId
          ? `登録生徒 ${filteredStudents.length} 件${filteredStudents.length !== students.length ? `（全 ${students.length} 件中）` : ''}`
          : '—'}
      </p>

      <div className="border border-[#c4b5a0] rounded-xl overflow-hidden bg-white/50">
        <div className="overflow-x-auto max-h-[min(28rem,60vh)]">
          <table className="w-full text-sm min-w-[640px]">
            <thead className="bg-[#f5ebe0] sticky top-0 z-10">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-[#5a3e28] whitespace-nowrap">
                  所属学校
                </th>
                <th className="text-left px-3 py-2 font-semibold text-[#5a3e28]">学年</th>
                <th className="text-left px-3 py-2 font-semibold text-[#5a3e28]">組</th>
                <th className="text-left px-3 py-2 font-semibold text-[#5a3e28]">番号</th>
                <th className="text-left px-3 py-2 font-semibold text-[#5a3e28]">氏名</th>
                <th className="text-left px-3 py-2 font-semibold text-[#5a3e28] whitespace-nowrap">
                  パスワードリセット
                </th>
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    読み込み中...
                  </td>
                </tr>
              )}
              {!loading && schoolId && filteredStudents.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-3 py-8 text-center text-gray-500">
                    該当する生徒がいません
                  </td>
                </tr>
              )}
              {!loading &&
                filteredStudents.map((s) => (
                  <tr
                    key={s.email}
                    className="border-t border-[#e8ddd0] hover:bg-[#faf6f1]"
                  >
                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap">
                      {schoolName || '—'}
                    </td>
                    <td className="px-3 py-2">{s.grade || '—'}</td>
                    <td className="px-3 py-2">{s.class || '—'}</td>
                    <td className="px-3 py-2">{s.number || '—'}</td>
                    <td className="px-3 py-2 font-medium text-[#5a3e28]">{s.name || '—'}</td>
                    <td className="px-3 py-2">
                      <button
                        type="button"
                        onClick={() => setResetTarget(s)}
                        className="text-sm bg-[#8f735a] text-white px-3 py-1.5 rounded hover:bg-[#a1866b] whitespace-nowrap"
                      >
                        リセット
                      </button>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>

      {resetTarget && (
        <PasswordResetModal
          student={resetTarget}
          schoolName={schoolName}
          onClose={() => setResetTarget(null)}
          onSuccess={loadStudents}
        />
      )}
    </div>
  );
}
