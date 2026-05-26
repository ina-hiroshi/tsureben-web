import { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';
import { getDayLogs } from '../services/firestore/logService';

const SUBJECT_COLORS = {
  国語: '#db2777',
  数学: '#2563eb',
  英語: '#7c3aed',
  理科: '#16a34a',
  社会: '#ca8a04',
  情報: '#4f46e5',
  その他: '#6b7280',
};

export default function DailySubjectPieChart({ email, dateKey }) {
  const [data, setData] = useState([]);
  const [totalMinutes, setTotalMinutes] = useState(0);

  useEffect(() => {
    if (!email || !dateKey) return;
    getDayLogs(email, dateKey).then((logs) => {
      const bySubject = logs.bySubject || {};
      const chartData = Object.entries(bySubject).map(([name, value]) => ({
        name,
        value,
        subject: name,
      }));
      setData(chartData);
      setTotalMinutes(logs.totalMinutes || 0);
    });
  }, [email, dateKey]);

  const formatTotalTime = (total) => {
    const h = Math.floor(total / 60);
    const m = total % 60;
    return h > 0 ? `${h}時間${m}分` : `${m}分`;
  };

  if (!data.length) {
    return <p className="text-sm text-tsure-muted text-center py-6">データがありません</p>;
  }

  return (
    <div className="w-full">
      <p className="text-sm font-semibold text-tsure-primary mb-2">教科別（{formatTotalTime(totalMinutes)}）</p>
      <ResponsiveContainer width="100%" height={220}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label>
            {data.map((entry) => (
              <Cell key={entry.name} fill={SUBJECT_COLORS[entry.subject] || SUBJECT_COLORS['その他']} />
            ))}
          </Pie>
          <Tooltip formatter={(v) => `${v}分`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
