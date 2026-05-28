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
    return <p className="text-sm font-bold text-tsure-muted">勉強中</p>;
  }

  const colorSubject = subjectLabel || topicLabel;
  const dotClass = subjectTextColorClass(colorSubject);

  if (subjectLabel && topicLabel) {
    return (
      <p className="text-sm font-bold text-tsure-primary leading-snug truncate">
        <span>{subjectLabel}</span>
        <span className={`${dotClass} mx-0.5`} aria-hidden="true">
          ・
        </span>
        <span>{topicLabel}</span>
      </p>
    );
  }

  return (
    <p className="text-sm font-bold text-tsure-primary leading-snug truncate">
      {subjectLabel || topicLabel}
    </p>
  );
}

export default function TeacherPresenceCard({ user, onClick }) {
  const book = (user.book || '').trim();
  const meta = formatStudentMeta(user);
  const elapsedMinutes = useSessionElapsedMinutes(user.startTime);
  const elapsedLabel = formatElapsedDuration(elapsedMinutes);
  const startLabel = user.startTime ? `${user.startTime}開始` : '開始時刻不明';
  const accentClass = subjectBarColorClass(user.subject);

  const className =
    'w-full text-left rounded-2xl border border-tsure-border bg-tsure-surface shadow-tsure-chip hover:bg-tsure-surface-hover transition cursor-pointer';

  const content = (
    <div className="flex gap-3 p-3 sm:p-4 min-w-0">
      <div className={`shrink-0 w-1 rounded-full self-stretch ${accentClass}`} aria-hidden="true" />
      <div className="flex-1 min-w-0">
        <p className="text-base font-bold text-tsure-primary truncate">{user.name || user.email}</p>
        {meta && <p className="text-xs text-tsure-muted mt-0.5 truncate">{meta}</p>}

        <div className="mt-2 min-w-0">
          <SubjectTopicLine subject={user.subject} topic={user.topic} />
          {book && <p className="text-xs text-tsure-muted mt-1 truncate">{book}</p>}
        </div>

        <div className="mt-3 flex items-end justify-between gap-3">
          <p className="text-xs text-tsure-muted tabular-nums shrink-0">{startLabel}</p>
          <p className="text-xl sm:text-2xl font-extrabold text-tsure-primary tabular-nums leading-none">
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
