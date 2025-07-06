import React from 'react';

export default function PomodoroClock({ elapsedMinutes = 0, isRunning, onToggle, onFinish }) {
    const radius = 150;
    const center = 180;
    const strokeWidth = 8;
    const maxMinutes = 60;
    const angle = (elapsedMinutes / maxMinutes) * 360;

    const polarToCartesian = (cx, cy, r, angleInDegrees) => {
        const angleInRadians = (angleInDegrees - 90) * Math.PI / 180.0;
        return {
            x: cx + r * Math.cos(angleInRadians),
            y: cy + r * Math.sin(angleInRadians),
        };
    };

    const describeArc = (startAngle, endAngle) => {
        const start = polarToCartesian(center, center, radius, endAngle);
        const end = polarToCartesian(center, center, radius, startAngle);
        const largeArcFlag = endAngle - startAngle <= 180 ? '0' : '1';
        return [
            'L', start.x, start.y,
            'A', radius, radius, 0, largeArcFlag, 0, end.x, end.y,
        ].join(' ');
    };

    const handleClick = () => {
        if (!onToggle) {
            alert("この時間の学習計画が登録されていません。先に登録してください。");
            return;
        }
        onToggle();
    };

    return (
        <div className="h-[calc(100vh-150px)] flex flex-col items-center justify-center px-4 py-6 box-border overflow-hidden">
            {/* 🔸 学習終了ボタン */}
            {elapsedMinutes > 0 && !isRunning && (
                <button
                    onClick={onFinish}
                    className="mb-4 px-10 py-4 rounded-full font-bold text-2xl shadow transition hover:scale-105
                   bg-[#ffa726] text-[#6b4a2b] hover:bg-[#ffbd4a]"
                >
                    学習終了
                </button>
            )}
            {/* タイマー本体：画面の高さの70〜75%を最大に */}
            <div className="relative w-full max-w-[min(90vw,58vh)] aspect-square">
                {/* デジタル表示 */}
                <p
                    className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-6xl font-bold z-10 text-[#ede3d2]"
                    style={{
                        textShadow: `
          -1px -1px 0 #4b4039,
           1px -1px 0 #4b4039,
          -1px  1px 0 #4b4039,
           1px  1px 0 #4b4039
        `,
                    }}
                >
                    {String(Math.floor(elapsedMinutes)).padStart(2, '0')}:
                    {String(Math.floor((elapsedMinutes % 1) * 60)).padStart(2, '0')}
                </p>

                {/* アナログ時計 */}
                <svg
                    width="100%"
                    height="100%"
                    viewBox={`0 0 ${center * 2} ${center * 2}`}
                    className="w-full h-full"
                >
                    <circle
                        cx={center}
                        cy={center}
                        r={radius}
                        stroke="#ede3d2"
                        strokeWidth={strokeWidth}
                        fill="none"
                    />
                    {[...Array(Math.floor(elapsedMinutes / 60) + 1)].map((_, i) => {
                        const start = 0;
                        const minutesInThisRound = Math.min(elapsedMinutes - i * 60, 60);
                        if (minutesInThisRound <= 0) return null;

                        const angleThisRound = (minutesInThisRound / 60) * 360;
                        const fillColors = ['#ffa726', '#ff7043', '#ab47bc', '#29b6f6'];
                        const fillColor = fillColors[i % fillColors.length]; // ⬅️ i を色配列の長さでループ

                        return (
                            <path
                                key={i}
                                d={`M ${center},${center} ${describeArc(start, angleThisRound)} Z`}
                                fill={fillColor}
                                stroke="none"
                            />
                        );
                    })}
                    <line
                        x1={center}
                        y1={center}
                        x2={polarToCartesian(center, center, radius, angle).x}
                        y2={polarToCartesian(center, center, radius, angle).y}
                        stroke="#ede3d2"
                        strokeWidth={4}
                    />
                    {[...Array(12)].map((_, i) => {
                        const tickAngle = i * 30;
                        const outer = polarToCartesian(center, center, radius, tickAngle);
                        const inner = polarToCartesian(center, center, radius - 10, tickAngle);
                        return (
                            <line
                                key={i}
                                x1={outer.x}
                                y1={outer.y}
                                x2={inner.x}
                                y2={inner.y}
                                stroke="#ede3d2"
                                strokeWidth={2}
                            />
                        );
                    })}
                </svg>
            </div>

            {/* STOP/START ボタン：残り高さで中央寄せ */}
            <div className="w-full max-w-xs mt-6">
                <button
                    onClick={handleClick}
                    className={`w-full px-10 py-4 rounded-full font-bold text-2xl shadow transition hover:scale-105
        ${isRunning
                            ? 'bg-[#ffa726] text-[#6b4a2b] hover:bg-[#ffbd4a]'
                            : 'bg-[#ede3d2] text-[#6b4a2b] hover:bg-[#f8f1e5]'
                        }`}
                >
                    {isRunning ? 'STOP' : 'START'}
                </button>
            </div>
        </div>
    );
}