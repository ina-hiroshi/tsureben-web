import DailySubjectPieChart from '../DailySubjectPieChart';
import EmptyState from '../ui/EmptyState';
import StudyPeriodStatsGrid from '../studyPeriod/StudyPeriodStatsGrid';
import StudyPeriodActivityOverview from '../studyPeriod/StudyPeriodActivityOverview';
import StudyPeriodSubjectTable from '../studyPeriod/StudyPeriodSubjectTable';
import StudyPeriodEntryTable from '../studyPeriod/StudyPeriodEntryTable';
import { formatDuration } from '../../utils/studyPeriod';

export default function StudyPeriodLogView({
  periodMode,
  aggregatedLogs,
  dailyTotals,
  studyDayCount,
  periodDayCount,
  emptyState,
  onDark = false,
}) {
  const { totalMinutes, bySubject, entries } = aggregatedLogs;
  const averageMinutes =
    periodDayCount > 0 ? Math.round(totalMinutes / periodDayCount) : 0;
  const hasData = totalMinutes > 0;

  if (!hasData) {
    return <EmptyState {...emptyState} />;
  }

  const periodLabel = periodMode === 'week' ? '今週' : '今月';
  const footerNote =
    periodMode === 'week' ? '選択した週の記録を表示しています' : '選択した月の記録を表示しています';

  return (
    <div className="space-y-5">
      <StudyPeriodStatsGrid
        items={[
          { label: '期間合計', value: formatDuration(totalMinutes) },
          { label: '1日あたり平均', value: formatDuration(averageMinutes) },
          { label: '学習した日', value: `${studyDayCount}日` },
          { label: '記録件数', value: `${entries.length}件` },
        ]}
      />

      <StudyPeriodActivityOverview
        items={dailyTotals}
        periodMode={periodMode}
        valueKey="minutes"
        unitLabel="分"
        title={`${periodLabel}の学習ヒートマップ`}
        onDark={onDark}
      />

      <DailySubjectPieChart
        totalMinutes={totalMinutes}
        bySubject={bySubject}
        footerNote={footerNote}
        onDark={onDark}
      />

      <StudyPeriodSubjectTable
        bySubject={bySubject}
        totalValue={totalMinutes}
        valueLabel="学習時間"
        formatValue={formatDuration}
        title="教科別の学習時間"
        onDark={onDark}
      />

      <StudyPeriodEntryTable
        type="log"
        entries={entries}
        title="記録一覧（時系列）"
        onDark={onDark}
      />
    </div>
  );
}
