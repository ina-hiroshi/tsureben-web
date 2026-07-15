import {
  needsPasswordOnlyOnboarding,
  needsSchoolOnboarding,
} from './schoolOnboarding.js';

const ACCOUNT_STATUS = {
  disabled: { key: 'disabled', label: '無効', tone: 'muted' },
  migrated: { key: 'migrated', label: '引き継ぎ済み', tone: 'muted' },
  onboarding: { key: 'onboarding', label: '初期設定未完了', tone: 'warning' },
  password_reset: { key: 'password_reset', label: 'パスワード未変更', tone: 'warning' },
  ready: { key: 'ready', label: '利用可能', tone: 'success' },
};

export function getTeacherAccountStatus(profile) {
  if (!profile) return { key: 'unknown', label: '不明', tone: 'muted' };
  if (profile.disabledAt) return ACCOUNT_STATUS.disabled;
  if (profile.migratedTo) return ACCOUNT_STATUS.migrated;
  if (needsPasswordOnlyOnboarding(profile)) return ACCOUNT_STATUS.password_reset;
  if (needsSchoolOnboarding(profile)) return ACCOUNT_STATUS.onboarding;
  return ACCOUNT_STATUS.ready;
}

function normalizeEmailList(values) {
  if (!Array.isArray(values)) return [];
  return values.filter((value) => typeof value === 'string' && value.trim());
}

export function resolveMateEmailForTeacher(email, studentsByEmail, externalLabel) {
  const profile = studentsByEmail?.[email];
  if (profile) {
    const name = profile.name?.trim() || '学内の生徒';
    const grade = profile.grade ?? '—';
    const classNum = profile.class ?? '—';
    return {
      kind: 'internal',
      label: `${name}（${grade}年${classNum}組）`,
    };
  }
  return {
    kind: 'external',
    label: externalLabel,
  };
}

export function resolveMateListForTeacher(emails, studentsByEmail, externalLabel) {
  return normalizeEmailList(emails).map((email) =>
    resolveMateEmailForTeacher(email, studentsByEmail, externalLabel)
  );
}

export function buildTeacherMateSummary(student, studentsByEmail) {
  const mutualMates = normalizeEmailList(student?.mutualMates);
  const pendingSent = normalizeEmailList(student?.pendingSent);
  const pendingReceived = normalizeEmailList(student?.pendingReceived);

  return {
    counts: {
      mutual: mutualMates.length,
      sent: pendingSent.length,
      received: pendingReceived.length,
    },
    mutual: resolveMateListForTeacher(mutualMates, studentsByEmail, '学外の仲間'),
    sent: resolveMateListForTeacher(pendingSent, studentsByEmail, '学外への申請'),
    received: resolveMateListForTeacher(
      pendingReceived,
      studentsByEmail,
      '学外からの申請'
    ),
  };
}

export function formatMateCountSummary({ mutual = 0, sent = 0, received = 0 } = {}) {
  return `仲間 ${mutual} · 送信中 ${sent} · 受信中 ${received}`;
}

export function accountStatusBadgeClass(tone) {
  switch (tone) {
    case 'success':
      return 'bg-emerald-100 text-emerald-900 border-emerald-200';
    case 'warning':
      return 'bg-amber-100 text-amber-900 border-amber-200';
    default:
      return 'bg-tsure-surface text-tsure-muted border-tsure-border';
  }
}

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

export function getLivePresenceStatus(email, activeSessions = []) {
  const target = normalizeEmail(email);
  if (!target) {
    return { status: 'offline', label: '—' };
  }
  const session = activeSessions.find(
    (item) => normalizeEmail(item?.email) === target
  );
  if (!session) {
    return { status: 'offline', label: '—' };
  }
  if (session.isPaused === true) {
    return { status: 'paused', label: '休憩中' };
  }
  return { status: 'studying', label: '学習中' };
}

export function livePresenceBadgeClass(status) {
  switch (status) {
    case 'studying':
      return 'bg-[#5a3e28] text-[#fff5e9]';
    case 'paused':
      return 'bg-gray-500 text-white';
    default:
      return 'bg-tsure-surface text-tsure-muted border border-tsure-border';
  }
}

export function aggregateLogsBySubject(dayLogsByDate = {}) {
  const bySubject = {};
  Object.values(dayLogsByDate).forEach((day) => {
    Object.entries(day?.bySubject || {}).forEach(([subject, minutes]) => {
      const value = Number(minutes) || 0;
      if (value <= 0) return;
      bySubject[subject] = (bySubject[subject] || 0) + value;
    });
  });
  return bySubject;
}

function threadTimestamp(thread) {
  const ts = thread?.lastMessageAt;
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
}

export function summarizeFeedbackThreads(threads = []) {
  const unreadCount = threads.filter((thread) => thread?.unreadByTeacher === true).length;
  let lastMessageAt = null;
  let lastMillis = 0;
  threads.forEach((thread) => {
    const millis = threadTimestamp(thread);
    if (millis > lastMillis) {
      lastMillis = millis;
      const ts = thread?.lastMessageAt;
      if (ts && typeof ts.toDate === 'function') {
        lastMessageAt = ts.toDate();
      }
    }
  });
  return { unreadCount, lastMessageAt, threadCount: threads.length };
}

export function getAttentionMessages({ accountStatus, studySummary, recentDays = 7 }) {
  const messages = [];
  if (
    accountStatus?.key === 'onboarding' ||
    accountStatus?.key === 'password_reset'
  ) {
    if (accountStatus.key === 'onboarding') {
      messages.push('初期設定が未完了です。本人に設定画面への案内を検討してください。');
    } else {
      messages.push('パスワードが未変更です。本人にパスワード変更を案内してください。');
    }
  }
  if (studySummary && !studySummary.hasStudy) {
    messages.push(`直近${recentDays}日間、学習記録がありません。`);
  }
  return messages;
}

export function matchesTeacherStudentFilter(student, { filterGrade, filterClass, nameQuery }) {
  if (filterGrade && String(student.grade ?? '') !== filterGrade) return false;
  if (filterClass && String(student.class ?? '') !== filterClass) return false;
  const name = nameQuery.trim();
  if (name && !String(student.name ?? '').includes(name)) return false;
  return true;
}

export function matchesStudentStatusTableFilter(
  student,
  {
    studentFilters,
    presenceFilter = '',
    accountFilter = '',
    studyFilter = '',
  },
  { activeSessions = [], studySummaries = {} } = {}
) {
  if (!matchesTeacherStudentFilter(student, studentFilters)) {
    return false;
  }

  if (presenceFilter) {
    const presence = getLivePresenceStatus(student?.email, activeSessions);
    if (presence.status !== presenceFilter) return false;
  }

  if (accountFilter) {
    const accountStatus = getTeacherAccountStatus(student);
    if (accountStatus.key !== accountFilter) return false;
  }

  if (studyFilter) {
    const study = studySummaries[student?.email];
    const hasStudy = Boolean(study?.hasStudy);
    if (studyFilter === 'yes' && !hasStudy) return false;
    if (studyFilter === 'no' && hasStudy) return false;
  }

  return true;
}
