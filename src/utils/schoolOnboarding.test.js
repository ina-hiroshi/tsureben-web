import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  needsPasswordOnlyOnboarding,
  needsSchoolOnboarding,
} from './schoolOnboarding.js';

const schoolProvisioned = {
  registrationType: 'school_provisioned',
};

describe('needsSchoolOnboarding', () => {
  it('returns false for null or missing profile', () => {
    assert.equal(needsSchoolOnboarding(null), false);
    assert.equal(needsSchoolOnboarding(undefined), false);
  });

  it('returns false for non school_provisioned accounts', () => {
    assert.equal(
      needsSchoolOnboarding({ registrationType: 'self_registered', mustChangePassword: true }),
      false
    );
  });

  it('requires full onboarding for new bulk-import students', () => {
    assert.equal(
      needsSchoolOnboarding({
        ...schoolProvisioned,
        onboardingComplete: false,
        mustChangePassword: true,
      }),
      true
    );
  });

  it('requires onboarding after admin password reset', () => {
    assert.equal(
      needsSchoolOnboarding({
        ...schoolProvisioned,
        onboardingComplete: true,
        mustChangePassword: true,
      }),
      true
    );
  });

  it('does not require onboarding when setup is complete', () => {
    assert.equal(
      needsSchoolOnboarding({
        ...schoolProvisioned,
        onboardingComplete: true,
        mustChangePassword: false,
      }),
      false
    );
  });

  it('treats legacy users without flags as complete when password was changed', () => {
    assert.equal(
      needsSchoolOnboarding({
        ...schoolProvisioned,
        onboardingComplete: null,
        mustChangePassword: false,
      }),
      false
    );
  });

  it('requires onboarding for legacy users who still must change password', () => {
    assert.equal(
      needsSchoolOnboarding({
        ...schoolProvisioned,
        onboardingComplete: null,
        mustChangePassword: true,
      }),
      true
    );
  });
});

describe('needsPasswordOnlyOnboarding', () => {
  it('returns true only for completed onboarding with mandatory password change', () => {
    assert.equal(
      needsPasswordOnlyOnboarding({
        ...schoolProvisioned,
        onboardingComplete: true,
        mustChangePassword: true,
      }),
      true
    );
  });

  it('returns false for first-time full onboarding', () => {
    assert.equal(
      needsPasswordOnlyOnboarding({
        ...schoolProvisioned,
        onboardingComplete: false,
        mustChangePassword: true,
      }),
      false
    );
  });

  it('returns false when password change is not required', () => {
    assert.equal(
      needsPasswordOnlyOnboarding({
        ...schoolProvisioned,
        onboardingComplete: true,
        mustChangePassword: false,
      }),
      false
    );
  });
});
