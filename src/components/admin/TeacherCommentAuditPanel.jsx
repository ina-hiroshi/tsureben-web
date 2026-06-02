import React, { useCallback, useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  auditRowTimestamp,
  fetchTeacherCommentAudit,
} from '../../services/firestore/adminFeedbackAuditService';
import { fetchStudentsForSchool } from '../../utils/adminStudents';
import { fetchTeachersForSchool } from '../../utils/adminTeachers';
import {
  getDemoTeacherCommentAuditRows,
  getDemoTeachersForAudit,
  isDemoTeacherCommentAuditEnabled,
  mergeDemoStudents,
} from '../../dev/demoTeacherReview';
import { useDemoSettingsRevision } from '../../hooks/useDemoSettings';
import FilterSelect from '../ui/FilterSelect';
import LoadingOverlay from '../ui/LoadingOverlay';

function formatTimestamp(value) {
  if (!value) return '—';
  const date = value?.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return dayjs(date).format('YYYY/M/D HH:mm');
}

function statusLabel(row) {
  if (row.deletedAt) return '削除済';
  if (row.updatedAt) return '編集済';
  return '通常';
}

function statusClass(row) {
  if (row.deletedAt) return 'bg-red-100 text-red-800 border-red-200';
  if (row.updatedAt) return 'bg-amber-100 text-amber-900 border-amber-200';
  return 'bg-[#f5ebe0] text-[#5a3e28] border-[#c4b5a0]';
}

function authorRoleLabel(role) {
  if (role === 'teacher') return '教員';
  if (role === 'student') return '生徒';
  return role || '—';
}

function authorRoleClass(role) {
  if (role === 'teacher') return 'bg-[#e8dcc8] text-[#5a3e28] border-[#c4b5a0]';
  if (role === 'student') return 'bg-sky-100 text-sky-900 border-sky-200';
  return 'bg-gray-100 text-gray-700 border-gray-200';
}

function excerpt(body, max = 60) {
  const text = (body || '').replace(/\s+/g, ' ');
  if (text.length <= max) return text || '—';
  return `${text.slice(0, max)}…`;
}

function studentLabel(row) {
  const parts = [];
  if (row.studentGrade != null && row.studentGrade !== '') {
    parts.push(`${row.studentGrade}年${row.studentClass}組${row.studentNumber}番`);
  }
  parts.push(row.studentName || row.studentEmail);
  return parts.join(' ');
}

const INDEX_CONSOLE_URL =
  'https://console.firebase.google.com/project/tsureben/firestore/indexes';

function parseFirestoreQueryError(err) {
  const message = err?.message || '';
  const building = /currently building/i.test(message);
  const needsIndex = /requires an index/i.test(message);
  if (building) {
    return {
      building: true,
      needsIndex: true,
      text: '検索用インデックス（schoolId + lastMessageAt）を作成中です。通常は数分〜十数分で完了します。完了後に「再読み込み」を押してください。',
      consoleUrl: message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)?.[0] || INDEX_CONSOLE_URL,
    };
  }
  if (needsIndex) {
    return {
      building: false,
      needsIndex: true,
      text: '検索用インデックス（schoolId + lastMessageAt）が未作成です。Firebase コンソールでインデックスを確認してください。',
      consoleUrl: message.match(/https:\/\/console\.firebase\.google\.com[^\s]+/)?.[0] || INDEX_CONSOLE_URL,
    };
  }
  return {
    building: false,
    needsIndex: false,
    text: message || 'コメント履歴の取得に失敗しました',
    consoleUrl: null,
  };
}

function mergeAuditRows(liveRows, demoRows) {
  const map = new Map();
  [...liveRows, ...demoRows].forEach((row) => map.set(row.id, row));
  return [...map.values()].sort((a, b) => auditRowTimestamp(b) - auditRowTimestamp(a));
}

export default function TeacherCommentAuditPanel({ schoolId }) {
  const demoRevision = useDemoSettingsRevision();
  const demoAuditEnabled = isDemoTeacherCommentAuditEnabled();
  const [teachers, setTeachers] = useState([]);
  const [teacherFilter, setTeacherFilter] = useState('');
  const [rows, setRows] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [cursor, setCursor] = useState(null);
  const [hasMore, setHasMore] = useState(false);
  const [fetchSource, setFetchSource] = useState('school');
  const [studentMap, setStudentMap] = useState(null);
  const [error, setError] = useState('');
  const [indexIssue, setIndexIssue] = useState(null);

  useEffect(() => {
    if (!schoolId && !demoAuditEnabled) {
      setTeachers([]);
      setStudentMap(null);
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const [teacherList, students] = schoolId
          ? await Promise.all([
              fetchTeachersForSchool(schoolId),
              fetchStudentsForSchool(schoolId),
            ])
          : [[], []];
        if (cancelled) return;
        const demoTeachers = getDemoTeachersForAudit();
        const mergedTeachers = [...teacherList];
        const seenTeachers = new Set(teacherList.map((t) => t.email));
        demoTeachers.forEach((t) => {
          if (!seenTeachers.has(t.email)) mergedTeachers.push(t);
        });
        setTeachers(mergedTeachers);
        const list = schoolId ? mergeDemoStudents(students) : mergeDemoStudents([]);
        const map = new Map(list.map((s) => [s.email, s]));
        setStudentMap(map);
      } catch (err) {
        console.error(err);
        if (!cancelled) setStudentMap(new Map());
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [schoolId, demoAuditEnabled, demoRevision]);

  const teacherOptions = useMemo(
    () => [
      { value: '', label: 'すべての教員' },
      ...teachers.map((t) => ({
        value: t.email,
        label: t.name ? `${t.name}（${t.email}）` : t.email,
      })),
    ],
    [teachers]
  );

  const loadAudit = useCallback(
    async ({ append = false, pageCursor = null } = {}) => {
      if (!studentMap) return;
      if (!schoolId && !demoAuditEnabled) return;
      const studentEmails = Array.from(studentMap.keys());
      if (append) setLoadingMore(true);
      else setLoading(true);
      setError('');
      setIndexIssue(null);
      try {
        const result = schoolId
          ? await fetchTeacherCommentAudit({
              schoolId,
              studentEmails,
              teacherEmail: teacherFilter || undefined,
              cursor: pageCursor,
              studentMap,
              source: append ? fetchSource : 'school',
            })
          : { rows: [], nextCursor: null, hasMore: false, source: 'students' };
        const demoRows =
          !append && demoAuditEnabled
            ? getDemoTeacherCommentAuditRows({ teacherEmail: teacherFilter || undefined })
            : [];
        setFetchSource(result.source || 'school');
        setRows((prev) => {
          const live = append ? [...prev.filter((r) => !r.id.startsWith('demo-thread-')), ...result.rows] : result.rows;
          const merged = mergeAuditRows(live, demoRows);
          return merged;
        });
        setCursor(result.nextCursor);
        setHasMore(result.hasMore);
        if (!append) setExpandedId(null);
      } catch (err) {
        console.error(err);
        const parsed = parseFirestoreQueryError(err);
        setError(parsed.text);
        setIndexIssue(parsed.needsIndex ? parsed : null);
        if (!append) setRows([]);
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [schoolId, teacherFilter, studentMap, fetchSource, demoAuditEnabled, demoRevision]
  );

  useEffect(() => {
    if (!studentMap) {
      setRows([]);
      setCursor(null);
      setHasMore(false);
      return;
    }
    if (!schoolId && !demoAuditEnabled) {
      setRows([]);
      setCursor(null);
      setHasMore(false);
      return;
    }
    loadAudit();
  }, [schoolId, teacherFilter, studentMap, loadAudit, demoAuditEnabled]);

  const handleLoadMore = () => {
    if (!hasMore || !cursor || loadingMore) return;
    loadAudit({ append: true, pageCursor: cursor });
  };

  if (!schoolId && !demoAuditEnabled) {
    return (
      <p className="text-sm text-gray-600">学校を選択すると、教員のコメント履歴を表示できます。</p>
    );
  }

  return (
    <div className="space-y-4">
      {demoAuditEnabled && (
        <p className="text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          デモデータを表示中です。管理画面の「デモデータ」で「教員コメント履歴」を OFF にすると非表示になります。
        </p>
      )}
      <LoadingOverlay open={loading && rows.length === 0} label="コメント履歴を読み込んでいます..." />
      <FilterSelect
        label="教員で絞り込み（生徒の返信は該当スレッド分を表示）"
        value={teacherFilter}
        onChange={setTeacherFilter}
        options={teacherOptions}
        disabled={loading}
      />
      {error && (
        <div
          className={`text-sm rounded-lg px-3 py-2 border ${
            indexIssue?.building
              ? 'text-amber-900 bg-amber-50 border-amber-200'
              : 'text-red-700 bg-red-50 border-red-200'
          }`}
        >
          <p>{error}</p>
          {indexIssue && (
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => loadAudit()}
                disabled={loading}
                className="px-3 py-1.5 text-xs rounded-lg border border-[#8f735a] text-[#5a3e28] hover:bg-[#f5ebe0] disabled:opacity-50"
              >
                再読み込み
              </button>
              {indexIssue.consoleUrl && (
                <a
                  href={indexIssue.consoleUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs underline text-[#5a3e28]"
                >
                  Firebase でインデックス状態を確認
                </a>
              )}
            </div>
          )}
        </div>
      )}
      {!loading && rows.length === 0 && !error && (
        <p className="text-sm text-gray-600 py-4 text-center">
          表示できるコメントはありません。フィードバックがまだ無いか、別の学校が選択されている可能性があります。
        </p>
      )}
      {rows.length > 0 && (
        <div className="overflow-x-auto rounded-xl border border-[#c4b5a0]">
          <table className="w-full text-sm text-left min-w-[640px]">
            <thead className="bg-[#f5ebe0] text-[#5a3e28] border-b border-[#c4b5a0]">
              <tr>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">日時</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">役割</th>
                <th className="px-3 py-2 font-semibold">投稿者</th>
                <th className="px-3 py-2 font-semibold">対象生徒</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">種別</th>
                <th className="px-3 py-2 font-semibold whitespace-nowrap">状態</th>
                <th className="px-3 py-2 font-semibold">コメント</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e8dcc8] bg-white">
              {rows.map((row) => {
                const isExpanded = expandedId === row.id;
                const displayTime = row.deletedAt
                  ? formatTimestamp(row.deletedAt)
                  : formatTimestamp(row.updatedAt || row.createdAt);
                return (
                  <React.Fragment key={row.id}>
                    <tr
                      className={`cursor-pointer hover:bg-[#faf6f0] ${row.deletedAt ? 'opacity-80' : ''}`}
                      onClick={() => setExpandedId(isExpanded ? null : row.id)}
                    >
                      <td className="px-3 py-2 whitespace-nowrap text-gray-700">{displayTime}</td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded border ${authorRoleClass(row.authorRole)}`}
                        >
                          {authorRoleLabel(row.authorRole)}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        <span className="font-medium text-[#5a3e28]">{row.authorName}</span>
                      </td>
                      <td className="px-3 py-2 text-gray-800">{studentLabel(row)}</td>
                      <td className="px-3 py-2 whitespace-nowrap text-gray-600">
                        {row.threadScopeLabel}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={`inline-block text-xs px-2 py-0.5 rounded border ${statusClass(row)}`}
                        >
                          {statusLabel(row)}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-700 max-w-xs">
                        {excerpt(row.body)}
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-[#faf6f0]">
                        <td colSpan={7} className="px-4 py-3 text-sm space-y-2">
                          <p className="text-gray-600">
                            投稿: {formatTimestamp(row.createdAt)}
                            {row.updatedAt && !row.deletedAt && (
                              <span> / 編集: {formatTimestamp(row.updatedAt)}</span>
                            )}
                            {row.deletedAt && (
                              <span className="text-red-700">
                                {' '}
                                / 削除: {formatTimestamp(row.deletedAt)}
                              </span>
                            )}
                          </p>
                          {row.threadTitle && (
                            <p className="text-gray-600">スレッド: {row.threadTitle}</p>
                          )}
                          <p className="text-[#2a211c] whitespace-pre-wrap break-words">{row.body}</p>
                          <p className="text-xs text-gray-500 break-all">{row.authorEmail}</p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {hasMore && (
        <div className="flex justify-center">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="px-4 py-2 text-sm rounded-lg border border-[#8f735a] text-[#5a3e28] hover:bg-[#f5ebe0] disabled:opacity-50"
          >
            {loadingMore ? '読み込み中...' : 'さらに読み込む'}
          </button>
        </div>
      )}
    </div>
  );
}
