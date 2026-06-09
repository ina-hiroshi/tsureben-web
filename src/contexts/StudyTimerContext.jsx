import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import dayjs from 'dayjs';
import { useAuth } from './AuthContext';
import { useTeacherStatus } from '../hooks/useTeacherStatus';
import { onTimerSaveSuccess } from '../services/inAppReviewService';
import { getProfile } from '../services/firestore/userService';
import { getDayPlans } from '../services/firestore/planService';
import * as logService from '../services/firestore/logService';
import * as presenceService from '../services/firestore/presenceService';
import { flattenDayPlans } from '../utils/planUtils';
import * as studyTimerStorage from '../utils/studyTimerStorage';

const StudyTimerContext = createContext(null);

function findMatchingPlan(plans, startTime) {
  const [h, m] = startTime.split(':').map(Number);
  const startMins = h * 60 + m;
  return plans.find((p) => {
    const [sh, sm] = (p.start || '00:00').split(':').map(Number);
    const [eh, em] = (p.end || '23:59').split(':').map(Number);
    const s = sh * 60 + sm;
    const e = eh * 60 + em;
    return startMins >= s && startMins < e;
  });
}

function buildStoredState(email, status, startMsRef, startTimeStr, elapsedMinutes) {
  if (status === 'paused') {
    return {
      email,
      status: 'paused',
      startTimeStr,
      elapsedMinutes,
    };
  }
  return {
    email,
    status: 'running',
    startMs: startMsRef.current,
    startTimeStr,
    elapsedMinutes,
  };
}

export function StudyTimerProvider({ children }) {
  const { email } = useAuth();
  const { isTeacher } = useTeacherStatus();
  const [status, setStatus] = useState('idle');
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [startTimeStr, setStartTimeStr] = useState('');
  const [planPreset, setPlanPreset] = useState({});
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [stalePrompt, setStalePrompt] = useState(null);
  const [hydrated, setHydrated] = useState(false);

  const startMsRef = useRef(null);
  const pendingStoredRef = useRef(null);

  const tick = useCallback(() => {
    if (startMsRef.current == null) return;
    const mins = (Date.now() - startMsRef.current) / 60000;
    setElapsedMinutes(mins);
  }, []);

  const persistState = useCallback(
    (nextStatus, nextElapsedMinutes, nextStartTimeStr) => {
      if (!email || nextStatus === 'idle') return;
      studyTimerStorage.save(
        buildStoredState(email, nextStatus, startMsRef, nextStartTimeStr, nextElapsedMinutes)
      );
    },
    [email]
  );

  const applyStoredState = useCallback(
    async (stored) => {
      if (!email || !stored) return;

      setStartTimeStr(stored.startTimeStr);
      setStatus(stored.status);

      if (stored.status === 'paused') {
        startMsRef.current = null;
        setElapsedMinutes(stored.elapsedMinutes);
        return;
      }

      startMsRef.current = stored.startMs;
      tick();

      const profile = await getProfile(email);
      if (profile) {
        setSubjectCatalog(profile.subjectCatalog || {});
      }
      const dateKey = dayjs().format('YYYY-MM-DD');
      const dayData = await getDayPlans(email, dateKey);
      const plans = flattenDayPlans(dayData);
      setPlanPreset(findMatchingPlan(plans, stored.startTimeStr) || {});
    },
    [email, tick]
  );

  const resetUiToIdle = useCallback(() => {
    startMsRef.current = null;
    setElapsedMinutes(0);
    setStartTimeStr('');
    setPlanPreset({});
    setStatus('idle');
  }, []);

  const resetToIdle = useCallback(() => {
    studyTimerStorage.clear();
    resetUiToIdle();
    setStalePrompt(null);
    pendingStoredRef.current = null;
  }, [resetUiToIdle]);

  useEffect(() => {
    if (!email) {
      resetToIdle();
      setHydrated(true);
      return;
    }

    const stored = studyTimerStorage.load(email);
    setHydrated(false);
    pendingStoredRef.current = null;
    setStalePrompt(null);

    if (!stored) {
      resetToIdle();
      setHydrated(true);
      return;
    }

    if (studyTimerStorage.isStale(stored)) {
      pendingStoredRef.current = stored;
      setStalePrompt({
        startTimeStr: stored.startTimeStr,
        elapsedMinutes: studyTimerStorage.computeElapsedMinutes(stored),
      });
      resetUiToIdle();
      setHydrated(true);
      return;
    }

    applyStoredState(stored).finally(() => setHydrated(true));
  }, [email, applyStoredState, resetToIdle, resetUiToIdle]);

  useEffect(() => {
    if (status !== 'running') return undefined;

    let timeoutId = null;

    const scheduleTick = () => {
      tick();
      const delay = 1000 - (Date.now() % 1000);
      timeoutId = setTimeout(scheduleTick, delay);
    };

    scheduleTick();

    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        tick();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      if (timeoutId != null) clearTimeout(timeoutId);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [status, tick]);

  const confirmStaleRestore = useCallback(async () => {
    const stored = pendingStoredRef.current;
    if (!stored || !email) return;
    pendingStoredRef.current = null;
    setStalePrompt(null);
    studyTimerStorage.save({ ...stored, email });
    await applyStoredState(stored);
  }, [email, applyStoredState]);

  const discardStale = useCallback(async () => {
    const stored = pendingStoredRef.current;
    pendingStoredRef.current = null;
    setStalePrompt(null);
    studyTimerStorage.clear();
    if (stored?.email) {
      try {
        await presenceService.endSession(stored.email);
      } catch (err) {
        console.error('discardStale endSession error:', err);
      }
    }
  }, []);

  const start = useCallback(async () => {
    if (!email) return;
    const profile = await getProfile(email);
    if (!profile) return;

    const now = Date.now();
    startMsRef.current = now;
    const timeStr = dayjs(now).format('HH:mm');
    setStartTimeStr(timeStr);
    setSubjectCatalog(profile.subjectCatalog || {});
    setStatus('running');
    tick();

    studyTimerStorage.save({
      email,
      status: 'running',
      startMs: now,
      startTimeStr: timeStr,
      elapsedMinutes: 0,
    });

    const dateKey = dayjs().format('YYYY-MM-DD');
    const dayData = await getDayPlans(email, dateKey);
    const plans = flattenDayPlans(dayData);
    setPlanPreset(findMatchingPlan(plans, timeStr) || {});

    try {
      await presenceService.startSession(email, profile, {
        subject: '勉強中',
        startTime: timeStr,
        isPaused: false,
      });
    } catch (err) {
      console.error('startSession error:', err);
    }
  }, [email, tick]);

  const pause = useCallback(async () => {
    if (!email || status !== 'running') return;
    const frozen = elapsedMinutes;
    startMsRef.current = null;
    setStatus('paused');
    setElapsedMinutes(frozen);
    persistState('paused', frozen, startTimeStr);

    try {
      await presenceService.pauseSession(email, frozen);
    } catch (err) {
      console.error('pauseSession error:', err);
    }
  }, [email, status, elapsedMinutes, startTimeStr, persistState]);

  const resume = useCallback(async () => {
    if (!email || status !== 'paused') return;
    const pausedMins = elapsedMinutes;
    startMsRef.current = Date.now() - pausedMins * 60000;
    setStatus('running');
    persistState('running', pausedMins, startTimeStr);

    try {
      await presenceService.resumeSession(email);
    } catch (err) {
      console.error('resumeSession error:', err);
    }
  }, [email, status, elapsedMinutes, startTimeStr, persistState]);

  const save = useCallback(
    async (fields) => {
      if (!email) return;

      let duration = Math.round(elapsedMinutes);
      if (fields.duration != null) duration = Number(fields.duration);
      if (duration <= 0) duration = 1;

      const dateKey = dayjs().format('YYYY-MM-DD');
      await logService.addEntry(email, dateKey, {
        startTime: startTimeStr || dayjs().format('HH:mm'),
        duration,
        subject: fields.subject,
        topic: fields.topic,
        book: fields.book,
        content: fields.content,
      });
      await logService.updateSubjectCatalog(email, fields);

      try {
        await presenceService.endSession(email);
      } catch (err) {
        console.error('endSession error:', err);
      }

      resetToIdle();
      onTimerSaveSuccess(email, { isTeacher });
    },
    [email, elapsedMinutes, startTimeStr, resetToIdle, isTeacher]
  );

  const value = {
    hydrated,
    status,
    elapsedMinutes,
    startTimeStr,
    planPreset,
    subjectCatalog,
    stalePrompt,
    isActive: status === 'running' || status === 'paused',
    start,
    pause,
    resume,
    save,
    confirmStaleRestore,
    discardStale,
  };

  return (
    <StudyTimerContext.Provider value={value}>{children}</StudyTimerContext.Provider>
  );
}

export function useStudyTimer() {
  const ctx = useContext(StudyTimerContext);
  if (!ctx) {
    throw new Error('useStudyTimer must be used within StudyTimerProvider');
  }
  return ctx;
}

export function useStudyTimerOptional() {
  return useContext(StudyTimerContext);
}
