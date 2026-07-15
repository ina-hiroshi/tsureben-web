/**
 * StudyTimerProvider の hydration 分岐。
 * localStorage を意図せず消さないよう、Auth 確定前は待機する。
 *
 * @typedef {'wait' | 'idle' | 'restore' | 'stale'} HydrationAction
 */

/**
 * @param {{ loading: boolean; email: string | null | undefined; stored: object | null }} params
 * @returns {HydrationAction}
 */
export function resolveHydrationAction({ loading, email, stored }) {
  if (loading) {
    return 'wait';
  }

  if (!email) {
    return 'idle';
  }

  if (!stored) {
    return 'idle';
  }

  return 'restore';
}

/**
 * hydration 時に localStorage を clear してよいか。
 * 意図的な破棄（save / discardStale / logout）以外では常に false。
 *
 * @returns {boolean}
 */
export function shouldClearOnHydration() {
  return false;
}
