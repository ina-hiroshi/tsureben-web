import React, { useEffect, useState } from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    ResponsiveContainer,
    CartesianGrid,
} from 'recharts';
import { doc, getDoc } from 'firebase/firestore';
import { db, auth } from '../firebase';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { FaChevronLeft, FaChevronRight, FaCalendarDay } from 'react-icons/fa';
dayjs.extend(isBetween);

const subjectColors = {
    国語: '#db2777',
    数学: '#2563eb',
    英語: '#7c3aed',
    理科: '#16a34a',
    社会: '#ca8a04',
    情報: '#4f46e5',
    その他: '#6b7280',
};

export default function StudyStackedBarChart({ userEmail }) {
    const [chartData, setChartData] = useState([]);
    const [currentDate, setCurrentDate] = useState(dayjs().startOf('week'));
    const [selectedSubjects, setSelectedSubjects] = useState(Object.keys(subjectColors));
    const [topicSubjectMap, setTopicSubjectMap] = useState({});
    const [viewMode, setViewMode] = useState('week'); // 'week' or 'month'

    useEffect(() => {
        if (!userEmail) return;
        // userEmail をキーに Firestore から studyPomodoroLogs を取得
    }, [userEmail]);

    const fetchData = async () => {
        if (!userEmail) {
            console.warn("userEmailが未設定のためfetch中止");
            return;
        }

        try {
            const docRef = doc(db, 'studyPomodoroLogs', userEmail);
            const docSnap = await getDoc(docRef);
            if (!docSnap.exists()) {
                console.warn("ログなし:", userEmail);
                setChartData([]);
                setTopicSubjectMap({});
                return;
            }

            const allLogs = docSnap.data();
            const dataPerDay = [];
            const newTopicSubjectMap = {};
            const range = viewMode === 'week' ? 7 : currentDate.daysInMonth();
            const start = viewMode === 'week' ? currentDate.startOf('week') : currentDate.startOf('month');

            for (let i = 0; i < range; i++) {
                const date = start.add(i, 'day');
                const key = date.format('YYYY-MM-DD');
                const display = date.format('M/D');
                const logs = allLogs[key] || [];

                const daySummary = { date: display };
                logs.forEach(log => {
                    const topic = log.topic || '未分類';
                    const subject = log.subject || 'その他';
                    newTopicSubjectMap[topic] = subject;
                    if (!daySummary[topic]) daySummary[topic] = 0;
                    daySummary[topic] += log.duration || 0;
                });

                dataPerDay.push(daySummary);
            }

            setChartData(dataPerDay);
            setTopicSubjectMap(newTopicSubjectMap);
        } catch (error) {
            console.error("❌ 学習ログ取得エラー:", error);
            setChartData([]);
            setTopicSubjectMap({});
        }
    };

    useEffect(() => {
        fetchData();
    }, [currentDate, viewMode, userEmail]);

    const toggleSubject = (subject) => {
        setSelectedSubjects(prev =>
            prev.includes(subject)
                ? prev.filter(s => s !== subject)
                : [...prev, subject]
        );
    };

    const getTopicsBySelectedSubjects = () => {
        const topicSet = new Set();
        chartData.forEach(day => {
            Object.keys(day).forEach(key => {
                if (key === 'date') return;
                const subject = topicSubjectMap[key] || 'その他';
                if (selectedSubjects.includes(subject)) {
                    topicSet.add(key);
                }
            });
        });
        return Array.from(topicSet);
    };

    const formatMinutesToShortTime = (min) => {
        const h = Math.floor(min / 60);
        const m = min % 60;
        if (h > 0 && m > 0) return `${h}h${m}m`;
        if (h > 0) return `${h}h`;
        return `${m}m`;
    };

    const topics = getTopicsBySelectedSubjects();

    const handlePrev = () => {
        setCurrentDate(prev => viewMode === 'week' ? prev.subtract(7, 'day') : prev.subtract(1, 'month'));
    };

    const handleToday = () => {
        setCurrentDate(viewMode === 'week' ? dayjs().startOf('week') : dayjs().startOf('month'));
    };

    const handleNext = () => {
        setCurrentDate(prev => viewMode === 'week' ? prev.add(7, 'day') : prev.add(1, 'month'));
    };

    const CustomLegend = ({ selectedSubjects }) => {
        return (
            <ul className="flex justify-center flex-wrap gap-4 px-4 py-2 list-none m-0">
                {selectedSubjects.map(subject => (
                    <li key={subject} className="flex items-center gap-2 text-sm text-[#6b4a2b]">
                        <span
                            className="inline-block w-4 h-4 rounded"
                            style={{ backgroundColor: subjectColors[subject] || subjectColors.その他 }}
                        />
                        {subject}
                    </li>
                ))}
            </ul>
        );
    };

    return (
        <div className="w-full h-full text-[#927b65]">
            <div className="flex justify-center flex-wrap gap-2 sm:gap-3 mb-4">
                <button
                    onClick={handlePrev}
                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                >
                    <FaChevronLeft className="w-4 h-4" /> 前の{viewMode === 'week' ? '週' : '月'}
                </button>
                <button
                    onClick={handleToday}
                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                >
                    <FaCalendarDay className="w-4 h-4" /> 今{viewMode === 'week' ? '週' : '月'}
                </button>
                <button
                    onClick={handleNext}
                    className="flex items-center gap-1 px-3 py-1 bg-[#dac7b4] text-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition text-sm sm:text-base"
                >
                    次の{viewMode === 'week' ? '週' : '月'} <FaChevronRight className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setViewMode(prev => prev === 'week' ? 'month' : 'week')}
                    className="px-3 py-1 text-sm sm:text-base text-[#6b4a2b] border border-[#6b4a2b] rounded hover:bg-[#e6d7c5] transition"
                >
                    {viewMode === 'week' ? '月間表示に切替' : '週間表示に切替'}
                </button>
            </div>

            <div className="mb-4 flex flex-wrap gap-2 justify-center">
                {Object.entries(subjectColors).map(([subject]) => (
                    <button
                        key={subject}
                        className={`px-3 py-1 rounded-full text-sm border font-semibold ${selectedSubjects.includes(subject) ? 'bg-[#6b4a2b] text-white' : 'bg-white text-[#6b4a2b]'}`}
                        onClick={() => toggleSubject(subject)}
                    >
                        {subject}
                    </button>
                ))}
            </div>

            <ResponsiveContainer width="100%" height={320}>
                <BarChart
                    data={chartData}
                    margin={{ top: 20, right: 30, left: 40, bottom: 5 }} // ← left を広げる
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#ccc" />
                    <XAxis dataKey="date" />
                    <YAxis tickFormatter={formatMinutesToShortTime} />
                    <Tooltip
                        formatter={(value, name) => [`${value}分`, `${name}`]}
                        labelFormatter={label => `${label} の学習内容`}
                    />
                    <Legend content={<CustomLegend selectedSubjects={selectedSubjects} />} />
                    {topics.map((topic) => {
                        const subject = topicSubjectMap[topic] || 'その他';
                        const color = subjectColors[subject] || subjectColors.その他;
                        return (
                            <Bar key={topic} dataKey={topic} stackId="a" fill={color} />
                        );
                    })}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}