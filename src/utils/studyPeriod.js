import dayjs from 'dayjs';

export const PERIOD_MODES = ['day', 'week', 'month'];

export const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];

export function getWeekStart(anchor) {
  const d = dayjs(anchor);
  const day = d.day();
  const diff = day === 0 ? 6 : day - 1;
  return d.subtract(diff, 'day').startOf('day');
}

export function getPeriodBounds(anchorDate, mode) {
  const anchor = dayjs(anchorDate);

  if (mode === 'day') {
    const key = anchor.format('YYYY-MM-DD');
    return {
      startDate: key,
      endDate: key,
      start: anchor.startOf('day'),
      end: anchor.startOf('day'),
    };
  }

  if (mode === 'week') {
    const start = getWeekStart(anchor);
    const end = start.add(6, 'day');
    return {
      startDate: start.format('YYYY-MM-DD'),
      endDate: end.format('YYYY-MM-DD'),
      start,
      end,
    };
  }

  const start = anchor.startOf('month');
  const end = anchor.endOf('month');
  return {
    startDate: start.format('YYYY-MM-DD'),
    endDate: end.format('YYYY-MM-DD'),
    start,
    end,
  };
}

export function formatPeriodLabel(anchorDate, mode) {
  const anchor = dayjs(anchorDate);

  if (mode === 'day') {
    return `${anchor.format('M月D日')}(${DAY_LABELS[anchor.day()]})`;
  }

  if (mode === 'week') {
    const { start, end } = getPeriodBounds(anchor, 'week');
    return `${start.format('M/D')}〜${end.format('M/D')}`;
  }

  return anchor.format('YYYY年M月');
}

export function shiftPeriodAnchor(anchorDate, mode, direction) {
  const anchor = dayjs(anchorDate);
  if (mode === 'day') return anchor.add(direction, 'day');
  if (mode === 'week') return anchor.add(direction * 7, 'day');
  return anchor.add(direction, 'month');
}

export function getPeriodNavLabels(mode) {
  if (mode === 'day') return { previous: '前の日', next: '次の日' };
  if (mode === 'week') return { previous: '前の週', next: '次の週' };
  return { previous: '前の月', next: '次の月' };
}

export function getReturnToCurrentPeriodLabel(mode) {
  if (mode === 'day') return '今日に戻る';
  if (mode === 'week') return '今週に戻る';
  return '今月に戻る';
}

export function isCurrentPeriod(anchorDate, mode, today = dayjs()) {
  const anchor = dayjs(anchorDate);
  const now = dayjs(today).startOf('day');

  if (mode === 'day') {
    return anchor.isSame(now, 'day');
  }

  if (mode === 'week') {
    return getWeekStart(anchor).isSame(getWeekStart(now), 'day');
  }

  return anchor.isSame(now, 'month');
}

export function getCurrentPeriodAnchor(today = dayjs()) {
  return dayjs(today).startOf('day');
}

export function enumerateDateKeys(startDate, endDate) {
  const keys = [];
  let current = dayjs(startDate);
  const end = dayjs(endDate);
  while (current.isBefore(end, 'day') || current.isSame(end, 'day')) {
    keys.push(current.format('YYYY-MM-DD'));
    current = current.add(1, 'day');
  }
  return keys;
}

export function formatDayHeading(dateKey) {
  const d = dayjs(dateKey);
  return `${d.format('M月D日')}(${DAY_LABELS[d.day()]})`;
}

export function aggregateLogsFromRange(logsByDay, dateKeys) {
  const entries = [];
  const bySubject = {};
  let totalMinutes = 0;
  let studyDayCount = 0;

  for (const dateKey of dateKeys) {
    const day = logsByDay[dateKey] || { entries: [], totalMinutes: 0, bySubject: {} };
    if ((day.totalMinutes || 0) > 0) studyDayCount += 1;

    for (const entry of day.entries || []) {
      entries.push({ ...entry, dateKey });
    }

    totalMinutes += day.totalMinutes || 0;
    for (const [subject, mins] of Object.entries(day.bySubject || {})) {
      bySubject[subject] = (bySubject[subject] || 0) + mins;
    }
  }

  entries.sort((a, b) => {
    const dateCmp = (a.dateKey || '').localeCompare(b.dateKey || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.startTime || '').localeCompare(b.startTime || '');
  });

  return { entries, totalMinutes, bySubject, studyDayCount };
}

export function buildDailyTotals(logsByDay, dateKeys) {
  return dateKeys.map((dateKey) => {
    const d = dayjs(dateKey);
    const day = logsByDay[dateKey] || { totalMinutes: 0, bySubject: {}, entries: [] };
    return {
      dateKey,
      label: d.format('M/D'),
      weekday: DAY_LABELS[d.day()],
      minutes: day.totalMinutes || 0,
      bySubject: day.bySubject || {},
      entries: day.entries || [],
    };
  });
}

export function buildPlanGroups(plansByDay, dateKeys) {
  return dateKeys
    .map((dateKey) => ({
      dateKey,
      heading: formatDayHeading(dateKey),
      entries: plansByDay[dateKey] || [],
    }))
    .filter((group) => group.entries.length > 0);
}

export function formatDayShort(dateKey) {
  const d = dayjs(dateKey);
  return d.format('M/D');
}

function planDurationMinutes(start, end) {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  return Math.max(0, eh * 60 + em - (sh * 60 + sm));
}

export function aggregatePlansFromRange(plansByDay, dateKeys) {
  const entries = [];
  const bySubject = {};
  let planDayCount = 0;
  let totalPlannedMinutes = 0;

  for (const dateKey of dateKeys) {
    const dayEntries = plansByDay[dateKey] || [];
    if (dayEntries.length) planDayCount += 1;

    for (const entry of dayEntries) {
      const plannedMinutes = planDurationMinutes(entry.start, entry.end);
      totalPlannedMinutes += plannedMinutes;
      entries.push({ ...entry, dateKey, plannedMinutes });

      const subject = entry.subject || 'その他';
      if (!bySubject[subject]) bySubject[subject] = { count: 0, minutes: 0 };
      bySubject[subject].count += 1;
      bySubject[subject].minutes += plannedMinutes;
    }
  }

  entries.sort((a, b) => {
    const dateCmp = (a.dateKey || '').localeCompare(b.dateKey || '');
    if (dateCmp !== 0) return dateCmp;
    return (a.start || '').localeCompare(b.start || '');
  });

  return {
    entries,
    totalCount: entries.length,
    planDayCount,
    totalPlannedMinutes,
    bySubject,
  };
}

export function buildPlanDailyOverview(plansByDay, dateKeys) {
  return dateKeys.map((dateKey) => {
    const d = dayjs(dateKey);
    const entries = plansByDay[dateKey] || [];
    const bySubject = {};
    let minutes = 0;

    for (const entry of entries) {
      const plannedMinutes = planDurationMinutes(entry.start, entry.end);
      minutes += plannedMinutes;
      const subject = entry.subject || 'その他';
      bySubject[subject] = (bySubject[subject] || 0) + plannedMinutes;
    }

    return {
      dateKey,
      label: d.format('M/D'),
      weekday: DAY_LABELS[d.day()],
      dayOfMonth: d.date(),
      count: entries.length,
      minutes,
      bySubject,
      entries: entries.map((entry) => ({
        ...entry,
        plannedMinutes: planDurationMinutes(entry.start, entry.end),
      })),
    };
  });
}

export function buildMonthCalendarCells(dateKeys, overviewByDateKey) {
  if (!dateKeys.length) return [];

  const first = dayjs(dateKeys[0]);
  const startOffset = (first.day() + 6) % 7;
  const cells = [];

  for (let i = 0; i < startOffset; i += 1) {
    cells.push(null);
  }

  for (const dateKey of dateKeys) {
    cells.push(
      overviewByDateKey[dateKey] || {
        dateKey,
        count: 0,
        minutes: 0,
        bySubject: {},
        entries: [],
      }
    );
  }

  return cells;
}

export function buildLogGroups(logsByDay, dateKeys) {
  return dateKeys
    .map((dateKey) => ({
      dateKey,
      heading: formatDayHeading(dateKey),
      entries: logsByDay[dateKey]?.entries || [],
    }))
    .filter((group) => group.entries.length > 0);
}

export function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}
