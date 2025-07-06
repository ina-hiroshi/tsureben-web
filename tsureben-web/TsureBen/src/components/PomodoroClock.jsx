import React from 'react';

export default function PomodoroClock({ elapsedMinutes = 0, isRunning, onToggle }) {
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

    return (
        <div className="flex flex-col md:flex-row items-center justify-center gap-6 flex-wrap px-4">
            {/* 時計 */}
            <svg
                width="90%" // スマホ時に自動縮小
                viewBox={`0 0 ${center * 2} ${center * 2}`}
                className="max-w-[360px] h-auto"
            >
                <circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke="#ede3d2"
                    strokeWidth={strokeWidth}
                    fill="none"
                />
                {elapsedMinutes > 0 && (
                    <path
                        d={`M ${center},${center} ${describeArc(0, angle)} Z`}
                        fill="#ffa726"
                        stroke="none"
                    />
                )}
                {/* 針 */}
                <line
                    x1={center}
                    y1={center}
                    x2={polarToCartesian(center, center, radius, angle).x}
                    y2={polarToCartesian(center, center, radius, angle).y}
                    stroke="#ede3d2"
                    strokeWidth={4}
                />
                {/* 5分刻み目盛り */}
                {[...Array(12)].map((_, i) => {
                    const tickAngle = (i * 30);
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

            {/* ボタン＋デジタル表示 */}
            <div className="flex flex-col items-center gap-4 w-full md:w-auto mt-4 md:mt-0">
                <button
                    onClick={onToggle}
                    className="bg-[#ede3d2] text-[#6b4a2b] px-10 py-4 rounded-full font-bold text-2xl shadow hover:scale-105 transition w-full max-w-xs"
                >
                    {isRunning ? 'STOP' : 'START'}
                </button>
                <p className="text-4xl text-[#ede3d2] font-semibold">
                    {String(Math.floor(elapsedMinutes)).padStart(2, '0')}:
                    {String(Math.floor((elapsedMinutes % 1) * 60)).padStart(2, '0')}
                </p>
            </div>
        </div>
    );
}