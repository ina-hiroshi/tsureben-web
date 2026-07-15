import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTeacherMateSummary,
  formatMateCountSummary,
  getAttentionMessages,
  getLivePresenceStatus,
  getTeacherAccountStatus,
  matchesStudentStatusTableFilter,
  resolveMateEmailForTeacher,
  summarizeFeedbackThreads,
} from './teacherStudentStatus.js';

describe('getTeacherAccountStatus', () => {
  it('returns onboarding for incomplete school setup', () => {
    const status = getTeacherAccountStatus({
      registrationType: 'school_provisioned',
      onboardingComplete: false,
      mustChangePassword: true,
    });
    assert.equal(status.label, '初期設定未完了');
  });

  it('returns password reset for admin reset after onboarding', () => {
    const status = getTeacherAccountStatus({
      registrationType: 'school_provisioned',
      onboardingComplete: true,
      mustChangePassword: true,
    });
    assert.equal(status.label, 'パスワード未変更');
  });

  it('returns ready for active students', () => {
    const status = getTeacherAccountStatus({
      registrationType: 'school_provisioned',
      onboardingComplete: true,
      mustChangePassword: false,
    });
    assert.equal(status.label, '利用可能');
  });
});

describe('resolveMateEmailForTeacher', () => {
  const studentsByEmail = {
    'a@school.jp': { name: '山田', grade: 1, class: 2 },
  };

  it('shows internal student name and class', () => {
    const result = resolveMateEmailForTeacher('a@school.jp', studentsByEmail, '学外の仲間');
    assert.equal(result.kind, 'internal');
    assert.match(result.label, /山田/);
  });

  it('anonymizes external mates', () => {
    const result = resolveMateEmailForTeacher('b@other.jp', studentsByEmail, '学外の仲間');
    assert.equal(result.kind, 'external');
    assert.equal(result.label, '学外の仲間');
  });
});

describe('buildTeacherMateSummary', () => {
  it('builds counts and anonymized external entries', () => {
    const summary = buildTeacherMateSummary(
      {
        mutualMates: ['a@school.jp', 'b@other.jp'],
        pendingSent: ['c@other.jp'],
        pendingReceived: ['a@school.jp'],
      },
      {
        'a@school.jp': { name: '山田', grade: 1, class: 2 },
      }
    );

    assert.deepEqual(summary.counts, { mutual: 2, sent: 1, received: 1 });
    assert.equal(summary.mutual[0].kind, 'internal');
    assert.equal(summary.mutual[1].label, '学外の仲間');
    assert.equal(summary.sent[0].label, '学外への申請');
    assert.equal(summary.received[0].kind, 'internal');
    assert.equal(formatMateCountSummary(summary.counts), '仲間 2 · 送信中 1 · 受信中 1');
  });
});

describe('getLivePresenceStatus', () => {
  it('returns studying for active non-paused session', () => {
    const result = getLivePresenceStatus('a@school.jp', [
      { email: 'a@school.jp', isPaused: false },
    ]);
    assert.equal(result.label, '学習中');
    assert.equal(result.status, 'studying');
  });

  it('returns paused for paused session', () => {
    const result = getLivePresenceStatus('a@school.jp', [
      { email: 'a@school.jp', isPaused: true },
    ]);
    assert.equal(result.label, '休憩中');
  });

  it('returns offline when no session', () => {
    const result = getLivePresenceStatus('a@school.jp', []);
    assert.equal(result.label, '—');
    assert.equal(result.status, 'offline');
  });
});

describe('summarizeFeedbackThreads', () => {
  it('counts unread and picks latest message date', () => {
    const summary = summarizeFeedbackThreads([
      { unreadByTeacher: true, lastMessageAt: { toDate: () => new Date('2026-06-01') } },
      { unreadByTeacher: false, lastMessageAt: { toDate: () => new Date('2026-06-10') } },
    ]);
    assert.equal(summary.unreadCount, 1);
    assert.equal(summary.lastMessageAt?.toISOString().slice(0, 10), '2026-06-10');
  });
});

describe('getAttentionMessages', () => {
  it('returns onboarding and no-study messages', () => {
    const messages = getAttentionMessages({
      accountStatus: { key: 'onboarding' },
      studySummary: { hasStudy: false },
      recentDays: 7,
    });
    assert.equal(messages.length, 2);
  });
});

describe('matchesStudentStatusTableFilter', () => {
  const student = {
    email: 'a@school.jp',
    name: '山田',
    grade: 1,
    class: 2,
    onboardingComplete: true,
    mustChangePassword: false,
    registrationType: 'school_provisioned',
  };

  it('filters by grade and presence', () => {
    const match = matchesStudentStatusTableFilter(
      student,
      {
        studentFilters: { filterGrade: '1', filterClass: '', nameQuery: '' },
        presenceFilter: 'studying',
        accountFilter: '',
        studyFilter: '',
      },
      {
        activeSessions: [{ email: 'a@school.jp', isPaused: false }],
        studySummaries: {},
      }
    );
    assert.equal(match, true);

    const noMatch = matchesStudentStatusTableFilter(
      student,
      {
        studentFilters: { filterGrade: '2', filterClass: '', nameQuery: '' },
        presenceFilter: '',
        accountFilter: '',
        studyFilter: '',
      },
      { activeSessions: [], studySummaries: {} }
    );
    assert.equal(noMatch, false);
  });

  it('filters by study summary', () => {
    const yes = matchesStudentStatusTableFilter(
      student,
      {
        studentFilters: { filterGrade: '', filterClass: '', nameQuery: '' },
        presenceFilter: '',
        accountFilter: '',
        studyFilter: 'yes',
      },
      {
        activeSessions: [],
        studySummaries: { 'a@school.jp': { hasStudy: true } },
      }
    );
    assert.equal(yes, true);

    const no = matchesStudentStatusTableFilter(
      student,
      {
        studentFilters: { filterGrade: '', filterClass: '', nameQuery: '' },
        presenceFilter: '',
        accountFilter: '',
        studyFilter: 'no',
      },
      {
        activeSessions: [],
        studySummaries: { 'a@school.jp': { hasStudy: true } },
      }
    );
    assert.equal(no, false);
  });
});
