import {
  formatElapsedDuration,
  formatStudentMeta,
  useSessionElapsedMinutes,
} from '../../utils/presenceUtils';

const CARD_SURFACE = {
  studying: 'bg-[#ebe0d2] border-[#c4b5a0] border-l-[#5a3e28]',
  paused: 'bg-gray-100 border-gray-200 border-l-gray-400',
};

const STATUS_BADGE = {
  studying: 'bg-[#5a3e28] text-[#fff5e9]',
  paused: 'bg-gray-500 text-white',
};

export default function TeacherPresenceCard({ user, onClick }) {
  const meta = formatStudentMeta(user);
  const elapsedMinutes = useSessionElapsedMinutes(user);
  const elapsedLabel = formatElapsedDuration(elapsedMinutes);
  const isPaused = user.isPaused === true;
  const statusLabel = isPaused ? '休憩中' : '勉強中';
  const surfaceClass = isPaused ? CARD_SURFACE.paused : CARD_SURFACE.studying;
  const badgeClass = isPaused ? STATUS_BADGE.paused : STATUS_BADGE.studying;

  const className = `w-full text-left rounded-xl border border-l-4 shadow-tsure-chip hover:brightness-[0.98] transition cursor-pointer ${surfaceClass}`;

  const cardContent = (
    <div className="p-2.5 min-w-0">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-1.5 min-w-0">
            <p className="text-sm font-bold text-tsure-primary truncate">
              {user.name || user.email}
            </p>
            {meta && (
              <p className="text-[10px] text-tsure-muted shrink-0 truncate">{meta}</p>
            )}
          </div>
          <div className="mt-1.5 flex items-center gap-1.5 min-w-0 flex-wrap">
            <span
              className={`inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold shrink-0 ${badgeClass}`}
            >
              {statusLabel}
            </span>
            {!isPaused && user.startTime && (
              <span className="text-[10px] text-tsure-muted tabular-nums truncate">
                {user.startTime}開始
              </span>
            )}
          </div>
        </div>
        <p className="text-base font-extrabold text-tsure-primary tabular-nums leading-none shrink-0">
          {elapsedLabel}
        </p>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={() => onClick(user)} className={className}>
        {cardContent}
      </button>
    );
  }

  return <div className={className}>{cardContent}</div>;
}
