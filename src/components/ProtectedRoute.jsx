import { useEffect, useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth } from '../contexts/AuthContext';
import { db } from '../firebase';

export default function ProtectedRoute({
  children,
  requireTeacher = false,
  requireSchoolAdmin = false,
  requireSuperAdmin = false,
}) {
  const { email, loading } = useAuth();
  const [checking, setChecking] = useState(true);
  const [teacherSnap, setTeacherSnap] = useState(null);
  const [error, setError] = useState(null);

  const needsTeacherCheck = requireTeacher || requireSchoolAdmin || requireSuperAdmin;

  useEffect(() => {
    if (loading) return;

    if (!email || !needsTeacherCheck) {
      setChecking(false);
      return;
    }

    let active = true;
    const verify = async () => {
      setChecking(true);
      try {
        const snap = await getDoc(doc(db, 'teachers', email));
        if (!active) return;
        setTeacherSnap(snap.exists() ? snap.data() : null);
        setError(null);
      } catch (err) {
        console.error('ProtectedRoute teacher check failed:', err);
        if (active) {
          setTeacherSnap(null);
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

  if (loading || (needsTeacherCheck && checking)) return null;

  if (!email) {
    return <Navigate to="/" replace />;
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

  return children;
}
