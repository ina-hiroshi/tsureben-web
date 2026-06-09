const STORAGE_PREFIX = 'tsureben_in_app_review_';
const REVIEW_DEBUG_KEY = 'tsureben_review_debug';

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const REVIEW_THRESHOLDS = {
  minDaysSinceFirstSeen: 7,
  minSessionCount: 5,
  minTimerSaveCount: 3,
  minDaysSinceLastPrompt: 90,
  maxPromptCount: 2,
  declineCooldownDays: 180,
};

function storageKey(email) {
  return `${STORAGE_PREFIX}${email.trim().toLowerCase()}`;
}

function readState(email) {
  if (!email) return null;
  try {
    const raw = localStorage.getItem(storageKey(email));
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function writeState(email, state) {
  if (!email) return;
  localStorage.setItem(storageKey(email), JSON.stringify(state));
}

export function isReviewDebugEnabled() {
  return import.meta.env.DEV && localStorage.getItem(REVIEW_DEBUG_KEY) === '1';
}

export function ensureReviewState(email) {
  const prev = readState(email);
  if (prev?.firstSeenAt) return prev;
  const state = {
    firstSeenAt: Date.now(),
    sessionCount: 0,
    timerSaveCount: 0,
    lastPromptAt: null,
    promptCount: 0,
    declinedUntil: null,
  };
  writeState(email, state);
  return state;
}

export function incrementReviewSessionCount(email) {
  const state = ensureReviewState(email);
  writeState(email, { ...state, sessionCount: (state.sessionCount || 0) + 1 });
}

export function incrementTimerSaveCount(email) {
  const state = ensureReviewState(email);
  writeState(email, { ...state, timerSaveCount: (state.timerSaveCount || 0) + 1 });
  return readState(email);
}

export function recordReviewPromptShown(email) {
  const state = ensureReviewState(email);
  writeState(email, {
    ...state,
    lastPromptAt: Date.now(),
    promptCount: (state.promptCount || 0) + 1,
  });
}

export function recordReviewDeclined(email) {
  const state = ensureReviewState(email);
  writeState(email, {
    ...state,
    declinedUntil: Date.now() + REVIEW_THRESHOLDS.declineCooldownDays * MS_PER_DAY,
  });
}

export function recordReviewPostponed(email) {
  const state = ensureReviewState(email);
  writeState(email, { ...state, lastPromptAt: Date.now() });
}

export function getReviewEligibilityState(email) {
  return ensureReviewState(email);
}
