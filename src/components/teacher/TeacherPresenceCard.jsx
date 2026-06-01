import { subjectBarColorClass, subjectTextColorClass } from '../../utils/subjectColors';
import {
  formatElapsedDuration,
  formatStudentMeta,
  useSessionElapsedMinutes,
} from '../../utils/presenceUtils';

function SubjectTopicLine({ subject, topic }) {
  const subjectLabel = (subject || '').trim();
  const topicLabel = (topic || '').trim();

  if (!subjectLabel && !topicLabel) {
    return <p className="text-xs font-bold text-tsure-muted leading-tight">勉強中</p>;
  }

  const colorSubject = subjectLabel || topicLabel;
  const dotClass = subjectTextColorClass(colorSubject);

  if (subjectLabel && topicLabel) {
    return (
      <p className="text-xs font-bold text-tsure-primary leading-tight truncate">
        <span>{subjectLabel}</span>
        <span className={`${dotClass} mx-0.5`} aria-hidden="true">
          ・
        </span>
        <span>{topicLabel}</span>
      </p>
    );
  }

  return (
    <p className="text-xs font-bold text-tsure-primary leading-tight truncate">
      {subjectLabel || topicLabel}
    </p>
  );
}

export default function TeacherPresenceCard({ user, onClick }) {
  const book = (user.book || '').trim();
  const meta = formatStudentMeta(user);
  const elapsedMinutes = useSessionElapsedMinutes(user);
  const elapsedLabel = user.isPaused ? '休憩中' : formatElapsedDuration(elapsedMinutes);
  const startLabel = user.startTime ? `${user.startTime}開始` : '開始時刻不明';
  const accentClass = subjectBarColorClass(user.subject);

  const className =
    'w-full text-left rounded-2xl border border-tsure-border bg-tsure-surface shadow-tsure-chip hover:bg-tsure-surface-hover transition cursor-pointer';

  const content = (
    <div className="flex gap-2 p-2.5 sm:p-3 min-w-0">
      <div className={`shrink-0 w-1 rounded-full self-stretch ${accentClass}`} aria-hidden="true" />
      <div className="flex-1 min-w-0 flex flex-col gap-1">
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-baseline gap-1.5 min-w-0 flex-1">
            <p className="text-sm font-bold text-tsure-primary truncate">{user.name || user.email}</p>
            {meta && <p className="text-[11px] text-tsure-muted shrink-0 truncate">{meta}</p>}
          </div>
          <p className="text-[11px] text-tsure-muted tabular-nums shrink-0">{startLabel}</p>
        </div>

        <div className="flex items-end justify-between gap-2 min-w-0">
          <div className="min-w-0 flex-1">
            <SubjectTopicLine subject={user.subject} topic={user.topic} />
            {book && <p className="text-[11px] text-tsure-muted mt-0.5 truncate">{book}</p>}
          </div>
          <p className="text-lg sm:text-xl font-extrabold text-tsure-primary tabular-nums leading-none shrink-0">
            {elapsedLabel}
          </p>
        </div>
      </div>
    </div>
  );

  if (onClick) {
    return (
      <button type="button" onClick={() => onClick(user)} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}
