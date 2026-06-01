import { useStudyTimerOptional } from '../contexts/StudyTimerContext';
import { formatElapsedDuration } from '../utils/presenceUtils';
import Button from './ui/Button';
import Modal from './ui/Modal';

export default function StudyTimerStalePrompt() {
  const timer = useStudyTimerOptional();
  const stalePrompt = timer?.stalePrompt;

  if (!timer || !stalePrompt) return null;

  const staleMinutesLabel = formatElapsedDuration(Math.round(stalePrompt.elapsedMinutes));

  return (
    <Modal
      open
      onClose={timer.discardStale}
      title="前回の学習タイマー"
      showHeaderClose={false}
      fullScreenMobile={false}
    >
      <p className="text-sm text-tsure-primary mb-6">
        {`前回の学習タイマー（${stalePrompt.startTimeStr} 開始・約${staleMinutesLabel}）を復元しますか？`}
      </p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="accent" size="md" className="flex-1" onClick={timer.confirmStaleRestore}>
          復元する
        </Button>
        <Button variant="secondary" size="md" className="flex-1" onClick={timer.discardStale}>
          破棄する
        </Button>
      </div>
    </Modal>
  );
}
