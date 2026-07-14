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
