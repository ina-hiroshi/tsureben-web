import dayjs from 'dayjs';

export const STORAGE_KEY = 'tsureben_timer_state';
const LEGACY_KEY = 'tsureben_timer_start';
const STALE_MS = 24 * 60 * 60 * 1000;

/**
 * @typedef {'idle' | 'running' | 'paused'} TimerStatus
 * @typedef {{
 *   email: string;
 *   status: 'running' | 'paused';
 *   startMs?: number;
 *   startTimeStr: string;
 *   elapsedMinutes: number;
 * }} StoredTimerState
 */

function parseLegacyStart(raw) {
  const startMs = Number(raw);
  if (!Number.isFinite(startMs) || startMs <= 0) return null;
  return {
    status: 'running',
    startMs,
    startTimeStr: dayjs(startMs).format('HH:mm'),
    elapsedMinutes: (Date.now() - startMs) / 60000,
  };
}

function parseStored(raw) {
  if (!raw) return null;
  try {
    const data = JSON.parse(raw);
    if (!data || typeof data !== 'object') return null;
    if (data.status !== 'running' && data.status !== 'paused') return null;
    if (typeof data.email !== 'string' || !data.email) return null;
    if (typeof data.startTimeStr !== 'string') return null;
    if (typeof data.elapsedMinutes !== 'number' || !Number.isFinite(data.elapsedMinutes)) {
      return null;
    }
    if (data.status === 'running') {
      const startMs = Number(data.startMs);
      if (!Number.isFinite(startMs) || startMs <= 0) return null;
      return { ...data, startMs };
    }
    return data;
  } catch {
    return null;
  }
}

function migrateLegacy(email) {
  const legacy = localStorage.getItem(LEGACY_KEY);
  if (!legacy) return null;
  const parsed = parseLegacyStart(legacy);
  if (!parsed) {
    localStorage.removeItem(LEGACY_KEY);
    return null;
  }
  const state = { email, ...parsed };
  save(state);
  localStorage.removeItem(LEGACY_KEY);
  return state;
}

/** @param {string | null | undefined} email */
export function load(email) {
  if (!email) return null;

  const raw = localStorage.getItem(STORAGE_KEY);
  let state = raw ? parseStored(raw) : null;
  if (!state) {
    state = migrateLegacy(email);
  }
  if (!state) return null;
  if (state.email !== email) {
    return null;
  }
  return state;
}

/** @param {StoredTimerState} state */
export function save(state) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function clear() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(LEGACY_KEY);
}

/** @param {StoredTimerState} state */
export function isStale(state) {
  if (!state) return false;
  const referenceMs =
    state.status === 'running' && state.startMs
      ? state.startMs
      : dayjs().subtract(state.elapsedMinutes, 'minute').valueOf();
  const started = dayjs(referenceMs);
  const now = dayjs();
  if (!started.isSame(now, 'day') && started.isBefore(now, 'day')) {
    return true;
  }
  return now.valueOf() - referenceMs > STALE_MS;
}

/** @param {StoredTimerState | null | undefined} state */
export function isActive(state) {
  return state?.status === 'running' || state?.status === 'paused';
}

/** @returns {StoredTimerState | null} */
export function loadAnyActive() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const state = raw ? parseStored(raw) : null;
  if (state && isActive(state)) return state;

  const legacy = localStorage.getItem(LEGACY_KEY);
  if (legacy) {
    const parsed = parseLegacyStart(legacy);
    if (parsed) {
      const email = localStorage.getItem('email') || '';
      return { email, ...parsed };
    }
  }
  return null;
}

export function computeElapsedMinutes(state) {
  if (!state) return 0;
  if (state.status === 'paused') {
    return Math.max(0, state.elapsedMinutes);
  }
  if (state.startMs) {
    return Math.max(0, (Date.now() - state.startMs) / 60000);
  }
  return Math.max(0, state.elapsedMinutes);
}

export function formatTimerMmSs(elapsedMinutes) {
  const totalSecs = Math.max(0, Math.floor(elapsedMinutes * 60));
  const mins = Math.floor(totalSecs / 60);
  const secs = totalSecs % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
