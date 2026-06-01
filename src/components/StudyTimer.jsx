import { useState } from 'react';
import { useStudyTimer } from '../contexts/StudyTimerContext';
import PomodoroClock from './PomodoroClock';
import Button from './ui/Button';
import { Play, Pause, Square } from 'lucide-react';
import AppIcon from './ui/AppIcon';
import StudyContentModal from './StudyContentModal';

export default function StudyTimer({ className = '', large = false }) {
  const {
    status,
    elapsedMinutes,
    startTimeStr,
    planPreset,
    subjectCatalog,
    start,
    pause,
    resume,
    save,
  } = useStudyTimer();

  const [showModal, setShowModal] = useState(false);

  const handleSave = async (fields) => {
    await save(fields);
    setShowModal(false);
  };

  return (
    <div
      className={`flex flex-col items-center gap-6 py-6 w-full mx-auto ${large ? 'max-w-md md:max-w-xl md:gap-8' : 'max-w-md'} ${className}`}
    >
        <PomodoroClock elapsedMinutes={elapsedMinutes} large={large} />

        <div className={`flex flex-col gap-3 w-full ${large ? 'max-w-xs md:max-w-md' : 'max-w-xs'}`}>
          {status === 'idle' && (
            <Button
              variant="accent"
              size="lg"
              className="w-full inline-flex items-center justify-center gap-2"
              onClick={start}
            >
              <AppIcon icon={Play} size="md" className="fill-current" />
              学習開始
            </Button>
          )}
          {status === 'running' && (
            <Button
              variant="white"
              size="lg"
              className="w-full inline-flex items-center justify-center gap-2"
              onClick={pause}
            >
              <AppIcon icon={Pause} size="md" />
              一時停止
            </Button>
          )}
          {status === 'paused' && (
            <>
              <Button
                variant="accent"
                size="lg"
                className="w-full inline-flex items-center justify-center gap-2"
                onClick={resume}
              >
                <AppIcon icon={Play} size="md" className="fill-current" />
                再開
              </Button>
              <Button
                variant="primary"
                size="lg"
                className="w-full inline-flex items-center justify-center gap-2"
                onClick={() => setShowModal(true)}
              >
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
