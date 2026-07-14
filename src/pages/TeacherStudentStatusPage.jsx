import { Fragment, useEffect, useMemo, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import {
  matchesTeacherStudentFilter,
  useTeacherWorkspace,
} from '../contexts/TeacherWorkspaceContext';
import { fetchStudentsForSchool } from '../services/firestore/userService';
import { getRecentStudySummaries } from '../services/firestore/logService';
import { mergeDemoStudents } from '../dev/demoTeacherReview';
import { useDemoSettingsRevision } from '../hooks/useDemoSettings';
import PageLayout from '../components/ui/PageLayout';
import SectionTitle from '../components/ui/SectionTitle';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import AppIcon from '../components/ui/AppIcon';
import { db } from '../firebase';
import {
  accountStatusBadgeClass,
  buildTeacherMateSummary,
  formatMateCountSummary,
  getTeacherAccountStatus,
} from '../utils/teacherStudentStatus';

const RECENT_STUDY_DAYS = 7;

function formatFilterSummary({ filterGrade, filterClass, nameQuery }) {
  const parts = [];
  if (filterGrade) parts.push(`${filterGrade}年`);
  if (filterClass) parts.push(`${filterClass}組`);
  if (nameQuery.trim()) parts.push(`「${nameQuery.trim()}」`);
  return parts.join(' · ');
}

function MateDetailSection({ title, items }) {
  if (!items.length) {
    return (
      <div>
        <p className="text-xs font-semibold text-tsure-primary mb-1">{title}</p>
        <p className="text-xs text-tsure-muted">なし</p>
      </div>
    );
  }

  return (
    <div>
      <p className="text-xs font-semibold text-tsure-primary mb-1">{title}</p>
      <ul className="space-y-1">
        {items.map((item, index) => (
          <li
            key={`${title}-${index}`}
            className={`text-xs ${
              item.kind === 'external' ? 'text-tsure-muted italic' : 'text-tsure-primary'
            }`}
          >
            {item.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${accountStatusBadgeClass(status.tone)}`}
    >
      {status.label}
    </span>
  );
}

function StudyStatusCell({ loadingStudy, study }) {
  if (loadingStudy && !study) {
    return <span className="text-xs text-tsure-muted">取得中…</span>;
  }
  if (study?.hasStudy) {
    return (
      <span className="text-tsure-primary font-medium">
        あり
        {study.totalMinutes > 0 && (
          <span className="text-xs text-tsure-muted font-normal ml-1">({study.totalMinutes}分)</span>
        )}
      </span>
    );
  }
  return <span className="text-tsure-muted">なし</span>;
}

export default function TeacherStudentStatusPage() {
  const {
    effectiveSchoolId,
    loading: workspaceLoading,
    studentFilters,
    hasStudentFilter,
  } = useTeacherWorkspace();
  const demoRevision = useDemoSettingsRevision();
  const [students, setStudents] = useState([]);
  const [studySummaries, setStudySummaries] = useState({});
  const [schoolName, setSchoolName] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [expandedEmail, setExpandedEmail] = useState(null);

  useEffect(() => {
    if (!effectiveSchoolId) {
      setSchoolName('');
      return;
    }
    getDoc(doc(db, 'schools', effectiveSchoolId))
      .then((snap) => {
        setSchoolName(snap.exists() ? snap.data().name || effectiveSchoolId : effectiveSchoolId);
      })
      .catch(() => setSchoolName(effectiveSchoolId));
  }, [effectiveSchoolId]);

  useEffect(() => {
    if (!effectiveSchoolId) {
      setStudents([]);
      setStudySummaries({});
      return;
    }

    let active = true;
    setLoadingStudents(true);
    setLoadingStudy(false);
    setStudySummaries({});

    fetchStudentsForSchool(effectiveSchoolId)
      .then(async (list) => {
        if (!active) return;
        const merged = mergeDemoStudents(list);
        setStudents(merged);
        setLoadingStudents(false);

        if (!merged.length) return;

        setLoadingStudy(true);
        try {
          const summaries = await getRecentStudySummaries(
            merged.map((student) => student.email),
            RECENT_STUDY_DAYS
          );
          if (active) setStudySummaries(summaries);
        } catch (err) {
          console.error('Failed to load recent study summaries:', err);
          if (active) setStudySummaries({});
        } finally {
          if (active) setLoadingStudy(false);
        }
      })
      .catch((err) => {
        console.error('Failed to load students for status page:', err);
        if (active) {
          setStudents([]);
          setLoadingStudents(false);
        }
      });

    return () => {
      active = false;
    };
  }, [effectiveSchoolId, demoRevision]);

  const studentsByEmail = useMemo(() => {
    const map = {};
    students.forEach((student) => {
      map[student.email] = student;
    });
    return map;
  }, [students]);

  const filteredStudents = useMemo(
    () => students.filter((student) => matchesTeacherStudentFilter(student, studentFilters)),
    [students, studentFilters]
  );

  const filterSummary = useMemo(
    () => formatFilterSummary(studentFilters),
    [studentFilters]
  );

  if (workspaceLoading) {
    return <LoadingOverlay message="読み込み中…" />;
  }

  return (
    <PageLayout contentWidth="wide">
      <div className="flex flex-col gap-4 pb-4 md:pb-6">
        <div className="shrink-0 space-y-4">
          <SectionTitle
            onDark
            action={
              filteredStudents.length > 0 ? (
                <span className="text-sm text-tsure-on-primary/60 tabular-nums">
                  {filteredStudents.length}人
                </span>
              ) : null
            }
          >
            生徒の状況
          </SectionTitle>

          {schoolName && <p className="text-sm text-tsure-on-primary/70">{schoolName}</p>}

          <p className="text-xs text-tsure-on-primary/60 leading-relaxed">
            アカウント状態・直近{RECENT_STUDY_DAYS}日の学習有無・連れ勉の申請状況を表示します。連れ勉の相手は学内のみ氏名を表示し、学外は匿名化します。
          </p>

          {hasStudentFilter && (
            <p className="text-xs text-tsure-on-primary/60">
              サイドバーの条件で表示中
              {filterSummary ? `: ${filterSummary}` : ''}
            </p>
          )}
        </div>

        <div className="flex flex-col min-h-0 h-[calc(100dvh-15rem)] md:h-[calc(100dvh-6.5rem)] border border-tsure-border rounded-xl overflow-hidden bg-tsure-surface/90">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-tsure-surface sticky top-0 z-10 border-b border-tsure-border">
                <tr>
                  <th className="text-left px-3 py-2 font-semibold text-tsure-primary w-8" />
                  <th className="text-left px-3 py-2 font-semibold text-tsure-primary">生徒</th>
                  <th className="text-left px-3 py-2 font-semibold text-tsure-primary whitespace-nowrap">
                    アカウント
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-tsure-primary whitespace-nowrap">
                    直近{RECENT_STUDY_DAYS}日
                  </th>
                  <th className="text-left px-3 py-2 font-semibold text-tsure-primary">連れ勉</th>
                </tr>
              </thead>
              <tbody>
                {loadingStudents && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-tsure-muted">
                      生徒一覧を読み込み中...
                    </td>
                  </tr>
                )}
                {!loadingStudents && filteredStudents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-tsure-muted">
                      該当する生徒がいません
                    </td>
                  </tr>
                )}
                {!loadingStudents &&
                  filteredStudents.map((student) => {
                    const accountStatus = getTeacherAccountStatus(student);
                    const study = studySummaries[student.email];
                    const mateSummary = buildTeacherMateSummary(student, studentsByEmail);
                    const expanded = expandedEmail === student.email;
                    const hasMateDetails =
                      mateSummary.counts.mutual +
                        mateSummary.counts.sent +
                        mateSummary.counts.received >
                      0;

                    return (
                      <Fragment key={student.email}>
                        <tr className="border-t border-tsure-border hover:bg-tsure-surface-hover/60">
                          <td className="px-2 py-2 align-top">
                            {hasMateDetails ? (
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedEmail(expanded ? null : student.email)
                                }
                                aria-expanded={expanded}
                                aria-label={`${student.name || '生徒'}の連れ勉詳細を${expanded ? '閉じる' : '開く'}`}
                                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-tsure-primary hover:bg-tsure-surface"
                              >
                                <AppIcon
                                  icon={ChevronDown}
                                  size="sm"
                                  className={`transition-transform ${expanded ? 'rotate-180' : ''}`}
                                />
                              </button>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 align-top">
                            <p className="font-semibold text-tsure-primary">
                              {student.name || '—'}
                            </p>
                            <p className="text-xs text-tsure-muted mt-0.5">
                              {student.grade}年{student.class}組 {student.number}番
                            </p>
                          </td>
                          <td className="px-3 py-2 align-top">
                            <StatusBadge status={accountStatus} />
                          </td>
                          <td className="px-3 py-2 align-top whitespace-nowrap">
                            <StudyStatusCell loadingStudy={loadingStudy} study={study} />
                          </td>
                          <td className="px-3 py-2 align-top">
                            <p className="text-xs text-tsure-primary tabular-nums">
                              {formatMateCountSummary(mateSummary.counts)}
                            </p>
                          </td>
                        </tr>
                        {expanded && (
                          <tr className="border-t border-tsure-border bg-tsure-surface/70">
                            <td />
                            <td colSpan={4} className="px-3 py-3">
                              <div className="grid gap-4 sm:grid-cols-3">
                                <MateDetailSection title="仲間" items={mateSummary.mutual} />
                                <MateDetailSection title="送信中" items={mateSummary.sent} />
                                <MateDetailSection title="受信中" items={mateSummary.received} />
                              </div>
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </PageLayout>
  );
}
