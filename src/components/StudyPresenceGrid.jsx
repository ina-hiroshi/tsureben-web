import { useLayoutEffect, useRef, useState } from 'react';
import EmptyState from './ui/EmptyState';
import TeacherPresenceCard from './teacher/TeacherPresenceCard';
import { PRESENCE_EMPTY } from '../content/emptyStatePresets';

/** 1周あたりの横移動速度（px/s）。人数が変わっても見た目の速さを一定にする */
const SCROLL_PX_PER_SECOND = 24;

function formatSubjectTopic(user) {
  const parts = [user.subject, user.topic].filter(Boolean);
  return parts.length > 0 ? parts.join(' / ') : '勉強中';
}

function PresenceChip({ user, onClick }) {
  const subjectTopic = formatSubjectTopic(user);
  const book = (user.book || '').trim();

  const content = (
    <>
      <span className="w-1.5 h-1.5 rounded-full bg-tsure-muted shrink-0" aria-hidden="true" />
      <span className="text-sm font-medium text-tsure-primary whitespace-nowrap">
        {user.name || user.email}
      </span>
      <div className="flex flex-col min-w-0">
        <span className="text-xs text-tsure-primary/75 whitespace-nowrap">{subjectTopic}</span>
        {book && <span className="text-xs text-tsure-primary/75 whitespace-nowrap">{book}</span>}
      </div>
    </>
  );

  const className = `flex items-center gap-2 shrink-0 px-3 py-2 rounded-2xl border border-tsure-border bg-tsure-surface shadow-tsure-chip text-left ${
    onClick ? 'hover:bg-tsure-surface-hover transition cursor-pointer' : ''
  }`;

  if (onClick) {
    return (
      <button type="button" onClick={() => onClick(user)} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function PresenceScrollTrack({ users, onUserClick }) {
  const trackRef = useRef(null);
  const [durationSec, setDurationSec] = useState(null);
  const displayItems = [...users, ...users];

  useLayoutEffect(() => {
    const el = trackRef.current;
    if (!el) return;

    const updateDuration = () => {
      const loopDistance = el.scrollWidth / 2;
      if (loopDistance <= 0) return;
      setDurationSec(loopDistance / SCROLL_PX_PER_SECOND);
    };

    updateDuration();
    const observer = new ResizeObserver(updateDuration);
    observer.observe(el);
    return () => observer.disconnect();
  }, [users]);

  return (
    <div className="overflow-hidden motion-reduce:overflow-x-auto">
      <div
        ref={trackRef}
        className="flex w-max gap-3 animate-presence-scroll motion-reduce:animate-none"
        style={durationSec != null ? { animationDuration: `${durationSec}s` } : undefined}
      >
        {displayItems.map((user, index) => (
          <PresenceChip
            key={`${user.email}-${index}`}
            user={user}
            onClick={onUserClick}
          />
        ))}
      </div>
    </div>
  );
}

function PresenceGrid({ users, onUserClick }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-3">
      {users.map((user) => (
        <TeacherPresenceCard key={user.email} user={user} onClick={onUserClick} />
      ))}
    </div>
  );
}

export default function StudyPresenceGrid({
  users = [],
  emptyState = PRESENCE_EMPTY,
  emptyAction,
  variant = 'student',
  onUserClick,
}) {
  if (!users.length) {
    return <EmptyState {...emptyState} action={emptyAction} />;
  }

  const isTeacher = variant === 'teacher';
  const shouldScroll = !isTeacher && users.length >= 3;

  return (
    <div>
      <p className="sr-only">{users.length}人が勉強中</p>
      {isTeacher ? (
        <PresenceGrid users={users} onUserClick={onUserClick} />
      ) : shouldScroll ? (
        <PresenceScrollTrack users={users} onUserClick={onUserClick} />
      ) : (
        <div className="flex justify-center">
          <div className="flex w-max gap-3">
            {users.map((user) => (
              <PresenceChip key={user.email} user={user} onClick={onUserClick} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
