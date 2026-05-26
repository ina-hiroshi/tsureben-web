import { useCallback, useEffect, useRef, useState } from 'react';
import dayjs from 'dayjs';
import { getProfile } from '../services/firestore/userService';
import { getDayPlans } from '../services/firestore/planService';
import * as logService from '../services/firestore/logService';
import * as presenceService from '../services/firestore/presenceService';
import { flattenDayPlans } from '../utils/planUtils';
import PomodoroClock from './PomodoroClock';
import Button from './ui/Button';
import { Play, Pause, Square } from 'lucide-react';
import AppIcon from './ui/AppIcon';
import StudyContentModal from './StudyContentModal';

const STORAGE_KEY = 'tsureben_timer_start';

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

export default function StudyTimer({ email }) {
  const [status, setStatus] = useState('idle');
  const [elapsedMinutes, setElapsedMinutes] = useState(0);
  const [showModal, setShowModal] = useState(false);
  const [planPreset, setPlanPreset] = useState({});
  const [subjectCatalog, setSubjectCatalog] = useState({});
  const [startTimeStr, setStartTimeStr] = useState('');
  const intervalRef = useRef(null);
  const startMsRef = useRef(null);

  const tick = useCallback(() => {
    if (!startMsRef.current) return;
    const mins = (Date.now() - startMsRef.current) / 60000;
    setElapsedMinutes(mins);
  }, []);

  useEffect(() => {
    if (status !== 'running') return;
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current);
  }, [status, tick]);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      startMsRef.current = Number(saved);
      setStartTimeStr(dayjs(startMsRef.current).format('HH:mm'));
      setStatus('running');
      tick();
    }
  }, [tick]);

  const handleStart = async () => {
    const profile = await getProfile(email);
    if (!profile) return;
    const now = Date.now();
    startMsRef.current = now;
    localStorage.setItem(STORAGE_KEY, String(now));
    const timeStr = dayjs(now).format('HH:mm');
    setStartTimeStr(timeStr);
    setSubjectCatalog(profile.subjectCatalog || {});
    setStatus('running');
    tick();

    const dateKey = dayjs().format('YYYY-MM-DD');
    const dayData = await getDayPlans(email, dateKey);
    const plans = flattenDayPlans(dayData);
    const match = findMatchingPlan(plans, timeStr);
    setPlanPreset(match || {});

    await presenceService.startSession(email, profile, {
      subject: '勉強中',
      startTime: timeStr,
    });
  };

  const handlePause = () => {
    setStatus('paused');
    clearInterval(intervalRef.current);
  };

  const handleResume = () => {
    const pausedMins = elapsedMinutes;
    startMsRef.current = Date.now() - pausedMins * 60000;
    localStorage.setItem(STORAGE_KEY, String(startMsRef.current));
    setStatus('running');
  };

  const handleFinishClick = () => {
    setShowModal(true);
  };

  const handleSave = async (fields) => {
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

    await presenceService.endSession(email);
    localStorage.removeItem(STORAGE_KEY);
    startMsRef.current = null;
    setElapsedMinutes(0);
    setStatus('idle');
    setShowModal(false);
  };

  return (
    <div className="flex flex-col items-center gap-6 py-6">
      <PomodoroClock elapsedMinutes={elapsedMinutes} />

      <div className="flex flex-col gap-3 w-full max-w-xs">
        {status === 'idle' && (
          <Button variant="accent" size="lg" className="w-full inline-flex items-center justify-center gap-2" onClick={handleStart}>
            <AppIcon icon={Play} size="md" className="fill-current" />
            学習開始
          </Button>
        )}
        {status === 'running' && (
          <Button variant="secondary" size="lg" className="w-full inline-flex items-center justify-center gap-2" onClick={handlePause}>
            <AppIcon icon={Pause} size="md" />
            一時停止
          </Button>
        )}
        {status === 'paused' && (
          <>
            <Button variant="accent" size="lg" className="w-full inline-flex items-center justify-center gap-2" onClick={handleResume}>
              <AppIcon icon={Play} size="md" className="fill-current" />
              再開
            </Button>
            <Button variant="primary" size="lg" className="w-full inline-flex items-center justify-center gap-2" onClick={handleFinishClick}>
              <AppIcon icon={Square} size="md" />
              学習終了
            </Button>
          </>
        )}
      </div>

      <StudyContentModal
        open={showModal}
        mode="create"
        initial={{
          ...planPreset,
          startTime: startTimeStr,
          duration: Math.max(1, Math.round(elapsedMinutes)),
          showDuration: elapsedMinutes < 0.5,
        }}
        subjectCatalog={subjectCatalog}
        onSave={handleSave}
        onClose={() => setShowModal(false)}
      />
    </div>
  );
}
