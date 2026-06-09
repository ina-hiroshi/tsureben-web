import { InAppReview } from '@capacitor-community/in-app-review';
import { isIOSNative } from '../utils/platformAccess';
import {
  getReviewEligibilityState,
  incrementTimerSaveCount,
  isReviewDebugEnabled,
  REVIEW_THRESHOLDS,
} from '../utils/inAppReviewStorage';

let promptHandler = null;
let blocked = false;

export function setReviewPromptBlocked(value) {
  blocked = value;
}

export function setReviewPromptHandler(handler) {
  promptHandler = handler;
}

export function isEligibleForReviewPrompt(email, { isTeacher = false } = {}) {
  if (!email || !isIOSNative() || isTeacher) return false;
  if (blocked) return false;
  if (isReviewDebugEnabled()) return true;

  const state = getReviewEligibilityState(email);
  const now = Date.now();

  if (state.declinedUntil && now < state.declinedUntil) return false;
  if ((state.promptCount || 0) >= REVIEW_THRESHOLDS.maxPromptCount) return false;

  const daysSinceFirst = (now - (state.firstSeenAt || now)) / (24 * 60 * 60 * 1000);
  if (daysSinceFirst < REVIEW_THRESHOLDS.minDaysSinceFirstSeen) return false;

  if ((state.sessionCount || 0) < REVIEW_THRESHOLDS.minSessionCount) return false;
  if ((state.timerSaveCount || 0) < REVIEW_THRESHOLDS.minTimerSaveCount) return false;

  if (state.lastPromptAt) {
    const daysSincePrompt = (now - state.lastPromptAt) / (24 * 60 * 60 * 1000);
    if (daysSincePrompt < REVIEW_THRESHOLDS.minDaysSinceLastPrompt) return false;
  }

  return true;
}

export function onTimerSaveSuccess(email, { isTeacher = false } = {}) {
  if (!email || !isIOSNative() || isTeacher) return;

  incrementTimerSaveCount(email);

  if (isEligibleForReviewPrompt(email, { isTeacher })) {
    promptHandler?.(email);
  }
}

export async function requestNativeReview() {
  if (!isIOSNative()) return;
  try {
    await InAppReview.requestReview();
  } catch (err) {
    console.error('InAppReview.requestReview failed:', err);
  }
}
