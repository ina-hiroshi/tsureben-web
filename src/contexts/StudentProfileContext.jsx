import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { useAuth } from './AuthContext';
import { getProfile } from '../services/firestore/userService';

const StudentProfileContext = createContext(null);

export function StudentProfileProvider({ children }) {
  const { email, loading: authLoading } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;

    if (!email) {
      setProfile(null);
      setLoading(false);
      return;
    }

    let active = true;
    setLoading(true);
    getProfile(email)
      .then((loaded) => {
        if (active) setProfile(loaded);
      })
      .catch((err) => {
        console.warn('StudentProfileProvider: profile load failed', err);
        if (active) setProfile(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [email, authLoading]);

  const refreshProfile = useCallback(async () => {
    if (!email) return null;
    const loaded = await getProfile(email);
    setProfile(loaded);
    return loaded;
  }, [email]);

  return (
    <StudentProfileContext.Provider value={{ profile, loading, refreshProfile }}>
      {children}
    </StudentProfileContext.Provider>
  );
}

export function useStudentProfile() {
  return useContext(StudentProfileContext);
}
