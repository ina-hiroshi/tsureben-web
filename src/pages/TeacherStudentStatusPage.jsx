import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { useTeacherWorkspace } from '../contexts/TeacherWorkspaceContext';
import { fetchStudentsForSchool } from '../services/firestore/userService';
import { getRecentStudySummaries } from '../services/firestore/logService';
import { mergeDemoStudents } from '../dev/demoTeacherReview';
import { useDemoSettingsRevision } from '../hooks/useDemoSettings';
import { uniqueSorted } from '../utils/adminStudents';
import PageLayout from '../components/ui/PageLayout';
import SectionTitle from '../components/ui/SectionTitle';
import LoadingOverlay from '../components/ui/LoadingOverlay';
import Modal from '../components/ui/Modal';
import FilterSelect from '../components/ui/FilterSelect';
import SuggestInput from '../components/ui/SuggestInput';
import StudentStatusDashboardPanel from '../components/teacher/StudentStatusDashboardPanel';
import { db } from '../firebase';
import {
  accountStatusBadgeClass,
  buildTeacherMateSummary,
  formatMateCountSummary,
  getLivePresenceStatus,
  getTeacherAccountStatus,
  livePresenceBadgeClass,
  matchesStudentStatusTableFilter,
} from '../utils/teacherStudentStatus';

const RECENT_STUDY_DAYS = 7;

const PRESENCE_FILTER_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'studying', label: '学習中' },
  { value: 'paused', label: '休憩中' },
  { value: 'offline', label: '—' },
];

const ACCOUNT_FILTER_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'ready', label: '利用可能' },
  { value: 'onboarding', label: '初期設定未完了' },
  { value: 'password_reset', label: 'パスワード未変更' },
  { value: 'disabled', label: '無効' },
  { value: 'migrated', label: '引き継ぎ済み' },
];

const STUDY_FILTER_OPTIONS = [
  { value: '', label: 'すべて' },
  { value: 'yes', label: 'あり' },
  { value: 'no', label: 'なし' },
];

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${accountStatusBadgeClass(status.tone)}`}
    >
      {status.label}
    </span>
  );
}

function LiveStatusCell({ presence }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-bold whitespace-nowrap ${livePresenceBadgeClass(presence.status)}`}
    >
      {presence.label}
    </span>
  );
}

function StudyStatusCell({ loadingStudy, study }) {
  if (loadingStudy && !study) {
    return <span className="text-xs text-tsure-muted">取得中…</span>;
  }
  if (study?.hasStudy) {
    const dayCount = study.studyDayCount ?? 1;
    return (
      <span className="text-tsure-primary tabular-nums whitespace-nowrap">
        {dayCount}日 · {study.totalMinutes}分
      </span>
    );
  }
  return <span className="text-tsure-muted">なし</span>;
}

function stopRowClick(event) {
  event.stopPropagation();
}

function TableHeaderCell({ title, children, className = '' }) {
  return (
    <th
      className={`text-left px-2 py-2 align-top bg-tsure-surface border-b border-tsure-border font-normal ${className}`}
      onClick={stopRowClick}
    >
      <div className="text-xs font-semibold text-tsure-primary leading-none mb-1.5">{title}</div>
      {children}
    </th>
  );
}

export default function TeacherStudentStatusPage() {
  const {
    effectiveSchoolId,
    loading: workspaceLoading,
    studentFilters,
    studentFilterGrade,
    studentFilterClass,
    studentNameQuery,
    setStudentFilterGrade,
    setStudentFilterClass,
    setStudentNameQuery,
    selectStudent,
    activeSessions,
  } = useTeacherWorkspace();
  const demoRevision = useDemoSettingsRevision();
  const [students, setStudents] = useState([]);
  const [studySummaries, setStudySummaries] = useState({});
  const [schoolName, setSchoolName] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingStudy, setLoadingStudy] = useState(false);
  const [modalStudent, setModalStudent] = useState(null);
  const [presenceFilter, setPresenceFilter] = useState('');
  const [accountFilter, setAccountFilter] = useState('');
  const [studyFilter, setStudyFilter] = useState('');

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
    setModalStudent(null);
    setPresenceFilter('');
    setAccountFilter('');
    setStudyFilter('');
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

  const gradeOptions = useMemo(
    () => uniqueSorted(students.map((student) => student.grade)),
    [students]
  );

  const classOptions = useMemo(() => {
    const source = studentFilterGrade
      ? students.filter((student) => String(student.grade ?? '') === studentFilterGrade)
      : students;
    return uniqueSorted(source.map((student) => student.class));
  }, [students, studentFilterGrade]);

  const nameSuggestions = useMemo(
    () => uniqueSorted(students.map((student) => student.name)),
    [students]
  );

  const tableFilters = useMemo(
    () => ({
      studentFilters,
      presenceFilter,
      accountFilter,
      studyFilter,
    }),
    [studentFilters, presenceFilter, accountFilter, studyFilter]
  );

  const filteredStudents = useMemo(
    () =>
      students.filter((student) =>
        matchesStudentStatusTableFilter(student, tableFilters, {
          activeSessions,
          studySummaries,
        })
      ),
    [students, tableFilters, activeSessions, studySummaries]
  );

  const hasTableFilter = Boolean(
    studentFilterGrade ||
      studentFilterClass ||
      studentNameQuery.trim() ||
      presenceFilter ||
      accountFilter ||
      studyFilter
  );

  const modalStudentRecord = useMemo(() => {
    if (!modalStudent?.email) return null;
    return studentsByEmail[modalStudent.email] || modalStudent;
  }, [modalStudent, studentsByEmail]);

  const handleOpenDashboard = (student) => {
    selectStudent({
      email: student.email,
      name: student.name,
      grade: student.grade,
      class: student.class,
      number: student.number,
    });
    setModalStudent(student);
  };

  const handleCloseModal = () => {
    setModalStudent(null);
  };

  const handleClearFilters = () => {
    setStudentFilterGrade('');
    setStudentFilterClass('');
    setStudentNameQuery('');
    setPresenceFilter('');
    setAccountFilter('');
    setStudyFilter('');
  };

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
              !loadingStudents ? (
                <span className="text-sm text-tsure-on-primary/60 tabular-nums">
                  {filteredStudents.length}人
                  {filteredStudents.length !== students.length
                    ? ` / 全${students.length}人`
                    : ''}
                </span>
              ) : null
            }
          >
            生徒の状況
          </SectionTitle>

          {schoolName && <p className="text-sm text-tsure-on-primary/70">{schoolName}</p>}

          <p className="text-xs text-tsure-on-primary/60 leading-relaxed">
            各列の見出し下で絞り込みできます。行をタップすると概要を表示します。
          </p>
        </div>

        <div className="flex flex-col min-h-0 h-[calc(100dvh-15rem)] md:h-[calc(100dvh-6.5rem)] border border-tsure-border rounded-xl overflow-hidden bg-tsure-surface/90">
          <div className="flex-1 min-h-0 overflow-auto">
            <table className="w-full text-sm min-w-[860px]">
              <thead className="sticky top-0 z-10">
                <tr>
                  <TableHeaderCell title="生徒" className="min-w-[220px]">
                    <div className="space-y-1">
                      <div className="grid grid-cols-2 gap-1">
                        <FilterSelect
                          value={studentFilterGrade}
                          onChange={setStudentFilterGrade}
                          placeholder="学年"
                          options={[
                            { value: '', label: 'すべて' },
                            ...gradeOptions.map((grade) => ({
                              value: grade,
                              label: `${grade}年`,
                            })),
                          ]}
                          disabled={loadingStudents}
                          compact
                        />
                        <FilterSelect
                          value={studentFilterClass}
                          onChange={setStudentFilterClass}
                          placeholder="組"
                          options={[
                            { value: '', label: 'すべて' },
                            ...classOptions.map((classNum) => ({
                              value: classNum,
                              label: `${classNum}組`,
                            })),
                          ]}
                          disabled={loadingStudents}
                          compact
                        />
                      </div>
                      <SuggestInput
                        value={studentNameQuery}
                        onChange={setStudentNameQuery}
                        suggestions={nameSuggestions}
                        placeholder="氏名"
                        disabled={loadingStudents}
                        compact
                      />
                      {hasTableFilter && (
                        <button
                          type="button"
                          onClick={handleClearFilters}
                          className="text-[11px] text-tsure-accent hover:underline"
                        >
                          絞り込み解除
                        </button>
                      )}
                    </div>
                  </TableHeaderCell>
                  <TableHeaderCell title="今" className="whitespace-nowrap min-w-[6.5rem]">
                    <FilterSelect
                      value={presenceFilter}
                      onChange={setPresenceFilter}
                      options={PRESENCE_FILTER_OPTIONS}
                      disabled={loadingStudents}
                      compact
                    />
                  </TableHeaderCell>
                  <TableHeaderCell title="アカウント" className="min-w-[9rem]">
                    <FilterSelect
                      value={accountFilter}
                      onChange={setAccountFilter}
                      options={ACCOUNT_FILTER_OPTIONS}
                      disabled={loadingStudents}
                      compact
                    />
                  </TableHeaderCell>
                  <TableHeaderCell
                    title={`直近${RECENT_STUDY_DAYS}日`}
                    className="whitespace-nowrap min-w-[6.5rem]"
                  >
                    <FilterSelect
                      value={studyFilter}
                      onChange={setStudyFilter}
                      options={STUDY_FILTER_OPTIONS}
                      disabled={loadingStudents || loadingStudy}
                      compact
                    />
                  </TableHeaderCell>
                  <TableHeaderCell title="連れ勉" className="min-w-[5.5rem]" />
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
                      {hasTableFilter ? '条件に一致する生徒がいません' : '該当する生徒がいません'}
                    </td>
                  </tr>
                )}
                {!loadingStudents &&
                  filteredStudents.map((student) => {
                    const accountStatus = getTeacherAccountStatus(student);
                    const study = studySummaries[student.email];
                    const mateSummary = buildTeacherMateSummary(student, studentsByEmail);
                    const presence = getLivePresenceStatus(student.email, activeSessions);
                    const isOpen = modalStudent?.email === student.email;

                    return (
                      <tr
                        key={student.email}
                        onClick={() => handleOpenDashboard(student)}
                        className={`border-t border-tsure-border cursor-pointer transition ${
                          isOpen
                            ? 'bg-tsure-primary/10 hover:bg-tsure-primary/12'
                            : 'hover:bg-tsure-surface-hover/60'
                        }`}
                      >
                        <td className="px-3 py-2 align-top">
                          <p className="font-semibold text-tsure-primary">{student.name || '—'}</p>
                          <p className="text-xs text-tsure-muted mt-0.5">
                            {student.grade}年{student.class}組 {student.number}番
                          </p>
                        </td>
                        <td className="px-3 py-2 align-top">
                          <LiveStatusCell presence={presence} />
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
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        open={Boolean(modalStudentRecord)}
        onClose={handleCloseModal}
        title={modalStudentRecord ? `${modalStudentRecord.name || '生徒'}の概要` : ''}
        size="wide"
      >
        {modalStudentRecord && (
          <StudentStatusDashboardPanel
            student={modalStudentRecord}
            studentsByEmail={studentsByEmail}
            studySummary={studySummaries[modalStudentRecord.email]}
            inModal
            onClose={handleCloseModal}
          />
        )}
      </Modal>
    </PageLayout>
  );
}
