import EmptyState from '../ui/EmptyState';
import StudyPeriodStatsGrid from '../studyPeriod/StudyPeriodStatsGrid';
import StudyPeriodActivityOverview from '../studyPeriod/StudyPeriodActivityOverview';
import StudyPeriodSubjectTable from '../studyPeriod/StudyPeriodSubjectTable';
import StudyPeriodEntryTable from '../studyPeriod/StudyPeriodEntryTable';
import { formatDuration } from '../../utils/studyPeriod';

export default function StudyPeriodPlanView({
  periodMode,
  aggregatedPlans,
  planDailyOverview,
  emptyState,
  onDark = false,
}) {
  const { entries, totalCount, planDayCount, totalPlannedMinutes, bySubject } = aggregatedPlans;
  const hasData = totalCount > 0;

  if (!hasData) {
    return <EmptyState {...emptyState} />;
  }

  const periodLabel = periodMode === 'week' ? '今週' : '今月';
  const activityTitle =
    periodMode === 'week' ? `${periodLabel}の週間予定` : `${periodLabel}の月間予定`;

  return (
    <div className="space-y-5">
      <StudyPeriodStatsGrid
        items={[
          { label: '計画件数', value: `${totalCount}件` },
          { label: '計画した日', value: `${planDayCount}日` },
          { label: '予定時間合計', value: formatDuration(totalPlannedMinutes) },
          {
            label: '1日あたり',
            value: formatDuration(
              Math.round(totalPlannedMinutes / Math.max(planDailyOverview.length, 1))
            ),
          },
        ]}
      />

      <StudyPeriodActivityOverview
        items={planDailyOverview}
        periodMode={periodMode}
        valueKey="minutes"
        unitLabel="分"
        title={activityTitle}
        onDark={onDark}
        contentVariant="plan"
      />

      <StudyPeriodSubjectTable
        bySubject={bySubject}
        totalValue={totalPlannedMinutes}
        valueLabel="予定時間"
        formatValue={formatDuration}
        title="教科別の予定"
        showCount
        onDark={onDark}
      />

      <StudyPeriodEntryTable
        type="plan"
        entries={entries}
        title="予定一覧（時系列）"
        onDark={onDark}
      />
    </div>
  );
}
