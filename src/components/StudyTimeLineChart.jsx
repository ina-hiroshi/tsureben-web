import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
} from 'recharts';
import dayjs from 'dayjs';
import { getDayRange } from '../services/firestore/logService';
import Button from './ui/Button';

export default function StudyTimeLineChart({ email }) {
  const [chartData, setChartData] = useState([]);
  const [mode, setMode] = useState('weekly');

  useEffect(() => {
    if (!email) return;

    const days = mode === 'weekly' ? 7 : 30;
    const today = dayjs();
    const start = today.subtract(days - 1, 'day').format('YYYY-MM-DD');
    const end = today.format('YYYY-MM-DD');

    getDayRange(email, start, end).then((range) => {
      const result = [];
      for (let i = days - 1; i >= 0; i--) {
        const d = today.subtract(i, 'day');
        const key = d.format('YYYY-MM-DD');
        result.push({
          date: d.format('M/D'),
          minutes: range[key]?.totalMinutes || 0,
        });
      }
      setChartData(result);
    });
  }, [email, mode]);

  return (
    <div className="w-full">
      <div className="mb-3 flex gap-2">
        <Button
          size="sm"
          variant={mode === 'weekly' ? 'primary' : 'secondary'}
          onClick={() => setMode('weekly')}
        >
          1週間
        </Button>
        <Button
          size="sm"
          variant={mode === 'monthly' ? 'primary' : 'secondary'}
          onClick={() => setMode('monthly')}
        >
          1ヶ月
        </Button>
      </div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--tsure-border, #c4b5a0)" />
          <XAxis dataKey="date" tick={{ fill: '#5a3e28', fontSize: 12 }} />
          <YAxis tick={{ fill: '#5a3e28', fontSize: 12 }} />
          <Tooltip formatter={(v) => `${v}分`} />
          <Line type="monotone" dataKey="minutes" stroke="#ffa726" strokeWidth={2} dot={{ r: 3 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
