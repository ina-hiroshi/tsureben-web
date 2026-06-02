import { useEffect, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuth } from '../contexts/AuthContext';
import { useTeacherStatus } from './useTeacherStatus';
import { getProfile } from '../services/firestore/userService';

export function useAdEligibility() {
  const { email, loading: authLoading } = useAuth();
  const { isTeacher, loading: teacherLoading } = useTeacherStatus();
  const [registrationType, setRegistrationType] = useState(null);
  const [profileLoading, setProfileLoading] = useState(true);

  useEffect(() => {
    if (authLoading || teacherLoading) return;

    if (!email || isTeacher || !Capacitor.isNativePlatform()) {
      setRegistrationType(null);
      setProfileLoading(false);
      return;
    }

    let active = true;
    setProfileLoading(true);
    getProfile(email)
      .then((profile) => {
        if (!active) return;
        setRegistrationType(profile?.registrationType ?? null);
      })
      .catch((err) => {
        console.warn('useAdEligibility: profile load failed', err);
        if (active) setRegistrationType(null);
      })
      .finally(() => {
        if (active) setProfileLoading(false);
      });

    return () => {
      active = false;
    };
  }, [email, authLoading, teacherLoading, isTeacher]);

  const loading = authLoading || teacherLoading || profileLoading;
  const eligible =
    !loading &&
    Capacitor.isNativePlatform() &&
    !!email &&
    !isTeacher &&
    registrationType === 'self_registered';

  return { eligible, loading, registrationType };
}
