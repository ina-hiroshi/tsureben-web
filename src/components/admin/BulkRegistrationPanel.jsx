import React, { useCallback, useEffect, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebase';
import {
  adminBulkImportStudents,
  adminBulkImportTeachers,
} from '../../services/authApi';
import {
  TEACHER_CSV_HEADERS,
  STUDENT_CSV_HEADERS,
  downloadCsv,
  readCsvFile,
} from '../../utils/csvUtils';
import { fetchStudentsForSchool } from '../../utils/adminStudents';
import LoadingOverlay from '../ui/LoadingOverlay';
import { useUiFeedback } from '../../contexts/UiFeedbackContext';

const IMPORT_LABELS = {
  teachers: '教員を登録しています...',
  students: '生徒を登録しています...',
};

async function fetchTeachersForSchool(schoolId) {
  const snap = await getDocs(collection(db, 'teachers'));
  return snap.docs
    .map((d) => ({ email: d.id, ...d.data() }))
    .filter((t) => t.schoolId === schoolId)
    .sort((a, b) => a.email.localeCompare(b.email));
}

function ImportResult({ result }) {
  if (!result) return null;
  const { label, data } = result;
  return (
    <div className="text-sm bg-green-50 border border-green-200 p-3 rounded space-y-1">
      <p className="font-semibold text-green-800">{label}</p>
      {data.created != null && <p>新規: {data.created} 件</p>}
      {data.skipped > 0 && <p>スキップ（登録済み）: {data.skipped} 件</p>}
      {data.updated != null && data.updated > 0 && <p>更新: {data.updated} 件</p>}
      {data.message && <p>{data.message}</p>}
      {data.errors?.length > 0 && (
        <details className="mt-2">
          <summary className="cursor-pointer text-red-700">
            エラー {data.errors.length} 件
          </summary>
          <pre className="text-xs mt-1 overflow-auto">{JSON.stringify(data.errors, null, 2)}</pre>
        </details>
      )}
    </div>
  );
}

function CsvImportBlock({
  title,
  description,
  headers,
  templateFilename,
  importLabel,
  schoolId,
  onDownloadTemplate,
  onImport,
  loading,
}) {
  const [file, setFile] = useState(null);

  const handleImport = async () => {
    if (!file) return;
    await onImport(file);
    setFile(null);
  };

  return (
    <div className="border border-[#c4b5a0] rounded-xl p-4 space-y-3 bg-white/50">
      <div>
        <h3 className="font-semibold text-[#5a3e28]">{title}</h3>
        <p className="text-sm text-gray-600 mt-1">{description}</p>
        <p className="text-xs font-mono text-gray-500 mt-2">{headers.join(',')}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onDownloadTemplate}
          disabled={!schoolId || loading}
          className="bg-[#726256] text-white px-4 py-2 rounded hover:bg-[#85756a] disabled:opacity-50 text-sm"
        >
          CSVテンプレートをダウンロード
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="file"
          accept=".csv,text/csv"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="text-sm file:mr-3 file:py-2 file:px-4 file:rounded file:border-0 file:bg-[#ede3d2] file:text-[#5a3e28] file:font-semibold"
        />
        <button
          type="button"
          onClick={handleImport}
          disabled={!schoolId || !file || loading}
          className="bg-[#5a3e28] text-white px-4 py-2 rounded hover:bg-[#7a5639] disabled:opacity-50 text-sm"
        >
          {loading ? '処理中...' : importLabel}
        </button>
      </div>
      {file && <p className="text-xs text-gray-500">選択中: {file.name}</p>}
    </div>
  );
}

function formatImportToast(label, data) {
  const parts = [];
  if (data.created) parts.push(`新規 ${data.created}件`);
  if (data.skipped) parts.push(`スキップ ${data.skipped}件`);
  if (data.updated) parts.push(`更新 ${data.updated}件`);
  if (data.errors?.length) parts.push(`エラー ${data.errors.length}件`);
  const summary = parts.length > 0 ? parts.join('、') : '変更なし';
  return `${label}が完了しました（${summary}）`;
}

export default function BulkRegistrationPanel({ schoolId, onStudentsChanged }) {
  const { toast } = useUiFeedback();
  const [importTask, setImportTask] = useState(null);
  const [importProgress, setImportProgress] = useState(null);
  const importLoading = importTask !== null;
  const [teacherResult, setTeacherResult] = useState(null);
  const [studentResult, setStudentResult] = useState(null);
  const [students, setStudents] = useState([]);

  const loadStudents = useCallback(async () => {
    if (!schoolId) {
      setStudents([]);
      return;
    }
    try {
      setStudents(await fetchStudentsForSchool(schoolId));
    } catch (err) {
      console.error('Failed to load students:', err);
      setStudents([]);
    }
  }, [schoolId]);

  useEffect(() => {
    loadStudents();
  }, [loadStudents]);

  const downloadTeacherTemplate = async () => {
    if (!schoolId) return;
    try {
      const teachers = await fetchTeachersForSchool(schoolId);
      const rows =
        teachers.length > 0
          ? teachers.map((t) => ({
              email: t.email,
              name: t.name || '',
              role: t.role || 'teacher',
            }))
          : [{ email: '', name: '', role: 'teacher' }];
      downloadCsv('teachers_template.csv', TEACHER_CSV_HEADERS, rows);
      toast.success('教員CSVテンプレートをダウンロードしました');
    } catch (err) {
      toast.error(err.message || 'テンプレートの取得に失敗しました');
    }
  };

  const downloadStudentTemplate = async () => {
    if (!schoolId) return;
    try {
      const list = students.length > 0 ? students : await fetchStudentsForSchool(schoolId);
      const rows =
        list.length > 0
          ? list.map((s) => ({
              email: s.email,
              name: s.name || '',
              grade: s.grade || '',
              class: s.class || '',
              number: s.number || '',
              initialPassword: '',
            }))
          : [
              {
                email: '',
                name: '',
                grade: '',
                class: '',
                number: '',
                initialPassword: '',
              },
            ];
      downloadCsv('students_template.csv', STUDENT_CSV_HEADERS, rows);
      toast.success('生徒CSVテンプレートをダウンロードしました');
    } catch (err) {
      toast.error(err.message || 'テンプレートの取得に失敗しました');
    }
  };

  const importTeachers = async (file) => {
    if (!schoolId) {
      toast.warning('学校が選択されていません');
      return;
    }
    setImportTask('teachers');
    setImportProgress(null);
    setTeacherResult(null);
    try {
      const rows = await readCsvFile(file);
      if (rows.length === 0) throw new Error('CSV にデータ行がありません');
      const data = await adminBulkImportTeachers(
        { schoolId, rows },
        { onProgress: (current, total) => setImportProgress({ current, total }) }
      );
      setTeacherResult({ label: '教員一括登録', data });
      if (data.errors?.length) {
        toast.warning(formatImportToast('教員一括登録', data));
      } else {
        toast.success(formatImportToast('教員一括登録', data));
      }
    } catch (err) {
      toast.error(err.message || '教員のインポートに失敗しました');
    } finally {
      setImportTask(null);
      setImportProgress(null);
    }
  };

  const importStudents = async (file) => {
    if (!schoolId) {
      toast.warning('学校が選択されていません');
      return;
    }
    setImportTask('students');
    setImportProgress(null);
    setStudentResult(null);
    try {
      const rows = await readCsvFile(file);
      if (rows.length === 0) throw new Error('CSV にデータ行がありません');
      const data = await adminBulkImportStudents(
        { schoolId, rows },
        { onProgress: (current, total) => setImportProgress({ current, total }) }
      );
      setStudentResult({ label: '生徒一括登録', data });
      await loadStudents();
      onStudentsChanged?.();
      if (data.errors?.length) {
        toast.warning(formatImportToast('生徒一括登録', data));
      } else {
        toast.success(formatImportToast('生徒一括登録', data));
      }
    } catch (err) {
      toast.error(err.message || '生徒のインポートに失敗しました');
    } finally {
      setImportTask(null);
      setImportProgress(null);
    }
  };

  const importOverlayLabel = importProgress
    ? `${IMPORT_LABELS[importTask] || '登録しています...'} (${importProgress.current}/${importProgress.total})`
    : IMPORT_LABELS[importTask] || '登録しています...';

  return (
    <div className="space-y-6">
      <LoadingOverlay open={importLoading} label={importOverlayLabel} />
      {!schoolId && (
        <p className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg p-3">
          一括登録を行うには、先に学校を選択してください。
        </p>
      )}

      <CsvImportBlock
        title="教員"
        description="CSV 1行目はヘッダー、2行目以降がデータです。既存教員がいる場合、テンプレートに現在のデータが入ります。"
        headers={TEACHER_CSV_HEADERS}
        templateFilename="teachers_template.csv"
        importLabel="教員CSVをインポート"
        schoolId={schoolId}
        onDownloadTemplate={downloadTeacherTemplate}
        onImport={importTeachers}
        loading={importLoading}
      />
      <ImportResult result={teacherResult} />

      <CsvImportBlock
        title="生徒"
        description="新規生徒のみ登録します。CSV に登録済みのメールがある場合はスキップされます。initialPassword は新規行のみ必須（6文字以上）。パスワード変更は「生徒情報管理」で行ってください。"
        headers={STUDENT_CSV_HEADERS}
        templateFilename="students_template.csv"
        importLabel="生徒CSVをインポート"
        schoolId={schoolId}
        onDownloadTemplate={downloadStudentTemplate}
        onImport={importStudents}
        loading={importLoading}
      />
      <ImportResult result={studentResult} />
    </div>
  );
}
