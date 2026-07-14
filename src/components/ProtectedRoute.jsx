import { useEffect, useMemo, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { useStudentProfile } from '../contexts/StudentProfileContext';
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
  const { email, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading, refreshProfile } = useStudentProfile();
  const location = useLocation();
  const [checkingTeacher, setCheckingTeacher] = useState(true);
  const [teacherSnap, setTeacherSnap] = useState(null);
  const [error, setError] = useState(null);

  const needsTeacherCheck = requireTeacher || requireSchoolAdmin || requireSuperAdmin;

  useEffect(() => {
    if (authLoading) return;

    if (!email) {
      setCheckingTeacher(false);
      return;
    }

    if (!needsTeacherCheck) {
      setCheckingTeacher(false);
      setTeacherSnap(null);
      setError(null);
      return;
    }

    let active = true;
    const verifyTeacher = async () => {
      setCheckingTeacher(true);
      try {
        const teacherDoc = await getDoc(doc(db, 'teachers', email));
        if (!active) return;
        setTeacherSnap(teacherDoc.exists() ? teacherDoc.data() : null);
        setError(null);
      } catch (err) {
        console.error('ProtectedRoute teacher check failed:', err);
        if (active) {
          setTeacherSnap(null);
          setError('failed');
        }
      } finally {
        if (active) setCheckingTeacher(false);
      }
    };

    verifyTeacher();
    return () => {
      active = false;
    };
  }, [email, authLoading, needsTeacherCheck]);

  useEffect(() => {
    if (authLoading || !email || needsTeacherCheck) return;
    refreshProfile();
  }, [authLoading, email, needsTeacherCheck, location.pathname, refreshProfile]);

  const role = teacherSnap?.role || null;
  const authorized = useMemo(() => {
    if (!needsTeacherCheck) return true;
    if (!teacherSnap) return false;
    if (requireSuperAdmin) return role === 'super_admin';
    if (requireSchoolAdmin) return role === 'school_admin' || role === 'super_admin';
    return true;
  }, [needsTeacherCheck, teacherSnap, role, requireSuperAdmin, requireSchoolAdmin]);

  const registrationType = profile?.registrationType ?? null;
  const mustChangePassword = profile?.mustChangePassword === true;

  const blockedOnWeb =
    blockSelfRegisteredOnWeb &&
    isWebPlatform() &&
    !!email &&
    registrationType === 'self_registered';

  const checking = needsTeacherCheck ? checkingTeacher : profileLoading;

  useEffect(() => {
    if (authLoading || checking || email) return;
    const returnUrl = `${location.pathname}${location.search}`;
    if (returnUrl && returnUrl !== '/') {
      setPostLoginReturnUrl(returnUrl);
    }
  }, [authLoading, checking, email, location.pathname, location.search]);

  if (authLoading || checking) return <FullScreenLoader label="読み込み中…" />;

  if (!email) {
    return <Navigate to="/" replace />;
  }

  if (blockedOnWeb) {
    return <WebSelfRegisteredBlock />;
  }

  if (needsTeacherCheck && !authorized) {
    return (
      <div className="min-h-dvh flex flex-col items-center justify-center bg-[#4b4039] text-[#ede3d2] px-6">
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

  const isSchoolProvisioned = registrationType === 'school_provisioned';
  if (
    mustChangePassword &&
    !schoolOnboardingRequired &&
    !isSchoolProvisioned &&
    location.pathname !== '/settings'
  ) {
    return <Navigate to="/settings" replace state={{ from: location.pathname }} />;
  }

  return children;
}
