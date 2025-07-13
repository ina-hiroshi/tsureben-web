import React, { useEffect, useState } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import dayjs from 'dayjs';

export default function StudyTimeLineChart() {
    const [chartData, setChartData] = useState([]);
    const [mode, setMode] = useState('weekly'); // 'weekly' or 'monthly'

    // ✅ 簡潔な時分表示（例: 1h30m, 45m）
    const formatMinutesToShortTime = (min) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        if (h > 0 && m > 0) return `${h}h${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    useEffect(() => {
        const user = auth.currentUser;
        if (!user?.email) return;

        const fetchData = async () => {
            const docRef = doc(db, 'studyPomodoroLogs', user.email);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) return;

            const allLogs = docSnap.data();
            const today = dayjs();

            const days = mode === 'weekly' ? 7 : 30;
            const dates = [];

            for (let i = days - 1; i >= 0; i--) {
                const d = today.subtract(i, 'day');
                const key = d.format('YYYY-MM-DD');
                const display = d.format('M/D');
                dates.push({ key, display });
            }

            const result = dates.map(({ key, display }) => {
                const logs = allLogs[key];
                const total = Array.isArray(logs)
                    ? logs.reduce((sum, log) => sum + (log.duration || 0), 0)
                    : 0;
                return {
                    date: display,
                    minutes: total,
                };
            });

            setChartData(result);
        };

        fetchData();
    }, [mode]);

    return (
        <div className="w-full h-full flex flex-col items-center text-[#927b65]">
            <div className="mb-2 flex gap-2">
                <button
                    onClick={() => setMode('weekly')}
                    className={`px-3 py-1 rounded-full text-sm font-semibold border ${mode === 'weekly'
                        ? 'bg-[#6b4a2b] text-white'
                        : 'bg-white text-[#6b4a2b]'
                        }`}
                >
                    1週間
                </button>
                <button
                    onClick={() => setMode('monthly')}
                    className={`px-3 py-1 rounded-full text-sm font-semibold border ${mode === 'monthly'
                        ? 'bg-[#6b4a2b] text-white'
                        : 'bg-white text-[#6b4a2b]'
                        }`}
                >
                    1ヶ月
                </button>
            </div>

            <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData} margin={{ top: 20, right: 20, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="date" />
                    <YAxis
                        tickFormatter={formatMinutesToShortTime}
                        domain={[0, (dataMax) => Math.ceil(dataMax / 30) * 30]}
                    />
                    <Tooltip
                        formatter={(value) => [formatMinutesToShortTime(value), '学習時間']}
                        labelFormatter={(label) => `日付: ${label}`}
                    />
                    <Line
                        type="monotone"
                        dataKey="minutes"
                        stroke="#6b4a2b"
                        strokeWidth={3}
                        dot={{ r: 3 }}
                        activeDot={{ r: 5 }}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}