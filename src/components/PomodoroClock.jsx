import React from 'react';

export default function PomodoroClock({ elapsedMinutes = 0, large = false }) {
  const radius = 120;
  const center = 140;
  const strokeWidth = 6;
  const maxMinutes = 60;
  const angle = (elapsedMinutes % 60) / maxMinutes * 360;

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

  const mins = Math.floor(elapsedMinutes);
  const secs = Math.floor((elapsedMinutes % 1) * 60);

  const boxClass = large
    ? 'relative mx-auto aspect-square shrink-0 w-[min(90vw,320px)] md:w-[min(100%,480px)] md:max-w-[480px]'
    : 'relative mx-auto aspect-square shrink-0 w-[min(90vw,320px)] max-w-[320px]';

  const textClass = large
    ? 'text-5xl sm:text-6xl md:text-7xl'
    : 'text-5xl sm:text-6xl';

  return (
    <div className={boxClass}>
      <p
        className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 font-bold z-10 text-tsure-surface tabular-nums ${textClass}`}
      >
        {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </p>
      <svg width="100%" height="100%" viewBox={`0 0 ${center * 2} ${center * 2}`}>
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="currentColor"
          className="text-tsure-surface/30"
          strokeWidth={strokeWidth}
          fill="none"
        />
        {elapsedMinutes > 0 && (
          <path
            d={`M ${center},${center} ${describeArc(0, Math.min(angle, 359.9))} Z`}
            className="fill-tsure-accent/80"
          />
        )}
        {[...Array(12)].map((_, i) => {
          const tickAngle = i * 30;
          const outer = polarToCartesian(center, center, radius, tickAngle);
          const inner = polarToCartesian(center, center, radius - 8, tickAngle);
          return (
            <line
              key={i}
              x1={outer.x}
              y1={outer.y}
              x2={inner.x}
              y2={inner.y}
              className="stroke-tsure-surface/40"
              strokeWidth={2}
            />
          );
        })}
      </svg>
    </div>
  );
}
