import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare } from 'lucide-react';
import dayjs from 'dayjs';
import { useTeacherWorkspace } from '../../contexts/TeacherWorkspaceContext';
import { useTeacherStudentDashboard } from '../../hooks/useTeacherStudentDashboard';
import {
  accountStatusBadgeClass,
  buildTeacherMateSummary,
  formatMateCountSummary,
  getAttentionMessages,
  getLivePresenceStatus,
  getTeacherAccountStatus,
  livePresenceBadgeClass,
} from '../../utils/teacherStudentStatus';
import DailySubjectPieChart from '../DailySubjectPieChart';
import TeacherMateDetailSections from './TeacherMateDetailSections';
import AppIcon from '../ui/AppIcon';
import Button from '../ui/Button';
import Card from '../ui/Card';
import LoadingOverlay from '../ui/LoadingOverlay';

function StatusBadge({ status }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap ${accountStatusBadgeClass(status.tone)}`}
    >
      {status.label}
    </span>
  );
}

function LiveStatusBadge({ presence }) {
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-bold whitespace-nowrap ${livePresenceBadgeClass(presence.status)}`}
    >
      {presence.label}
    </span>
  );
}

function formatLastFeedbackDate(date) {
  if (!date) return 'やりとりなし';
  return dayjs(date).format('M月D日');
}

export default function StudentStatusDashboardPanel({
  student,
  studentsByEmail,
  studySummary,
  inModal = false,
  onClose,
}) {
  const navigate = useNavigate();
  const { selectStudent, activeSessions } = useTeacherWorkspace();
  const { loading, studyDetail, feedbackSummary, recentStudyDays } =
    useTeacherStudentDashboard(student?.email);

  const accountStatus = useMemo(
    () => getTeacherAccountStatus(student),
    [student]
  );

  const presence = useMemo(
    () => getLivePresenceStatus(student?.email, activeSessions),
    [student?.email, activeSessions]
  );

  const mateSummary = useMemo(
    () => buildTeacherMateSummary(student, studentsByEmail),
    [student, studentsByEmail]
  );

  const attentionMessages = useMemo(() => {
    const summaryForAttention = studyDetail ?? studySummary ?? null;
    return getAttentionMessages({
      accountStatus,
      studySummary: summaryForAttention,
      recentDays: recentStudyDays,
    });
  }, [accountStatus, studyDetail, studySummary, recentStudyDays]);

  const displayStudy = studyDetail ?? studySummary;
  const studyDayCount = displayStudy?.studyDayCount ?? (displayStudy?.hasStudy ? 1 : 0);
  const totalMinutes = displayStudy?.totalMinutes ?? 0;
  const bySubject = studyDetail?.bySubject ?? {};

  if (!student) {
    return null;
  }

  const studentMeta = [
    student.grade != null && student.grade !== '' ? `${student.grade}年` : null,
    student.class != null && student.class !== '' ? `${student.class}組` : null,
    student.number != null && student.number !== '' ? `${student.number}番` : null,
  ]
    .filter(Boolean)
    .join(' ');

  const handleSelectStudent = () => {
    selectStudent({
      email: student.email,
      name: student.name,
      grade: student.grade,
      class: student.class,
      number: student.number,
    });
  };

  const handleOpenReview = () => {
    handleSelectStudent();
    onClose?.();
    navigate('/teacher/students');
  };

  const handleOpenFeedback = () => {
    handleSelectStudent();
    onClose?.();
    navigate('/teacher/students?feedback=1');
  };

  const sectionClass = inModal
    ? 'space-y-4 shrink-0'
    : '!p-4 space-y-4 shrink-0 relative border border-tsure-border rounded-2xl shadow-tsure-raised bg-tsure-surface';
  const statBoxClass = inModal
    ? 'rounded-xl bg-tsure-surface-hover/60 px-3 py-3'
    : 'rounded-xl border border-tsure-border bg-tsure-surface px-3 py-3';
  const compactSectionClass = inModal
    ? 'shrink-0'
    : '!p-4 shrink-0 border border-tsure-border rounded-2xl shadow-tsure-raised bg-tsure-surface';

  return (
    <div className={`flex flex-col ${inModal ? 'gap-6' : 'gap-4'}`}>
      {!inModal && (
        <Card className="!p-4 space-y-3 shrink-0">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="text-lg font-bold text-tsure-primary truncate">
                {student.name || '—'}
              </h2>
              {studentMeta && (
                <p className="text-sm text-tsure-muted mt-0.5">{studentMeta}</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <LiveStatusBadge presence={presence} />
              <StatusBadge status={accountStatus} />
            </div>
          </div>
        </Card>
      )}

      {inModal && (
        <div className="flex flex-wrap items-center justify-between gap-2 shrink-0">
          {studentMeta && <p className="text-sm text-tsure-muted">{studentMeta}</p>}
          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <LiveStatusBadge presence={presence} />
            <StatusBadge status={accountStatus} />
          </div>
        </div>
      )}

      {attentionMessages.length > 0 && (
        <div
          className={`rounded-xl px-4 py-3 space-y-1 shrink-0 ${
            inModal ? 'bg-amber-50' : 'border border-amber-200 bg-amber-50'
          }`}
        >
          {attentionMessages.map((message) => (
            <p key={message} className="text-sm text-amber-900">
              {message}
            </p>
          ))}
        </div>
      )}

      <div className={sectionClass}>
        {loading && <LoadingOverlay message="詳細を読み込み中…" />}
        <div>
          <h3 className="text-sm font-bold text-tsure-primary">
            学習サマリー（直近{recentStudyDays}日）
          </h3>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <div className={statBoxClass}>
              <p className="text-xs text-tsure-muted">学習した日数</p>
              <p className="text-2xl font-bold text-tsure-primary tabular-nums mt-1">
                {studyDayCount}
                <span className="text-sm font-medium text-tsure-muted ml-1">
                  / {recentStudyDays} 日
                </span>
              </p>
            </div>
            <div className={statBoxClass}>
              <p className="text-xs text-tsure-muted">合計学習時間</p>
              <p className="text-2xl font-bold text-tsure-primary tabular-nums mt-1">
                {totalMinutes > 0 ? (
                  <>
                    {totalMinutes}
                    <span className="text-sm font-medium text-tsure-muted ml-1">分</span>
                  </>
                ) : (
                  <span className="text-base font-medium text-tsure-muted">なし</span>
                )}
              </p>
            </div>
          </div>
        </div>

        <DailySubjectPieChart
          totalMinutes={totalMinutes}
          bySubject={bySubject}
          embedded
          footerNote={`直近${recentStudyDays}日の記録を表示しています`}
          emptyState={{
            title: '教科別の記録なし',
            description: `直近${recentStudyDays}日間に学習記録がありません。`,
          }}
        />
      </div>

      <div className={compactSectionClass}>
        <h3 className="text-sm font-bold text-tsure-primary mb-2">フィードバック</h3>
        {loading && !feedbackSummary ? (
          <p className="text-sm text-tsure-muted">取得中…</p>
        ) : (
          <div className="space-y-1 text-sm">
            <p className="text-tsure-primary">
              {feedbackSummary?.unreadCount > 0
                ? `未読 ${feedbackSummary.unreadCount} 件`
                : '未読なし'}
            </p>
            <p className="text-tsure-muted">
              最終やりとり: {formatLastFeedbackDate(feedbackSummary?.lastMessageAt)}
            </p>
          </div>
        )}
      </div>

      <div className={`${compactSectionClass} space-y-3`}>
        <div>
          <h3 className="text-sm font-bold text-tsure-primary">連れ勉</h3>
          <p className="text-xs text-tsure-muted mt-1 tabular-nums">
            {formatMateCountSummary(mateSummary.counts)}
          </p>
        </div>
        <TeacherMateDetailSections mateSummary={mateSummary} />
      </div>

      <div className="flex flex-col sm:flex-row gap-2 shrink-0 pb-2">
        <Button type="button" variant="primary" className="flex-1" onClick={handleOpenReview}>
          学習記録・計画を見る
        </Button>
        <Button
          type="button"
          variant="secondary"
          className="flex-1"
          onClick={handleOpenFeedback}
        >
          <AppIcon icon={MessageSquare} size="sm" className="mr-1.5" />
          フィードバックを開く
        </Button>
      </div>
    </div>
  );
}
