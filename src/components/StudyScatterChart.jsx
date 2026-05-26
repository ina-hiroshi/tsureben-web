import React, { useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import {
    ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts';
import { doc, getDoc, getDocs, collection } from 'firebase/firestore';
import dayjs from 'dayjs';

// ✅ カスタムツールチップ
const CustomTooltip = ({ active, payload, userEmail }) => {
    if (!active || !payload?.length) return null;

    const data = payload[0].payload;
    const details = data.details || [];
    const isSelf = data.email?.toLowerCase() === userEmail?.toLowerCase();

    const subjectSummary = {};
    details.forEach(log => {
        const subject = log.subject || 'その他';
        const topic = log.topic || '未分類';
        const duration = log.duration || 0;

        if (!subjectSummary[subject]) {
            subjectSummary[subject] = { total: 0, topics: {} };
        }
        subjectSummary[subject].total += duration;
        subjectSummary[subject].topics[topic] = (subjectSummary[subject].topics[topic] || 0) + duration;
    });

    return (
        <div className={`bg-white p-3 border ${isSelf ? 'border-red-500' : 'border-gray-400'} rounded shadow-md text-sm text-[#5a3e28] max-w-xs`}>
            <div className="font-bold mb-2">教科ごとの学習時間</div>
            <ul className="space-y-2">
                {Object.entries(subjectSummary).map(([subject, { total, topics }]) => (
                    <li key={subject}>
                        <div className="font-semibold">{subject}：{total}分</div>
                        <ul className="ml-4 list-disc">
                            {Object.entries(topics).map(([topic, time]) => (
                                <li key={topic}>{topic}：{time}分</li>
                            ))}
                        </ul>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// ✅ 星型 shape
const StarShape = ({ cx, cy, payload, onMouseEnter, onMouseLeave }) => (
    <path
        d="M 0,-12 L 3,-4 L 12,-4 L 4,2 L 6,12 L 0,6 L -6,12 L -4,2 L -12,-4 L -3,-4 Z"
        transform={`translate(${cx}, ${cy})`}
        fill="#facc15"
        stroke="#5a3e28"
        strokeWidth={1.5}
        onMouseEnter={() => onMouseEnter?.({ cx, cy, payload })}
        onMouseLeave={() => onMouseLeave?.({ cx, cy, payload })}
    />
);

const StudyScatterChart = ({ userEmail }) => {
    const [data, setData] = useState([]);
    const [medians, setMedians] = useState({ x: 0, y: 50 });
    const [selectedRange, setSelectedRange] = useState('week');
    const [targetTestName, setTargetTestName] = useState('');
    const [availableTests, setAvailableTests] = useState([]);

    // 🔸 範囲フィルター関数
    const isInRange = (date) => {
        const today = dayjs();
        if (selectedRange === 'yesterday') return date.isSame(today.subtract(1, 'day'), 'day');
        if (selectedRange === 'week') return date.isAfter(today.subtract(7, 'day'), 'day');
        if (selectedRange === 'month') return date.isAfter(today.subtract(1, 'month'), 'day');
        return true;
    };

    useEffect(() => {
        const fetchTestNames = async () => {
            const usersSnap = await getDocs(collection(db, 'users'));
            const userData = usersSnap.docs.find(doc => doc.id.toLowerCase() === userEmail.toLowerCase())?.data();
            const testNameSet = new Set();

            if (userData?.scores && Array.isArray(userData.scores)) {
                userData.scores.forEach(entry => {
                    if (entry.testName) {
                        testNameSet.add(entry.testName);
                    }
                });
            }

            const uniqueTests = Array.from(testNameSet).sort();
            setAvailableTests(uniqueTests);

            // 🔸 初回に targetTestName が未設定であればセット
            if (!targetTestName && uniqueTests.length > 0) {
                setTargetTestName(uniqueTests[0]);
            }
        };

        fetchTestNames();
    }, [userEmail]);

    useEffect(() => {
        const fetchData = async () => {
            if (!targetTestName) return;

            const [summaryDoc, usersSnap] = await Promise.all([
                getDoc(doc(db, 'scatterChartData_summary', selectedRange)),
                getDocs(collection(db, 'users')),
            ]);

            const summaryData = summaryDoc.exists() ? summaryDoc.data() : {};
            const userMap = {};
            usersSnap.forEach(doc => {
                userMap[doc.id.toLowerCase()] = doc.data();
            });

            const result = [];

            for (const [email, { totalMinutes, score }] of Object.entries(summaryData)) {
                const lowerEmail = email.toLowerCase();
                const userData = userMap[lowerEmail];

                if (!userData) continue;
                if (userData.role === 'teacher' || userData.teacher === true) continue;
                if (!Array.isArray(userData.scores)) continue;

                const matchedScore = userData.scores.find(
                    s => s.testName === targetTestName
                )?.value;

                if (typeof matchedScore !== 'number' || matchedScore !== score) continue;

                result.push({
                    id: `${email}-${totalMinutes}-${score}`,
                    email,
                    totalMinutes,
                    score,
                    details: [],
                    isSelf: lowerEmail === userEmail?.toLowerCase()
                });
            }

            const calcMedian = arr => {
                if (!arr.length) return 0;
                const sorted = [...arr].sort((a, b) => a - b);
                const mid = Math.floor(sorted.length / 2);
                return sorted.length % 2 === 0
                    ? (sorted[mid - 1] + sorted[mid]) / 2
                    : sorted[mid];
            };

            setData(result);
            setMedians({
                x: calcMedian(result.map(d => d.totalMinutes)),
                y: calcMedian(result.map(d => d.score)),
            });
        };

        fetchData();
    }, [selectedRange, userEmail, targetTestName]);


    return (
        <div className="bg-[#ede3d2] px-2 py-3 sm:p-4 rounded-xl shadow-md mb-6">
            {/* 🔸 タイトル */}
            <h2 className="text-lg font-bold text-[#5a3e28] mb-4 text-left">
                学習時間と偏差値の相関
            </h2>

            {/* 🔸 模試セレクト */}
            <div className="flex justify-center gap-4 mb-4 flex-wrap">
                {['yesterday', 'week', 'month'].map(range => (
                    <button
                        key={range}
                        onClick={() => setSelectedRange(range)}
                        className={`px-3 py-1 rounded border ${selectedRange === range
                            ? 'bg-[#5a3e28] text-white'
                            : 'bg-white text-[#5a3e28] border-[#5a3e28]'}`}
                    >
                        {range === 'yesterday' ? '昨日' : range === 'week' ? '1週間' : '1ヶ月'}
                    </button>
                ))}

                {/* 模試セレクト */}
                <select
                    value={targetTestName}
                    onChange={(e) => setTargetTestName(e.target.value)}
                    className="px-3 py-1 border border-[#5a3e28] rounded text-[#5a3e28]"
                >
                    {availableTests.map(name => (
                        <option key={name} value={name}>{name}</option>
                    ))}
                </select>
            </div>

            {/* 🔸 グラフ表示 */}
            {data.length < 10 ? (
                <p className="text-center text-gray-500">
                    表示できるデータがありません（10人以上のデータが必要です）
                </p>
            ) : (
                <ResponsiveContainer width="100%" height={320}>
                    <ScatterChart>
                        <CartesianGrid />
                        <XAxis
                            type="number"
                            dataKey="totalMinutes"
                            name="学習時間"
                            unit="分"
                            domain={[0, medians.x * 2]} // 384 → 768
                        />
                        <YAxis
                            type="number"
                            dataKey="score"
                            name="偏差値"
                            domain={[medians.y - (medians.y - 52), medians.y + (medians.y - 52)]} // 59 → [52, 66]
                        />
                        <Tooltip content={<CustomTooltip userEmail={userEmail} />} />
                        <Scatter
                            name="ユーザー全体"
                            data={data}
                            dataKey="id"
                            isAnimationActive={false}
                            fill="#5a3e28"
                            shape={props =>
                                props.payload.isSelf ? (
                                    <StarShape {...props} />
                                ) : (
                                    <circle
                                        cx={props.cx}
                                        cy={props.cy}
                                        r={4}
                                        fill={props.fill}
                                        stroke="#000"
                                        strokeWidth={0.5}
                                    />
                                )
                            }
                        />
                        <ReferenceLine x={medians.x} stroke="#3a2e28" strokeWidth={2} />
                        <ReferenceLine y={medians.y} stroke="#3a2e28" strokeWidth={2} />
                    </ScatterChart>
                </ResponsiveContainer>
            )}

            {/* 🔸 凡例 */}
            <div className="flex justify-center mt-3 text-sm text-[#5a3e28]">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-1">
                        <svg width="14" height="14">
                            <circle cx="7" cy="7" r="5" fill="#5a3e28" stroke="#000" strokeWidth="0.5" />
                        </svg>
                        <span>＝ 他のユーザー</span>
                    </div>
                    <div className="flex items-center gap-1">
                        <svg width="20" height="20">
                            <path
                                d="M 0,-8 L 2,-2 L 8,-2 L 3,2 L 4,8 L 0,4 L -4,8 L -3,2 L -8,-2 L -2,-2 Z"
                                transform="translate(10,10)"
                                fill="#facc15"
                                stroke="#000"
                                strokeWidth="1"
                            />
                        </svg>
                        <span>＝ あなた</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default StudyScatterChart;