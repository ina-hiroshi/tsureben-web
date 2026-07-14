import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  buildTeacherMateSummary,
  formatMateCountSummary,
  getTeacherAccountStatus,
  resolveMateEmailForTeacher,
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
