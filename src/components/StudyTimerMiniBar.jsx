import { Link, useLocation } from 'react-router-dom';
import { Pause, Timer } from 'lucide-react';
import { useStudyTimerOptional } from '../contexts/StudyTimerContext';
import { formatTimerMmSs } from '../utils/studyTimerStorage';
import AppIcon from './ui/AppIcon';

export default function StudyTimerMiniBar() {
  const location = useLocation();
  const timer = useStudyTimerOptional();

  if (!timer?.isActive || location.pathname === '/pomodoro') {
    return null;
  }

  const { status, elapsedMinutes } = timer;
  const timeLabel = formatTimerMmSs(elapsedMinutes);
  const isPaused = status === 'paused';

  return (
    <Link
      to="/pomodoro"
      className="flex h-touch min-h-touch w-full items-center justify-center gap-3 px-4 py-0 bg-tsure-accent/90 text-tsure-on-primary no-underline border-b border-tsure-accent hover:bg-tsure-accent transition md:mx-4 md:mt-2 md:mb-2 md:rounded-xl md:border md:shadow-tsure-chip"
      aria-label={isPaused ? `学習タイマー ${timeLabel} 休憩中。タップでタイマーページへ` : `学習タイマー ${timeLabel} 計測中。タップでタイマーページへ`}
    >
      <AppIcon icon={Timer} size="2xl" className="shrink-0" />
      <span className="font-bold tabular-nums text-3xl leading-none tracking-tight">{timeLabel}</span>
      {isPaused && (
        <>
          <AppIcon icon={Pause} size="2xl" className="shrink-0 opacity-90" />
          <span className="text-xl font-semibold leading-none">休憩中</span>
        </>
      )}
    </Link>
  );
}
