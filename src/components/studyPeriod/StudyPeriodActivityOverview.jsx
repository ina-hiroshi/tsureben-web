import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import SubSectionTitle from '../ui/SubSectionTitle';
import StudyPeriodDayDetailModal from './StudyPeriodDayDetailModal';
import { subjectBarColorClass, subjectBorderColorClass, SUBJECT_BAR_COLORS } from '../../utils/subjectColors';
import { DAY_LABELS, buildMonthCalendarCells, formatDuration } from '../../utils/studyPeriod';

function formatActivityValue(value, valueKey, unitLabel) {
  if (value <= 0) return '—';
  if (valueKey === 'minutes') return formatDuration(value);
  return `${value}${unitLabel}`;
}

function formatActivityTitle(dateLabel, value, valueKey, unitLabel, bySubject) {
  const total =
    valueKey === 'minutes' ? formatDuration(value) : `${value}${unitLabel}`;
  const lines = [`${dateLabel} ${total}`];
  if (bySubject) {
    Object.entries(bySubject)
      .filter(([, mins]) => mins > 0)
      .sort((a, b) => b[1] - a[1])
      .forEach(([subject, mins]) => {
        lines.push(`${subject} ${formatDuration(mins)}`);
      });
  }
  return lines.join(' / ');
}

function relativeBarPercent(value, maxValue) {
  if (!value || !maxValue) return 0;
  return Math.max(12, Math.round((value / maxValue) * 100));
}

function relativeBarHeight(value, maxValue, maxBarHeight) {
  if (!value || !maxValue) return 0;
  return Math.max(16, Math.round((value / maxValue) * maxBarHeight));
}

const WEEK_DESKTOP_BAR_MAX_HEIGHT = 120;

function SubjectStackedBar({
  bySubject,
  totalMinutes,
  maxMinutes,
  dateLabel,
  valueKey,
  unitLabel,
  maxBarHeight = 56,
  orientation = 'vertical',
}) {
  if (!totalMinutes) {
    if (orientation === 'horizontal') {
      return <div className="h-2.5 w-8 rounded-full bg-tsure-surface-hover" aria-hidden />;
    }
    return <div className="w-5 sm:w-6 h-1.5 rounded-md bg-tsure-surface-hover" aria-hidden />;
  }

  const segments = Object.entries(bySubject || {})
    .filter(([, mins]) => mins > 0)
    .sort((a, b) => b[1] - a[1]);

  if (orientation === 'horizontal') {
    const widthPercent = relativeBarPercent(totalMinutes, maxMinutes);
    return (
      <div
        className="h-2.5 rounded-full overflow-hidden flex bg-tsure-surface-hover"
        style={{ width: `${widthPercent}%` }}
        title={formatActivityTitle(dateLabel, totalMinutes, valueKey, unitLabel, bySubject)}
        role="img"
        aria-label={formatActivityTitle(dateLabel, totalMinutes, valueKey, unitLabel, bySubject)}
      >
        {segments.map(([subject, mins]) => (
          <div
            key={subject}
            className={`h-full ${subjectBarColorClass(subject)}`}
            style={{ flexGrow: mins, flexBasis: 0, minWidth: mins > 0 ? 3 : 0 }}
          />
        ))}
      </div>
    );
  }

  const barHeight = relativeBarHeight(totalMinutes, maxMinutes, maxBarHeight);

  return (
    <div
      className="w-6 rounded-md overflow-hidden flex flex-col-reverse bg-tsure-surface-hover"
      style={{ height: `${barHeight}px` }}
      title={formatActivityTitle(dateLabel, totalMinutes, valueKey, unitLabel, bySubject)}
      role="img"
      aria-label={formatActivityTitle(dateLabel, totalMinutes, valueKey, unitLabel, bySubject)}
    >
      {segments.map(([subject, mins]) => (
        <div
          key={subject}
          className={`w-full ${subjectBarColorClass(subject)}`}
          style={{ flexGrow: mins, flexBasis: 0, minHeight: mins > 0 ? 3 : 0 }}
        />
      ))}
    </div>
  );
}

function PlanDayOverviewCard({
  item,
  valueKey,
  unitLabel,
  maxValue,
  showEntries = false,
  useHeatmap = false,
  contentVariant = 'none',
  heading,
}) {
  const value = item[valueKey] || 0;
  const hasSubjectBreakdown =
    item.bySubject && Object.values(item.bySubject).some((mins) => mins > 0);

  return (
    <div
      className={`rounded-xl border border-tsure-border p-3 min-w-0 ${
        useHeatmap ? intensityClass(value, maxValue) : 'bg-white'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="shrink-0 w-16 text-center">
          {heading ? (
            <span className="text-sm font-bold text-tsure-primary tabular-nums leading-snug">
              {heading}
            </span>
          ) : (
            <>
              <span className="text-xs text-tsure-muted block">{item.weekday}</span>
              <span className="text-base font-bold text-tsure-primary tabular-nums">{item.label}</span>
            </>
          )}
        </div>
        <div className="flex-1 min-w-0">
          {contentVariant === 'log' ? (
            <>
              <p className="text-base sm:text-lg font-extrabold text-tsure-primary tabular-nums leading-tight mb-2">
                {formatActivityValue(value, valueKey, unitLabel)}
              </p>
              <div className="mt-2">
                {showEntries && item.entries?.length > 0 ? (
                  <LogDayEntries entries={item.entries} className="max-h-none" />
                ) : value === 0 ? (
                  <p className="text-xs text-tsure-muted">記録なし</p>
                ) : null}
              </div>
            </>
          ) : (
            <>
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-sm font-semibold text-tsure-primary tabular-nums">
              {formatActivityValue(value, valueKey, unitLabel)}
            </span>
          </div>
          {hasSubjectBreakdown ? (
            <SubjectStackedBar
              bySubject={item.bySubject}
              totalMinutes={value}
              maxMinutes={maxValue}
              dateLabel={item.label}
              valueKey={valueKey}
              unitLabel={unitLabel}
              orientation="horizontal"
            />
          ) : value > 0 ? (
            <div
              className="h-2.5 rounded-full bg-tsure-primary"
              style={{ width: `${relativeBarPercent(value, maxValue)}%` }}
            />
          ) : (
            <div className="h-2.5 w-8 rounded-full bg-tsure-surface-hover" aria-hidden />
          )}
          <div className="mt-2">
          {showEntries && item.entries?.length > 0 && (
              <PlanDayEntries entries={item.entries} className="max-h-none" />
          )}
          {!showEntries && value === 0 && (
            <p className="text-xs text-tsure-muted">
              {useHeatmap ? '記録なし' : contentVariant === 'plan' ? '計画なし' : '記録なし'}
            </p>
          )}
          </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function PlanDayEntries({ entries = [], className = 'max-h-28' }) {
  if (!entries.length) return null;

  return (
    <ul
      className={`mt-2 w-full space-y-1.5 text-left overflow-y-auto overscroll-y-contain ${className}`}
    >
      {entries.map((entry) => {
        const timeRange =
          entry.start && entry.end ? `${entry.start}–${entry.end}` : entry.start || '—';
        const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
        const detail = entry.content || entry.book || '';

        return (
          <li
            key={entry.id}
            className={`rounded-md border border-tsure-border bg-tsure-surface/70 px-1.5 py-1 border-l-[3px] ${subjectBorderColorClass(
              entry.subject
            )}`}
          >
            <p className="text-xs text-tsure-muted tabular-nums leading-tight">{timeRange}</p>
            <p className="text-xs sm:text-sm font-semibold text-tsure-primary leading-snug">
              {subjectLine || '—'}
            </p>
            {detail && (
              <p className="text-xs text-tsure-muted leading-snug line-clamp-3 mt-0.5">
                {detail}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CompactPlanDayEntries({ entries = [] }) {
  if (!entries.length) return null;

  return (
    <ul className="mt-1 w-full space-y-0.5 text-left overflow-y-auto flex-1 min-h-0">
      {entries.map((entry) => {
        const timeRange =
          entry.start && entry.end ? `${entry.start}–${entry.end}` : entry.start || '—';
        const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
        const mins = entry.plannedMinutes || 0;

        return (
          <li key={entry.id} className="flex items-start gap-1 min-w-0 leading-tight">
            <span
              className={`mt-[3px] w-1.5 h-1.5 rounded-full shrink-0 ${subjectBarColorClass(
                entry.subject
              )}`}
              aria-hidden
            />
            <span className="text-[8px] sm:text-[9px] text-tsure-primary min-w-0 break-words">
              <span className="tabular-nums text-tsure-muted">{timeRange}</span>{' '}
              <span className="font-medium">{subjectLine || '—'}</span>{' '}
              <span className="tabular-nums whitespace-nowrap">{mins}分</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function LogDayEntries({ entries = [], className = 'max-h-28' }) {
  if (!entries.length) return null;

  return (
    <ul
      className={`mt-2 w-full space-y-1.5 text-left overflow-y-auto overscroll-y-contain ${className}`}
    >
      {entries.map((entry) => {
        const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
        const detail = entry.content || entry.book || '';
        const mins = entry.duration || 0;

        return (
          <li
            key={entry.id}
            className={`rounded-md border border-tsure-border bg-tsure-surface/70 px-1.5 py-1 border-l-[3px] ${subjectBorderColorClass(
              entry.subject
            )}`}
          >
            <p className="text-xs text-tsure-muted tabular-nums leading-tight">
              {entry.startTime || '—'} · {formatDuration(mins)}
            </p>
            <p className="text-xs sm:text-sm font-semibold text-tsure-primary leading-snug">
              {subjectLine || '—'}
            </p>
            {detail && (
              <p className="text-xs text-tsure-muted leading-snug line-clamp-3 mt-0.5">{detail}</p>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function CompactLogDayEntries({ entries = [], limit }) {
  if (!entries.length) return null;

  const visibleEntries = limit ? entries.slice(0, limit) : entries;

  return (
    <ul className="mt-1 w-full space-y-0.5 text-left overflow-y-auto flex-1 min-h-0">
      {visibleEntries.map((entry) => {
        const subjectLine = [entry.subject, entry.topic].filter(Boolean).join(' / ');
        const mins = entry.duration || 0;

        return (
          <li key={entry.id} className="flex items-start gap-1 min-w-0 leading-tight">
            <span
              className={`mt-[3px] w-1.5 h-1.5 rounded-full shrink-0 ${subjectBarColorClass(
                entry.subject
              )}`}
              aria-hidden
            />
            <span className="text-[8px] sm:text-[9px] text-tsure-primary min-w-0 break-words">
              <span className="tabular-nums text-tsure-muted">{entry.startTime || '—'}</span>{' '}
              <span className="font-medium">{subjectLine || '—'}</span>{' '}
              <span className="tabular-nums whitespace-nowrap">{formatDuration(mins)}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}

function SubjectLegend({ subjects }) {
  if (!subjects.length) return null;

  return (
    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1.5 mt-3">
      {subjects.map((subject) => (
        <span key={subject} className="inline-flex items-center gap-1.5 text-xs text-tsure-muted">
          <span className={`w-2.5 h-2.5 rounded-full ${subjectBarColorClass(subject)}`} />
          {subject}
        </span>
      ))}
    </div>
  );
}

function intensityClass(value, maxValue) {
  if (!value || !maxValue) {
    return 'bg-[#b8a898] text-tsure-muted';
  }
  const ratio = value / maxValue;
  if (ratio >= 0.75) return 'bg-white text-tsure-primary';
  if (ratio >= 0.5) return 'bg-tsure-surface-hover text-tsure-primary';
  if (ratio >= 0.25) return 'bg-tsure-surface text-tsure-primary';
  return 'bg-tsure-border text-tsure-primary';
}

function isMobileViewport() {
  return typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;
}

function formatAchievementRate(actualMinutes, plannedMinutes) {
  if (!plannedMinutes) return null;
  return Math.min(Math.round((actualMinutes / plannedMinutes) * 100), 999);
}

function MonthLogDesktopCellContent({ dayNumber, value, entries, plannedMinutes = 0 }) {
  const achievementRate = formatAchievementRate(value, plannedMinutes);

  return (
    <>
      <div className="flex items-start justify-between gap-1 shrink-0">
        <span className="text-[11px] sm:text-xs font-bold tabular-nums leading-none">
          {dayNumber}
        </span>
        {achievementRate !== null ? (
          <span
            className={`text-[9px] sm:text-[10px] font-bold tabular-nums leading-none ${
              achievementRate >= 100 ? 'text-green-700' : 'text-tsure-accent'
            }`}
          >
            達成 {achievementRate}%
          </span>
        ) : value > 0 ? (
          <span className="text-[8px] sm:text-[9px] text-tsure-muted leading-none">計画なし</span>
        ) : null}
      </div>
      {value > 0 ? (
        <p className="text-sm sm:text-base font-extrabold text-tsure-primary tabular-nums leading-tight mt-1 shrink-0">
          {formatDuration(value)}
        </p>
      ) : (
        <p className="text-xs text-tsure-muted mt-1 shrink-0">記録なし</p>
      )}
      {plannedMinutes > 0 && (
        <p className="text-[8px] sm:text-[9px] text-tsure-muted tabular-nums leading-none mt-0.5 shrink-0">
          予定 {formatDuration(plannedMinutes)}
        </p>
      )}
      <CompactLogDayEntries entries={entries} />
    </>
  );
}

function MonthHeatmapCellContent({
  dayNumber,
  value,
  valueKey,
  unitLabel,
  subjectEntries,
  maxValue,
  plannedMinutes = 0,
  showBars = true,
}) {
  const barWidthPercent = relativeBarPercent(value, maxValue);
  const achievementRate = formatAchievementRate(value, plannedMinutes);

  return (
    <>
      <span className="text-[11px] sm:text-xs font-bold tabular-nums leading-none">
        {dayNumber}
      </span>
      {value > 0 && (
        <>
          <span className="text-[10px] sm:text-xs font-extrabold tabular-nums mt-0.5 leading-none">
            {valueKey === 'minutes' ? formatDuration(value) : `${value}${unitLabel}`}
          </span>
          {achievementRate !== null && (
            <span
              className={`text-[8px] font-bold tabular-nums mt-0.5 leading-none ${
                achievementRate >= 100 ? 'text-green-700' : 'text-tsure-accent'
              }`}
            >
              達成 {achievementRate}%
            </span>
          )}
          {showBars &&
            (subjectEntries.length > 0 ? (
              <div
                className="mt-1 flex h-1 rounded-full overflow-hidden bg-tsure-surface-hover"
                style={{ width: `${barWidthPercent}%` }}
              >
                {subjectEntries
                  .sort((a, b) => b[1] - a[1])
                  .map(([subject, mins]) => (
                    <div
                      key={subject}
                      className={subjectBarColorClass(subject)}
                      style={{ flexGrow: mins, flexBasis: 0, minWidth: mins > 0 ? 2 : 0 }}
                    />
                  ))}
              </div>
            ) : (
              <div
                className="mt-1 h-1 rounded-full bg-tsure-primary"
                style={{ width: `${barWidthPercent}%` }}
              />
            ))}
        </>
      )}
    </>
  );
}

function monthCellClassName(value, maxValue, showPlanDetails, showLogDetails, hasData) {
  const base =
    'aspect-square rounded-lg flex flex-col items-center justify-center text-center px-0.5 min-w-0';
  if (showPlanDetails) {
    if (!hasData) return `${base} bg-tsure-surface-hover text-tsure-muted`;
    return `${base} bg-white text-tsure-primary`;
  }
  if (showLogDetails) {
    if (!hasData) return `${base} bg-tsure-surface-hover text-tsure-muted`;
    return `${base} ${intensityClass(value, maxValue)}`;
  }
  return `${base} ${intensityClass(value, maxValue)}`;
}

function MonthCalendarDayCell({
  cell,
  valueKey,
  unitLabel,
  maxValue,
  showPlanDetails,
  showLogDetails,
  plannedMinutes = 0,
  onSelectDay,
}) {
  const value = cell[valueKey] || 0;
  const dayNumber = dayjs(cell.dateKey).date();
  const entries = cell.entries || [];
  const hasPlanEntries = showPlanDetails && entries.length > 0;
  const hasLogEntries = showLogDetails && entries.length > 0;
  const subjectEntries = Object.entries(cell.bySubject || {}).filter(([, mins]) => mins > 0);
  const hasData = value > 0 || entries.length > 0;
  const title = formatActivityTitle(
    dayjs(cell.dateKey).format('M/D'),
    value,
    valueKey,
    unitLabel,
    cell.bySubject
  );

  const cellClassName = monthCellClassName(
    value,
    maxValue,
    showPlanDetails,
    showLogDetails,
    hasData
  );

  const handleSelect = () => {
    if (!hasData || !isMobileViewport()) return;
    onSelectDay(cell);
  };

  if (hasPlanEntries) {
    return (
      <button
        type="button"
        className={`aspect-square rounded-lg min-w-0 overflow-hidden text-left transition active:scale-[0.97] md:active:scale-100 ${
          hasData ? 'cursor-pointer md:cursor-default' : 'cursor-default'
        }`}
        title={title}
        aria-label={`${dayNumber}日の計画を表示`}
        onClick={handleSelect}
        disabled={!hasData}
      >
        <span className={`md:hidden h-full w-full ${cellClassName}`}>
          <MonthHeatmapCellContent
            dayNumber={dayNumber}
            value={value}
            valueKey={valueKey}
            unitLabel={unitLabel}
            subjectEntries={subjectEntries}
            maxValue={maxValue}
          />
        </span>
        <span className="hidden md:flex h-full w-full flex-col bg-white text-tsure-primary px-1 py-1 min-w-0 overflow-hidden">
          <span className="text-[11px] sm:text-xs font-bold tabular-nums leading-none shrink-0">
            {dayNumber}
          </span>
          <CompactPlanDayEntries entries={entries} />
        </span>
      </button>
    );
  }

  if (hasLogEntries || (showLogDetails && hasData)) {
    return (
      <button
        type="button"
        className={`aspect-square rounded-lg min-w-0 overflow-hidden text-left transition active:scale-[0.97] md:active:scale-100 ${
          hasData ? 'cursor-pointer md:cursor-default' : 'cursor-default'
        }`}
        title={title}
        aria-label={`${dayNumber}日の記録を表示`}
        onClick={handleSelect}
        disabled={!hasData}
      >
        <span
          className={`md:hidden h-full w-full ${monthCellClassName(
            value,
            maxValue,
            false,
            false,
            hasData
          )}`}
        >
          <MonthHeatmapCellContent
            dayNumber={dayNumber}
            value={value}
            valueKey={valueKey}
            unitLabel={unitLabel}
            subjectEntries={subjectEntries}
            maxValue={maxValue}
            plannedMinutes={plannedMinutes}
            showBars={false}
          />
        </span>
        <span
          className={`hidden md:flex h-full w-full flex-col px-1 py-1 min-w-0 overflow-hidden ${intensityClass(
            value,
            maxValue
          )}`}
        >
          <MonthLogDesktopCellContent
            dayNumber={dayNumber}
            value={value}
            entries={entries}
            plannedMinutes={plannedMinutes}
          />
        </span>
      </button>
    );
  }

  if (hasData) {
    return (
      <button
        type="button"
        className={`${cellClassName} transition active:scale-[0.97] md:active:scale-100 cursor-pointer md:cursor-default`}
        title={title}
        aria-label={`${dayNumber}日の${showPlanDetails ? '計画' : '記録'}を表示`}
        onClick={handleSelect}
      >
        <MonthHeatmapCellContent
          dayNumber={dayNumber}
          value={value}
          valueKey={valueKey}
          unitLabel={unitLabel}
          subjectEntries={subjectEntries}
          maxValue={maxValue}
        />
      </button>
    );
  }

  return (
    <div className={cellClassName} title={title}>
      <MonthHeatmapCellContent
        dayNumber={dayNumber}
        value={value}
        valueKey={valueKey}
        unitLabel={unitLabel}
        subjectEntries={subjectEntries}
        maxValue={maxValue}
      />
    </div>
  );
}

function WeekStrip({ items, valueKey, unitLabel, contentVariant = 'none', planMinutesByDateKey = {} }) {
  const maxValue = Math.max(...items.map((item) => item[valueKey] || 0), 1);
  const isPlan = contentVariant === 'plan';
  const isLog = contentVariant === 'log';
  const showRichCells = isPlan || isLog;
  const legendSubjects = useMemo(() => {
    const set = new Set();
    items.forEach((item) => {
      Object.entries(item.bySubject || {}).forEach(([subject, mins]) => {
        if (mins > 0) set.add(subject);
      });
    });
    return Object.keys(SUBJECT_BAR_COLORS).filter((subject) => set.has(subject)).concat(
      [...set].filter((subject) => !SUBJECT_BAR_COLORS[subject])
    );
  }, [items]);

  return (
    <div>
      <div className="md:hidden space-y-2">
        {items.map((item) => (
          <PlanDayOverviewCard
            key={item.dateKey}
            item={item}
            valueKey={valueKey}
            unitLabel={unitLabel}
            maxValue={maxValue}
            showEntries={showRichCells}
            contentVariant={contentVariant}
            useHeatmap={!showRichCells}
          />
        ))}
      </div>

      <div className="hidden md:grid md:grid-cols-7 gap-2">
        {items.map((item) => {
          const value = item[valueKey] || 0;
          const hasSubjectBreakdown =
            item.bySubject && Object.values(item.bySubject).some((mins) => mins > 0);

          if (isLog) {
            const plannedMinutes = planMinutesByDateKey[item.dateKey] || 0;
            const achievementRate = formatAchievementRate(value, plannedMinutes);

            return (
              <div
                key={item.dateKey}
                className="flex flex-col items-stretch rounded-xl border border-tsure-border bg-white px-1.5 py-2 min-w-0 md:min-h-[22rem]"
              >
                <div className="text-center">
                  <span className="text-[10px] sm:text-xs text-tsure-muted">{item.weekday}</span>
                  <span className="block text-xs sm:text-sm font-bold text-tsure-primary tabular-nums">
                    {item.label}
                  </span>
                </div>
                <div className="mt-2 text-center shrink-0">
                  <p className="text-base sm:text-lg font-extrabold text-tsure-primary tabular-nums leading-tight">
                    {formatActivityValue(value, valueKey, unitLabel)}
                  </p>
                  {achievementRate !== null ? (
                    <p
                      className={`text-[10px] sm:text-xs font-bold tabular-nums mt-0.5 ${
                        achievementRate >= 100 ? 'text-green-700' : 'text-tsure-accent'
                      }`}
                    >
                      達成 {achievementRate}%
                    </p>
                  ) : value > 0 ? (
                    <p className="text-[10px] text-tsure-muted mt-0.5">計画なし</p>
                  ) : null}
                  {plannedMinutes > 0 && (
                    <p className="text-[10px] text-tsure-muted tabular-nums mt-0.5">
                      予定 {formatDuration(plannedMinutes)}
                    </p>
                  )}
                </div>
                <LogDayEntries entries={item.entries} className="max-h-60 flex-1 min-h-0 mt-2" />
              </div>
            );
          }

          return (
            <div
              key={item.dateKey}
              className={`flex flex-col items-stretch rounded-xl border border-tsure-border px-1.5 py-2 min-w-0 ${
                isPlan ? 'bg-white md:min-h-[22rem]' : intensityClass(value, maxValue)
              }`}
            >
              <div className="text-center">
                <span className="text-[10px] sm:text-xs text-tsure-muted">{item.weekday}</span>
                <span className="block text-xs sm:text-sm font-bold text-tsure-primary tabular-nums">
                  {item.label}
                </span>
              </div>
              <div className="mt-2 h-32 w-full flex items-end justify-center shrink-0">
                {hasSubjectBreakdown ? (
                  <SubjectStackedBar
                    bySubject={item.bySubject}
                    totalMinutes={value}
                    maxMinutes={maxValue}
                    dateLabel={item.label}
                    valueKey={valueKey}
                    unitLabel={unitLabel}
                    maxBarHeight={WEEK_DESKTOP_BAR_MAX_HEIGHT}
                  />
                ) : (
                  <div
                    className={`w-6 rounded-md transition-all ${
                      value > 0 ? 'bg-tsure-primary' : 'bg-tsure-surface-hover'
                    }`}
                    style={{
                      height: `${value > 0 ? relativeBarHeight(value, maxValue, WEEK_DESKTOP_BAR_MAX_HEIGHT) : 6}px`,
                    }}
                    title={formatActivityTitle(item.label, value, valueKey, unitLabel)}
                  />
                )}
              </div>
              <span className="mt-1.5 text-[11px] sm:text-xs font-semibold text-tsure-primary tabular-nums text-center leading-tight shrink-0">
                {formatActivityValue(value, valueKey, unitLabel)}
              </span>
              {isPlan && (
                <PlanDayEntries entries={item.entries} className="max-h-60 flex-1 min-h-0" />
              )}
            </div>
          );
        })}
      </div>
      {(isPlan || isLog) && <SubjectLegend subjects={legendSubjects} />}
    </div>
  );
}

function MonthCalendar({ items, valueKey, unitLabel, contentVariant = 'none', planDailyOverview = [] }) {
  const [selectedDay, setSelectedDay] = useState(null);
  const overviewByDateKey = useMemo(
    () => Object.fromEntries(items.map((item) => [item.dateKey, item])),
    [items]
  );
  const planMinutesByDateKey = useMemo(
    () =>
      Object.fromEntries(
        planDailyOverview.map((item) => [item.dateKey, item.minutes || 0])
      ),
    [planDailyOverview]
  );
  const dateKeys = items.map((item) => item.dateKey);
  const cells = buildMonthCalendarCells(dateKeys, overviewByDateKey);
  const maxValue = Math.max(...items.map((item) => item[valueKey] || 0), 1);
  const monthLabel = dateKeys.length ? dayjs(dateKeys[0]).format('YYYY年M月') : '';
  const showPlanDetails = contentVariant === 'plan';
  const showLogDetails = contentVariant === 'log';
  const detailType = showPlanDetails ? 'plan' : 'log';
  const selectedItem = selectedDay ? overviewByDateKey[selectedDay] : null;
  const legendSubjects = useMemo(() => {
    if (!showPlanDetails && !showLogDetails) return [];
    const set = new Set();
    items.forEach((item) => {
      Object.entries(item.bySubject || {}).forEach(([subject, mins]) => {
        if (mins > 0) set.add(subject);
      });
    });
    return Object.keys(SUBJECT_BAR_COLORS).filter((subject) => set.has(subject)).concat(
      [...set].filter((subject) => !SUBJECT_BAR_COLORS[subject])
    );
  }, [items, showPlanDetails, showLogDetails]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-1 mb-1">
        {DAY_LABELS.map((label) => (
          <div
            key={label}
            className="text-center text-[11px] font-semibold text-tsure-muted py-1"
          >
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-1">
        {cells.map((cell, index) => {
          if (!cell) {
            return <div key={`empty-${index}`} className="aspect-square" aria-hidden />;
          }

          return (
            <MonthCalendarDayCell
              key={cell.dateKey}
              cell={cell}
              valueKey={valueKey}
              unitLabel={unitLabel}
              maxValue={maxValue}
              showPlanDetails={showPlanDetails}
              showLogDetails={showLogDetails}
              plannedMinutes={planMinutesByDateKey[cell.dateKey] || 0}
              onSelectDay={(day) => setSelectedDay(day.dateKey)}
            />
          );
        })}
      </div>
      <p className="mt-2 text-xs text-tsure-muted text-center md:hidden">
        日付をタップして{showPlanDetails ? '計画' : '記録'}の詳細を表示
      </p>
      {showPlanDetails ? (
        <>
          <SubjectLegend subjects={legendSubjects} />
          <p className="mt-2 text-xs text-tsure-muted text-center">{monthLabel} · 予定のある日は白背景</p>
        </>
      ) : showLogDetails ? (
        <>
          <SubjectLegend subjects={legendSubjects} />
          <p className="mt-2 text-xs text-tsure-muted text-center hidden md:block">
            {monthLabel} · 薄いほど多い · 各日の学習内容を表示
          </p>
          <p className="mt-2 text-xs text-tsure-muted text-center md:hidden">
            {monthLabel} · 薄いほど多い
          </p>
        </>
      ) : (
        <p className="mt-2 text-xs text-tsure-muted text-center">{monthLabel} · 薄いほど多い</p>
      )}

      <StudyPeriodDayDetailModal
        open={Boolean(selectedDay)}
        onClose={() => setSelectedDay(null)}
        dateKey={selectedDay}
        type={detailType}
        totalMinutes={selectedItem?.minutes || 0}
        entries={selectedItem?.entries || []}
      />
    </div>
  );
}

export default function StudyPeriodActivityOverview({
  items = [],
  periodMode,
  valueKey = 'minutes',
  unitLabel = '分',
  title,
  onDark = false,
  contentVariant = 'none',
  planDailyOverview = [],
}) {
  if (!items.length) return null;

  return (
    <section>
      <SubSectionTitle onDark={onDark}>{title}</SubSectionTitle>
      {periodMode === 'week' ? (
        <WeekStrip
          items={items}
          valueKey={valueKey}
          unitLabel={unitLabel}
          contentVariant={contentVariant}
          planMinutesByDateKey={Object.fromEntries(
            planDailyOverview.map((item) => [item.dateKey, item.minutes || 0])
          )}
        />
      ) : (
        <MonthCalendar
          items={items}
          valueKey={valueKey}
          unitLabel={unitLabel}
          contentVariant={contentVariant}
          planDailyOverview={planDailyOverview}
        />
      )}
    </section>
  );
}
