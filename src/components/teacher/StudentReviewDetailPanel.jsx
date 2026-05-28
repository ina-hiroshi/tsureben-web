import { useState } from 'react';
import dayjs from 'dayjs';
import { ArrowLeft } from 'lucide-react';
import { useStudentPeriodData } from '../../hooks/useStudentPeriodData';
import PeriodNav from '../ui/PeriodNav';
import PlanCardList from '../PlanCardList';
import StudyLogCardList from '../StudyLogCardList';
import DailySubjectPieChart from '../DailySubjectPieChart';
import StudyPeriodPlanView from './StudyPeriodPlanView';
import StudyPeriodLogView from './StudyPeriodLogView';
import FeedbackThreadPanel from './FeedbackThreadPanel';
import AppIcon from '../ui/AppIcon';
import LoadingOverlay from '../ui/LoadingOverlay';
import {
  TEACHER_PLAN_READONLY_EMPTY,
  TEACHER_LOG_READONLY_EMPTY,
} from '../../content/emptyStatePresets';

const TABS = [
  { id: 'plan', label: '学習計画' },
  { id: 'log', label: '学習記録' },
  { id: 'feedback', label: 'フィードバック' },
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
    return (
      <div className="flex items-center justify-center min-h-[12rem] lg:min-h-full py-12 text-center">
        <p className="text-tsure-muted text-sm">左の一覧から生徒を選択してください</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 min-w-0 rounded-lg border border-tsure-border bg-white px-3 py-2">
        {showBackButton && (
          <button
            type="button"
            onClick={onBack}
            className="lg:hidden shrink-0 min-w-9 min-h-9 flex items-center justify-center rounded-md border border-tsure-border bg-white text-tsure-primary hover:bg-tsure-surface-hover"
            aria-label="生徒一覧に戻る"
          >
            <AppIcon icon={ArrowLeft} size="sm" />
          </button>
        )}
        <div className="min-w-0 flex-1 flex items-center gap-2">
          <h2 className="text-xl font-bold text-tsure-primary truncate leading-tight">
            {student.name || '—'}
          </h2>
          <span className="shrink-0 rounded-md bg-tsure-primary/10 px-2 py-0.5 text-xs font-semibold text-tsure-primary tabular-nums whitespace-nowrap">
            {student.grade}年{student.class}組 {student.number}番
          </span>
        </div>
      </div>

      <PeriodNav
        date={selectedDate}
        mode={periodMode}
        onModeChange={setPeriodMode}
        onDateChange={setSelectedDate}
      />

      <div>
        <div
          className="border-b border-tsure-border"
          role="tablist"
          aria-label="学習情報の表示切替"
        >
          <div className="flex flex-wrap gap-1">
            {TABS.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => setActiveTab(tab.id)}
                  className={`relative px-4 py-2.5 text-sm font-semibold transition -mb-px min-h-touch sm:min-h-0 ${
                    isActive
                      ? 'text-tsure-primary bg-tsure-surface border border-tsure-border border-b-tsure-surface rounded-t-lg z-[1]'
                      : 'text-tsure-muted border border-transparent hover:text-tsure-primary hover:bg-white/60 rounded-t-lg'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="pt-4" role="tabpanel">
          {loading && activeTab !== 'feedback' && <LoadingOverlay message="読み込み中…" />}

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
            />
          )}

          {activeTab === 'log' && !isPeriodView && (
            <div className="space-y-4">
              <DailySubjectPieChart
                totalMinutes={dayLogs.totalMinutes}
                bySubject={dayLogs.bySubject}
                emptyState={TEACHER_LOG_READONLY_EMPTY}
              />
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
              dailyTotals={dailyTotals}
              studyDayCount={studyDayCount}
              periodDayCount={periodDayCount}
              emptyState={TEACHER_LOG_READONLY_EMPTY}
            />
          )}

          {activeTab === 'feedback' && (
            <FeedbackThreadPanel
              student={student}
              schoolId={schoolId}
              dateKey={dateKey}
              teacherName={teacherName}
              mode="teacher"
            />
          )}
        </div>
      </div>
    </div>
  );
}
