import React, { useEffect, useState } from 'react';
import {
    PieChart,
    Pie,
    Cell,
    Tooltip,
    ResponsiveContainer,
    Label
} from 'recharts';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import dayjs from 'dayjs';

const subjectColors = {
    国語: '#db2777',
    数学: '#2563eb',
    英語: '#7c3aed',
    理科: '#16a34a',
    社会: '#ca8a04',
    情報: '#4f46e5',
    その他: '#6b7280',
};

export default function DailySubjectPieChart() {
    const [data, setData] = useState([]);
    const [totalMinutes, setTotalMinutes] = useState(0);

    useEffect(() => {
        const user = auth.currentUser;
        if (!user?.email) return;

        const today = dayjs().format('YYYY-MM-DD');

        const fetchData = async () => {
            const userDocRef = doc(db, 'studyPomodoroLogs', user.email);
            const docSnap = await getDoc(userDocRef);

            if (!docSnap.exists()) return;

            const allData = docSnap.data();
            const todayLogs = allData[today];
            if (!Array.isArray(todayLogs)) return;

            const summary = {};
            let total = 0;

            todayLogs.forEach(log => {
                const duration = log.duration;
                if (duration == null) return;

                const key = log.topic || '未分類';
                const subject = log.subject || 'その他';

                if (!summary[key]) {
                    summary[key] = {
                        name: key,
                        subject,
                        value: 0,
                    };
                }

                summary[key].value += duration;
                total += duration;
            });

            setData(Object.values(summary));
            setTotalMinutes(total);
        };

        fetchData();
    }, []);

    const formatTotalTime = (total) => {
        const h = Math.floor(total / 60);
        const m = total % 60;
        return h > 0 ? `${h}時間${m}分` : `${m}分`;
    };

    // 🔸カスタム中央ラベル
    const renderCenterLabel = ({ viewBox }) => {
        const { cx, cy } = viewBox;
        return (
            <text
                x={cx}
                y={cy - 20} // 中央より20px上にずらす
                textAnchor="middle"
                dominantBaseline="middle"
                fill="#ede3d2"
                fontSize={14}
                fontWeight="bold"
            >
                合計 {formatTotalTime(totalMinutes)}
            </text>
        );
    };

    return (
        <div className="w-full h-full flex flex-col justify-center items-center text-[#927b65]">
            <h2 className="text-lg font-bold text-[#6b4a2b] mb-2">本日の科目別学習時間</h2>

            {data.length === 0 || data.every(d => d.value === 0) ? (
                <p className="text-sm text-gray-500">記録がありません</p>
            ) : (
                <ResponsiveContainer width="100%" height={220}>
                    <PieChart>
                        {/* 円グラフ */}
                        <Pie
                            data={data.filter(entry => entry.value > 0)}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={80}
                            label={({ name }) => name}
                            labelLine={false}
                        >
                            {data
                                .filter(entry => entry.value > 0)
                                .map((entry, index) => (
                                    <Cell
                                        key={`cell-${index}`}
                                        fill={subjectColors[entry.subject] || subjectColors.その他}
                                    />
                                ))}
                        </Pie>

                        <Tooltip formatter={(value, name) => [`${value}分`, `${name}`]} />

                        {/* 合計時間を中央表示 */}
                        <text
                            x="50%"
                            y="40%"
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#ede3d2"
                            fontSize={14}
                            fontWeight="bold"
                        >
                            合計 {formatTotalTime(totalMinutes)}
                        </text>
                    </PieChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}