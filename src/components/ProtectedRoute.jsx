import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/firestore/userService';
import { db } from '../firebase';
import { isWebPlatform } from '../utils/platformAccess';
import { needsSchoolOnboarding } from '../utils/schoolOnboarding';
import { setPostLoginReturnUrl } from '../utils/postLoginRedirect';
import WebSelfRegisteredBlock from './WebSelfRegisteredBlock';
import FullScreenLoader from './ui/FullScreenLoader';

export default function ProtectedRoute({
  children,
  requireTeacher = false,
  requireSchoolAdmin = false,
  requireSuperAdmin = false,
  blockSelfRegisteredOnWeb = false,
}) {
  const { email, loading } = useAuth();
  const location = useLocation();
  const [checking, setChecking] = useState(true);
  const [teacherSnap, setTeacherSnap] = useState(null);
  const [registrationType, setRegistrationType] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [profile, setProfile] = useState(null);
  const [error, setError] = useState(null);

  const needsTeacherCheck = requireTeacher || requireSchoolAdmin || requireSuperAdmin;

  useEffect(() => {
    if (loading) return;

    if (!email) {
      setChecking(false);
      return;
    }

    let active = true;
    const verify = async () => {
      setChecking(true);
      try {
        const profilePromise = getProfile(email);
        const teacherPromise = needsTeacherCheck
          ? getDoc(doc(db, 'teachers', email))
          : Promise.resolve(null);

        const [profile, teacherDoc] = await Promise.all([profilePromise, teacherPromise]);
        if (!active) return;

        setProfile(profile);
        setMustChangePassword(profile?.mustChangePassword === true);
        setRegistrationType(profile?.registrationType ?? null);
        if (needsTeacherCheck) {
          setTeacherSnap(teacherDoc?.exists() ? teacherDoc.data() : null);
        }
        setError(null);
      } catch (err) {
        console.error('ProtectedRoute check failed:', err);
        if (active) {
          setTeacherSnap(null);
          setRegistrationType(null);
          setProfile(null);
          setMustChangePassword(false);
          setError('failed');
        }
      } finally {
        if (active) setChecking(false);
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [email, loading, needsTeacherCheck]);

  const role = teacherSnap?.role || null;
  const authorized = useMemo(() => {
    if (!needsTeacherCheck) return true;
    if (!teacherSnap) return false;
    if (requireSuperAdmin) return role === 'super_admin';
    if (requireSchoolAdmin) return role === 'school_admin' || role === 'super_admin';
    return true;
  }, [needsTeacherCheck, teacherSnap, role, requireSuperAdmin, requireSchoolAdmin]);

  const blockedOnWeb =
    blockSelfRegisteredOnWeb &&
    isWebPlatform() &&
    !!email &&
    registrationType === 'self_registered';

  useEffect(() => {
    if (loading || checking || email) return;
    const returnUrl = `${location.pathname}${location.search}`;
    if (returnUrl && returnUrl !== '/') {
      setPostLoginReturnUrl(returnUrl);
    }
  }, [loading, checking, email, location.pathname, location.search]);

  if (loading || checking) return <FullScreenLoader label="読み込み中…" />;

  if (!email) {
    return <Navigate to="/" replace />;
  }

  if (blockedOnWeb) {
    return <WebSelfRegisteredBlock />;
  }

  if (needsTeacherCheck && !authorized) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-[#4b4039] text-[#ede3d2] px-6">
        <div className="max-w-lg bg-[#ede3d2] text-[#5a3e28] shadow-md rounded-2xl p-8 space-y-4 text-center">
          <h1 className="text-2xl font-semibold">アクセス権限がありません</h1>
          <p>このページは教員・管理者専用です。</p>
          {error && (
            <p className="text-sm text-red-600">
              権限の確認に失敗しました。ネットワーク状況を確認してください。
            </p>
          )}
          <a href="/home" className="inline-block rounded-xl bg-[#5a3e28] px-4 py-2 text-white">
            ホームに戻る
          </a>
        </div>
      </div>
    );
  }

  const schoolOnboardingRequired = needsSchoolOnboarding(profile);

  if (schoolOnboardingRequired && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace state={{ from: location.pathname }} />;
  }

  if (
    mustChangePassword &&
    !schoolOnboardingRequired &&
    location.pathname !== '/settings'
  ) {
    return <Navigate to="/settings" replace state={{ from: location.pathname }} />;
  }

  return children;
}
