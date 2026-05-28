import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { auth, db } from '../../firebase';
import { useTeacherStatus } from '../../hooks/useTeacherStatus';
import { useUiFeedback } from '../../contexts/UiFeedbackContext';
import LoadingOverlay from '../ui/LoadingOverlay';
import FilterSelect from '../ui/FilterSelect';

export default function SchoolManagementPanel({
  selectedSchoolId,
  onSelectSchool,
  showCreateForm = true,
  selectLabel = '操作対象の学校',
}) {
  const { isSuperAdmin } = useTeacherStatus();
  const { toast } = useUiFeedback();
  const [schools, setSchools] = useState([]);
  const [newSchoolName, setNewSchoolName] = useState('');
  const [studentEmailDomain, setStudentEmailDomain] = useState('');
  const [loading, setLoading] = useState(false);

  const loadSchools = async () => {
    const snap = await getDocs(collection(db, 'schools'));
    setSchools(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
  };

  useEffect(() => {
    loadSchools();
  }, []);

  const handleCreateSchool = async (e) => {
    e.preventDefault();
    if (!newSchoolName.trim()) return;
    setLoading(true);
    try {
      const settings = {};
      if (studentEmailDomain.trim()) {
        settings.studentEmailDomain = studentEmailDomain.trim();
      }

      const ref = await addDoc(collection(db, 'schools'), {
        name: newSchoolName.trim(),
        settings,
        createdAt: serverTimestamp(),
        createdBy: auth.currentUser?.email || '',
      });

      toast.success(`学校「${newSchoolName}」を作成しました`);
      setNewSchoolName('');
      setStudentEmailDomain('');
      await loadSchools();
      onSelectSchool(ref.id);
    } catch (err) {
      console.error('School create error:', err);
      if (err.code === 'permission-denied') {
        toast.error(
          '権限がありません。teachers コレクションで role: super_admin になっているか、Firestore ルールをデプロイしてください。'
        );
      } else {
        toast.error(err.message || '学校の作成に失敗しました');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <LoadingOverlay open={loading} label="学校を登録しています..." />
      <FilterSelect
        label={selectLabel}
        value={selectedSchoolId}
        onChange={onSelectSchool}
        options={[
          { value: '', label: '選択してください' },
          ...schools.map((s) => ({ value: s.id, label: s.name })),
        ]}
        placeholder="選択してください"
      />

      {showCreateForm && isSuperAdmin && (
        <form onSubmit={handleCreateSchool} className="border-t pt-4 space-y-3">
          <h3 className="font-semibold text-[#5a3e28]">新規学校作成（super_admin）</h3>
          <input
            type="text"
            placeholder="学校名"
            value={newSchoolName}
            onChange={(e) => setNewSchoolName(e.target.value)}
            className="w-full border rounded px-3 py-2"
            required
          />
          <input
            type="text"
            placeholder="生徒メールドメイン（例: @st.example.ed.jp）"
            value={studentEmailDomain}
            onChange={(e) => setStudentEmailDomain(e.target.value)}
            className="w-full border rounded px-3 py-2"
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-[#5a3e28] text-white px-4 py-2 rounded hover:bg-[#7a5639] disabled:opacity-50"
          >
            学校を作成
          </button>
        </form>
      )}

    </div>
  );
}
