import { useEffect } from 'react';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { useStudentProfile } from '../contexts/StudentProfileContext';
import { registerAppleStudent } from '../services/authApi';
import { isAppleAuthUser } from '../utils/resolveUserEmail';
import { isIOSNative } from '../utils/platformAccess';

/** Apple ID ログイン済みセッションで Firestore プロフィールを確実に同期する */
export default function AppleStudentRegistrationSync() {
  const { uid, loading: authLoading } = useAuth();
  const { profile, refreshProfile } = useStudentProfile() ?? {};

  useEffect(() => {
    if (authLoading || !uid || !isIOSNative()) return undefined;
    if (!isAppleAuthUser(auth.currentUser)) return undefined;

    let active = true;
    registerAppleStudent()
      .then(() => {
        if (!active || profile) return undefined;
        return refreshProfile?.();
      })
      .catch((err) => {
        if (active) console.warn('AppleStudentRegistrationSync failed:', err);
      });

    return () => {
      active = false;
    };
  }, [uid, authLoading, profile, refreshProfile]);

  return null;
}
