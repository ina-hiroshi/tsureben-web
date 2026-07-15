import { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { isIOSNative } from '../utils/platformAccess';
import { syncPlanNotificationsForUser } from '../services/planNotificationService';

export function usePlanNotificationSync() {
  const { email, loading } = useAuth();

  useEffect(() => {
    if (!isIOSNative() || loading || !email) return;
    syncPlanNotificationsForUser(email);
  }, [email, loading]);
}
