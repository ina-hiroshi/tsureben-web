import { useEffect } from 'react';
import { useTeacherStatus } from '../../hooks/useTeacherStatus';
import {
  isDemoEnvironment,
  setDemoSettingsManagerAllowed,
} from '../../dev/demoSettings';

export default function DemoSettingsAccessSync() {
  const { isSuperAdmin, loading } = useTeacherStatus();

  useEffect(() => {
    if (loading) return undefined;
    setDemoSettingsManagerAllowed(isSuperAdmin && isDemoEnvironment());
    return () => setDemoSettingsManagerAllowed(false);
  }, [isSuperAdmin, loading]);

  return null;
}
