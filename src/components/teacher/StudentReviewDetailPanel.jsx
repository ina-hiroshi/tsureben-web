import { useState } from 'react';
import dayjs from 'dayjs';
import { ArrowLeft, MessageSquare } from 'lucide-react';
import { useStudentPeriodData } from '../../hooks/useStudentPeriodData';
import PeriodNav from '../ui/PeriodNav';
import PlanCardList from '../PlanCardList';
import StudyLogCardList from '../StudyLogCardList';
import DailySubjectPieChart from '../DailySubjectPieChart';
import StudyPeriodPlanView from './StudyPeriodPlanView';
import StudyPeriodLogView from './StudyPeriodLogView';
import FeedbackThreadPanel from './FeedbackThreadPanel';
import AppIcon from '../ui/AppIcon';
import Card from '../ui/Card';
import LoadingOverlay from '../ui/LoadingOverlay';
import DraggableDialog from '../ui/DraggableDialog';
import {
  TEACHER_PLAN_READONLY_EMPTY,
  TEACHER_LOG_READONLY_EMPTY,
} from '../../content/emptyStatePresets';

const TABS = [
  { id: 'plan', label: '学習計画' },
  { id: 'log', label: '学習記録' },
];

export default function StudentReviewDetailPanel({
  student,
  schoolId,
  teacherName,
  onBack,
  showBackButton = false,
}) {
  const [selectedDate, setSelectedDate] = useState(dayjs());
  const [periodMode, setPeriodMode] = useState('day');
  const [activeTab, setActiveTab] = useState('plan');
  const [feedbackOpen, setFeedbackOpen] = useState(false);

  const dateKey = selectedDate.format('YYYY-MM-DD');
  const {
    loading,
    plans,
    dayLogs,
    aggregatedLogs,
    aggregatedPlans,
    planDailyOverview,
    dailyTotals,
    studyDayCount,
    startDate,
    endDate,
  } = useStudentPeriodData(student?.email, selectedDate, periodMode);

  const periodDayCount = dayjs(endDate).diff(dayjs(startDate), 'day') + 1;
  const isPeriodView = periodMode !== 'day';

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

  return (
    <div className="flex flex-col gap-4 md:min-h-0 md:flex-1">
      {showBackButton && (
        <div className="md:hidden flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onBack}
            className="shrink-0 min-w-9 min-h-9 flex items-center justify-center rounded-xl border border-white/20 bg-white/10 text-tsure-on-primary hover:bg-white/15"
            aria-label="生徒一覧に戻る"
          >
            <AppIcon icon={ArrowLeft} size="sm" />
          </button>
          <p className="text-sm font-semibold text-tsure-on-primary truncate">
            {student.name || '—'}
          </p>
        </div>
      )}

      <PeriodNav
        date={selectedDate}
        mode={periodMode}
        onModeChange={setPeriodMode}
        onDateChange={setSelectedDate}
      />

      <div className="border-b border-white/10 shrink-0" role="tablist" aria-label="学習情報の表示切替">
        <div className="relative flex items-center gap-1">
          <div
            className="hidden md:flex absolute left-1/2 -translate-x-1/2 items-baseline gap-2 max-w-[50%] px-2 pointer-events-none"
            aria-hidden="true"
          >
            <span className="text-xl font-extrabold text-tsure-on-primary truncate">
              {student.name || student.email}
            </span>
            {studentMeta && (
              <span className="text-sm text-tsure-on-primary/60 shrink-0">{studentMeta}</span>
            )}
          </div>

          {TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 py-2.5 text-sm font-semibold transition -mb-px min-h-touch sm:min-h-0 rounded-t-lg ${
                  isActive
                    ? 'text-tsure-on-primary bg-white/15 border border-white/20 border-b-transparent z-[1]'
                    : 'text-tsure-on-primary/60 border border-transparent hover:text-tsure-on-primary hover:bg-white/10'
                }`}
              >
                {tab.label}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setFeedbackOpen(true)}
            aria-pressed={feedbackOpen}
            className={`ml-auto shrink-0 inline-flex items-center gap-1.5 px-3 py-2 text-sm font-semibold rounded-lg border transition min-h-touch sm:min-h-0 ${
              feedbackOpen
                ? 'bg-white/20 border-white/30 text-tsure-on-primary'
                : 'bg-white/10 border-white/20 text-tsure-on-primary/80 hover:bg-white/15 hover:text-tsure-on-primary'
            }`}
          >
            <AppIcon icon={MessageSquare} size="sm" />
            フィードバック
          </button>
        </div>
      </div>

      <div className="relative flex-1 min-h-0 pt-4 md:overflow-y-auto" role="tabpanel">
        {loading && <LoadingOverlay message="読み込み中…" />}

        {activeTab === 'plan' && !isPeriodView && (
          <PlanCardList
            entries={plans}
            readOnly
            emptyState={TEACHER_PLAN_READONLY_EMPTY}
          />
        )}

        {activeTab === 'plan' && isPeriodView && (
          <StudyPeriodPlanView
            periodMode={periodMode}
            aggregatedPlans={aggregatedPlans}
            planDailyOverview={planDailyOverview}
            emptyState={TEACHER_PLAN_READONLY_EMPTY}
            onDark
          />
        )}

        {activeTab === 'log' && !isPeriodView && (
          <div className="space-y-4">
            <Card>
              <DailySubjectPieChart
                embedded
                totalMinutes={dayLogs.totalMinutes}
                bySubject={dayLogs.bySubject}
                emptyState={TEACHER_LOG_READONLY_EMPTY}
              />
            </Card>
            <StudyLogCardList
              entries={dayLogs.entries}
              readOnly
              emptyState={TEACHER_LOG_READONLY_EMPTY}
            />
          </div>
        )}

        {activeTab === 'log' && isPeriodView && (
          <StudyPeriodLogView
            periodMode={periodMode}
            aggregatedLogs={aggregatedLogs}
            plannedMinutes={aggregatedPlans.totalPlannedMinutes}
            planDailyOverview={planDailyOverview}
            dailyTotals={dailyTotals}
            studyDayCount={studyDayCount}
            periodDayCount={periodDayCount}
            emptyState={TEACHER_LOG_READONLY_EMPTY}
            onDark
          />
        )}

      </div>

      <DraggableDialog
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        title={`フィードバック — ${student.name || student.email}`}
        defaultWidth={440}
        defaultHeight={560}
      >
        <FeedbackThreadPanel
          student={student}
          schoolId={schoolId}
          dateKey={dateKey}
          teacherName={teacherName}
          mode="teacher"
        />
      </DraggableDialog>
    </div>
  );
}
