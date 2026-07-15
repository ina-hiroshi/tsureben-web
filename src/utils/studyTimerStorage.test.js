import { describe, it, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import {
  STORAGE_KEY,
  load,
  save,
  clear,
  isStale,
  computeElapsedMinutes,
  formatTimerMmSs,
} from './studyTimerStorage.js';
import {
  resolveHydrationAction,
  shouldClearOnHydration,
} from './studyTimerHydration.js';

function createLocalStorageMock() {
  const store = new Map();
  return {
    getItem(key) {
      return store.has(key) ? store.get(key) : null;
    },
    setItem(key, value) {
      store.set(key, String(value));
    },
    removeItem(key) {
      store.delete(key);
    },
    clear() {
      store.clear();
    },
  };
}

describe('studyTimerStorage', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = createLocalStorageMock();
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  it('round-trips running state for the same email', () => {
    const state = {
      email: 'student@school.jp',
      status: 'running',
      startMs: Date.now() - 5 * 60 * 1000,
      startTimeStr: '10:00',
      elapsedMinutes: 0,
    };
    save(state);
    const loaded = load('student@school.jp');
    assert.deepEqual(loaded, state);
  });

  it('round-trips paused state for the same email', () => {
    const state = {
      email: 'student@school.jp',
      status: 'paused',
      startTimeStr: '10:00',
      elapsedMinutes: 12.5,
    };
    save(state);
    const loaded = load('student@school.jp');
    assert.deepEqual(loaded, state);
  });

  it('returns null when stored email does not match', () => {
    save({
      email: 'a@school.jp',
      status: 'running',
      startMs: Date.now(),
      startTimeStr: '10:00',
      elapsedMinutes: 0,
    });
    assert.equal(load('b@school.jp'), null);
    assert.ok(globalThis.localStorage.getItem(STORAGE_KEY));
  });

  it('clears both current and legacy keys', () => {
    save({
      email: 'student@school.jp',
      status: 'running',
      startMs: Date.now(),
      startTimeStr: '10:00',
      elapsedMinutes: 0,
    });
    globalThis.localStorage.setItem('tsureben_timer_start', String(Date.now()));
    clear();
    assert.equal(globalThis.localStorage.getItem(STORAGE_KEY), null);
    assert.equal(globalThis.localStorage.getItem('tsureben_timer_start'), null);
  });

  it('computes elapsed minutes from startMs while running', () => {
    const startMs = Date.now() - 3 * 60 * 1000;
    const elapsed = computeElapsedMinutes({
      status: 'running',
      startMs,
      elapsedMinutes: 0,
    });
    assert.ok(elapsed >= 2.9 && elapsed <= 3.1);
  });

  it('returns frozen elapsed minutes while paused', () => {
    assert.equal(
      computeElapsedMinutes({
        status: 'paused',
        elapsedMinutes: 7.25,
      }),
      7.25
    );
  });

  it('marks sessions from a previous day as stale', () => {
    const yesterday = dayjs().subtract(1, 'day').hour(22).minute(0).valueOf();
    assert.equal(
      isStale({
        status: 'running',
        startMs: yesterday,
        startTimeStr: '22:00',
        elapsedMinutes: 0,
      }),
      true
    );
  });

  it('does not mark same-day sessions as stale within 24h', () => {
    const startMs = Date.now() - 30 * 60 * 1000;
    assert.equal(
      isStale({
        status: 'running',
        startMs,
        startTimeStr: dayjs(startMs).format('HH:mm'),
        elapsedMinutes: 0,
      }),
      false
    );
  });

  it('formats elapsed minutes as mm:ss', () => {
    assert.equal(formatTimerMmSs(1.5), '01:30');
    assert.equal(formatTimerMmSs(0), '00:00');
  });
});

describe('studyTimerHydration', () => {
  let originalLocalStorage;

  beforeEach(() => {
    originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = createLocalStorageMock();
  });

  afterEach(() => {
    globalThis.localStorage = originalLocalStorage;
  });

  const stored = {
    email: 'student@school.jp',
    status: 'running',
    startMs: Date.now(),
    startTimeStr: '10:00',
    elapsedMinutes: 0,
  };

  it('waits while auth is loading', () => {
    assert.equal(
      resolveHydrationAction({ loading: true, email: null, stored: null }),
      'wait'
    );
    assert.equal(
      resolveHydrationAction({ loading: true, email: 'student@school.jp', stored }),
      'wait'
    );
  });

  it('returns idle when auth is settled without email', () => {
    assert.equal(
      resolveHydrationAction({ loading: false, email: null, stored }),
      'idle'
    );
  });

  it('returns idle when email is set but no stored state', () => {
    assert.equal(
      resolveHydrationAction({ loading: false, email: 'student@school.jp', stored: null }),
      'idle'
    );
  });

  it('returns restore when email and stored state match', () => {
    assert.equal(
      resolveHydrationAction({ loading: false, email: 'student@school.jp', stored }),
      'restore'
    );
  });

  it('never clears localStorage during hydration', () => {
    assert.equal(shouldClearOnHydration(), false);
  });

  it('preserves stored timer across auth loading then email restore', () => {
    const email = 'student@school.jp';
    const state = {
      email,
      status: 'running',
      startMs: Date.now() - 10 * 60 * 1000,
      startTimeStr: '09:00',
      elapsedMinutes: 0,
    };
    save(state);

    assert.equal(resolveHydrationAction({ loading: true, email: null, stored: null }), 'wait');
    assert.ok(load(email));

    assert.equal(
      resolveHydrationAction({ loading: false, email: null, stored: load(email) }),
      'idle'
    );
    assert.ok(load(email), 'stored timer must survive auth-not-ready hydration');

    assert.equal(
      resolveHydrationAction({ loading: false, email, stored: load(email) }),
      'restore'
    );
  });
});
