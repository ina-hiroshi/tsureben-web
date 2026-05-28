import { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { getProfile } from '../services/firestore/userService';

export function useTeacherStatus() {
  const { email, loading: authLoading } = useAuth();
  const [isTeacher, setIsTeacher] = useState(false);
  const [teacherRole, setTeacherRole] = useState(null);
  const [schoolId, setSchoolId] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!email) {
      setIsTeacher(false);
      setTeacherRole(null);
      setSchoolId(null);
      setLoading(false);
      return;
    }

    let active = true;
    const verify = async () => {
      setLoading(true);
      try {
        const snap = await getDoc(doc(db, 'teachers', email));
        if (!active) return;
        if (snap.exists()) {
          const data = snap.data();
          let resolvedSchoolId = data.schoolId || null;
          if (!resolvedSchoolId) {
            const profile = await getProfile(email);
            if (!active) return;
            resolvedSchoolId = profile?.schoolId || null;
          }
          setIsTeacher(true);
          setTeacherRole(data.role || 'teacher');
          setSchoolId(resolvedSchoolId);
        } else {
          setIsTeacher(false);
          setTeacherRole(null);
          setSchoolId(null);
        }
      } catch (err) {
        console.error('教員判定に失敗:', err);
        if (active) {
          setIsTeacher(false);
          setTeacherRole(null);
          setSchoolId(null);
        }
      } finally {
        if (active) setLoading(false);
      }
    };

    verify();
    return () => {
      active = false;
    };
  }, [email, authLoading]);

  const isSchoolAdmin = teacherRole === 'school_admin' || teacherRole === 'super_admin';
  const isSuperAdmin = teacherRole === 'super_admin';

  return {
    isTeacher,
    teacherRole,
    schoolId,
    isSchoolAdmin,
    isSuperAdmin,
    loading: authLoading || loading,
  };
}
