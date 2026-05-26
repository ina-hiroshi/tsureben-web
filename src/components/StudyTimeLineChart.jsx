import { useEffect, useMemo, useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  ReferenceLine,
  Cell,
} from 'recharts';
import dayjs from 'dayjs';
import { getDayRange } from '../services/firestore/logService';
import Button from './ui/Button';
import SectionTitle from './ui/SectionTitle';

const DAY_LABELS = ['日', '月', '火', '水', '木', '金', '土'];
const MODE_DAYS = { weekly: 7, monthly: 30, sixty: 60 };
const CHART_ACCENT = '#ffa726';
const CHART_BAR = '#c4b5a0';
const CHART_GRID = '#c4b5a0';
const CHART_TEXT = '#5a3e28';
const CHART_AVG = '#8f735a';

function formatDuration(totalMinutes) {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h > 0) return `${h}時間${m}分`;
  return `${m}分`;
}

function formatYAxisMinutes(value) {
  if (value >= 60) {
    const h = value / 60;
    return Number.isInteger(h) ? `${h}h` : `${h.toFixed(1)}h`;
  }
  return `${value}分`;
}

function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;
  const { label, minutes, weekday } = payload[0].payload;
  return (
    <div className="rounded-lg border border-tsure-border bg-tsure-surface px-3 py-2 shadow-tsure-chip text-sm">
      <p className="font-semibold text-tsure-primary">
        {label} {weekday}
      </p>
      <p className="text-tsure-muted tabular-nums">{formatDuration(minutes)}</p>
    </div>
  );
}

export default function StudyTimeLineChart({ email, refreshKey = 0 }) {
  const [chartData, setChartData] = useState([]);
  const [mode, setMode] = useState('weekly');

  useEffect(() => {
    if (!email) return;

    const days = MODE_DAYS[mode] ?? 7;
    const today = dayjs();
    const start = today.subtract(days - 1, 'day').format('YYYY-MM-DD');
    const end = today.format('YYYY-MM-DD');

    getDayRange(email, start, end).then((range) => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = today.subtract(i, 'day');
        const key = d.format('YYYY-MM-DD');
        const minutes = range[key]?.totalMinutes || 0;
        result.push({
          dateKey: key,
          label: d.format('M/D'),
          weekday: DAY_LABELS[d.day()],
          minutes,
          isToday: i === 0,
        });
      }
      setChartData(result);
    });
  }, [email, mode, refreshKey]);

  const { totalMinutes, averageMinutes, hasData } = useMemo(() => {
    const total = chartData.reduce((sum, d) => sum + d.minutes, 0);
    const avg = chartData.length ? Math.round(total / chartData.length) : 0;
    return {
      totalMinutes: total,
      averageMinutes: avg,
      hasData: total > 0,
    };
  }, [chartData]);

  const xInterval =
    mode === 'weekly' ? 0 : Math.max(0, Math.floor(chartData.length / (mode === 'sixty' ? 8 : 6)) - 1);
  const maxBarSize = mode === 'weekly' ? 28 : mode === 'monthly' ? 12 : 6;

  return (
    <div className="w-full">
      <SectionTitle
        action={
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant={mode === 'weekly' ? 'primary' : 'secondary'}
              onClick={() => setMode('weekly')}
            >
              7日
            </Button>
            <Button
              size="sm"
              variant={mode === 'monthly' ? 'primary' : 'secondary'}
              onClick={() => setMode('monthly')}
            >
              30日
            </Button>
            <Button
              size="sm"
              variant={mode === 'sixty' ? 'primary' : 'secondary'}
              onClick={() => setMode('sixty')}
            >
              60日
            </Button>
          </div>
        }
      >
        学習時間の推移
      </SectionTitle>

      <div className="mb-4 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-tsure-border bg-tsure-surface-hover/60 px-3 py-2">
          <p className="text-xs text-tsure-muted mb-0.5">期間合計</p>
          <p className="text-base font-bold text-tsure-primary tabular-nums">
            {formatDuration(totalMinutes)}
          </p>
        </div>
        <div className="rounded-xl border border-tsure-border bg-tsure-surface-hover/60 px-3 py-2">
          <p className="text-xs text-tsure-muted mb-0.5">1日あたり平均</p>
          <p className="text-base font-bold text-tsure-primary tabular-nums">
            {formatDuration(averageMinutes)}
          </p>
        </div>
      </div>

      {!hasData ? (
        <p className="text-sm text-tsure-muted text-center py-10">
          この期間の学習記録がありません
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={mode === 'weekly' ? 200 : 220}>
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: 0, bottom: 0 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke={CHART_GRID}
                vertical={false}
                opacity={0.5}
              />
              <XAxis
                dataKey="label"
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                interval={xInterval}
                tickFormatter={(value) => {
                  const item = chartData.find((d) => d.label === value);
                  if (mode === 'weekly' && item) return `${value}\n${item.weekday}`;
                  return value;
                }}
              />
              <YAxis
                tick={{ fill: CHART_TEXT, fontSize: 11 }}
                tickFormatter={formatYAxisMinutes}
                width={40}
                allowDecimals={false}
              />
              <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(90, 62, 40, 0.06)' }} />
              {averageMinutes > 0 && (
                <ReferenceLine
                  y={averageMinutes}
                  stroke={CHART_AVG}
                  strokeDasharray="4 4"
                  label={{
                    value: '平均',
                    position: 'insideTopRight',
                    fill: CHART_AVG,
                    fontSize: 11,
                  }}
                />
              )}
              <Bar dataKey="minutes" radius={[4, 4, 0, 0]} maxBarSize={maxBarSize}>
                {chartData.map((entry) => (
                  <Cell
                    key={entry.dateKey}
                    fill={entry.isToday ? CHART_ACCENT : CHART_BAR}
                    stroke={entry.isToday ? CHART_ACCENT : 'transparent'}
                    strokeWidth={entry.isToday ? 2 : 0}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="mt-2 text-center text-xs text-tsure-muted">
            <span className="inline-block w-2.5 h-2.5 rounded-sm bg-tsure-accent align-middle mr-1" />
            オレンジが今日 · 点線は期間の1日平均
          </p>
        </>
      )}
    </div>
  );
}
