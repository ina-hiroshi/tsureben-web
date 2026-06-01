import { useEffect, useState } from 'react';
import dayjs from 'dayjs';

export function parseSessionStart(startTime) {
  if (!startTime) return null;
  const [h, m] = String(startTime).split(':').map(Number);
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;

  const now = dayjs();
  let start = now.hour(h).minute(m).second(0).millisecond(0);
  if (start.isAfter(now)) {
    start = start.subtract(1, 'day');
  }
  return start;
}

export function computeElapsedMinutes(startTime) {
  const start = parseSessionStart(startTime);
  if (!start) return 0;
  return Math.max(0, dayjs().diff(start, 'minute'));
}

export function computeSessionElapsedMinutes(user) {
  if (!user) return 0;
  if (user.isPaused && typeof user.pausedElapsedMinutes === 'number') {
    return Math.max(0, Math.floor(user.pausedElapsedMinutes));
  }
  return computeElapsedMinutes(user.startTime);
}

export function formatElapsedDuration(totalMinutes) {
  const minutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) return `${hours}時間${mins}分`;
  return `${mins}分`;
}

export function formatStudentMeta(user) {
  const parts = [];
  if (user.grade != null && user.grade !== '') parts.push(`${user.grade}年`);
  if (user.class != null && user.class !== '') parts.push(`${user.class}組`);
  if (user.number != null && user.number !== '') parts.push(`${user.number}番`);
  return parts.join(' ');
}

export function useSessionElapsedMinutes(user, intervalMs = 15000) {
  const sessionUser = typeof user === 'string' ? { startTime: user } : user;
  const [elapsedMinutes, setElapsedMinutes] = useState(() =>
    computeSessionElapsedMinutes(sessionUser)
  );

  useEffect(() => {
    setElapsedMinutes(computeSessionElapsedMinutes(sessionUser));
    if (sessionUser?.isPaused) {
      return undefined;
    }
    const id = setInterval(() => {
      setElapsedMinutes(computeSessionElapsedMinutes(sessionUser));
    }, intervalMs);
    return () => clearInterval(id);
  }, [
    sessionUser?.startTime,
    sessionUser?.isPaused,
    sessionUser?.pausedElapsedMinutes,
    intervalMs,
  ]);

  return elapsedMinutes;
}
