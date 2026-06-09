import { useEffect, useState } from 'react';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useStudentProfile } from '../contexts/StudentProfileContext';
import { useTeacherStatus } from './useTeacherStatus';
import { registerAppleStudent } from '../services/authApi';
import { isSelfRegisteredStudentProfile } from '../utils/accountDeletion';
import { isAppleAuthUser } from '../utils/resolveUserEmail';
import { isIOSNative } from '../utils/platformAccess';

export function useAdEligibility() {
  const { email, loading: authLoading } = useAuth();
  const { isTeacher, loading: teacherLoading } = useTeacherStatus();
  const { profile, loading: profileLoading, refreshProfile } = useStudentProfile() ?? {};
  const [syncingAppleProfile, setSyncingAppleProfile] = useState(false);

  useEffect(() => {
    if (authLoading || teacherLoading || profileLoading || syncingAppleProfile) return;
    if (!email || isTeacher || !isIOSNative() || profile) return;
    if (!isAppleAuthUser(auth.currentUser)) return;

    let active = true;
    setSyncingAppleProfile(true);
    registerAppleStudent()
      .then(() => refreshProfile?.())
      .catch((err) => {
        console.warn('useAdEligibility: registerAppleStudent failed', err);
      })
      .finally(() => {
        if (active) setSyncingAppleProfile(false);
      });

    return () => {
      active = false;
    };
  }, [
    email,
    authLoading,
    teacherLoading,
    profileLoading,
    syncingAppleProfile,
    isTeacher,
    profile,
    refreshProfile,
  ]);

  const loading = authLoading || teacherLoading || profileLoading || syncingAppleProfile;
  const eligible =
    !loading &&
    isIOSNative() &&
    !!email &&
    !isTeacher &&
    isSelfRegisteredStudentProfile(profile);

  return {
    eligible,
    loading,
    registrationType: profile?.registrationType ?? null,
  };
}
