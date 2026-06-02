import { useCallback, useEffect, useState } from 'react';
import {
  DEMO_FEATURES,
  canManageDemoSettings,
  getDemoSettings,
  isDemoDataActive,
  isDemoEnvironment,
  setAllDemoFeaturesEnabled,
  setDemoFeatureEnabled,
  subscribeDemoSettings,
} from '../dev/demoSettings';
import { useTeacherStatus } from './useTeacherStatus';

export function useDemoSettings() {
  const { isSuperAdmin } = useTeacherStatus();
  const [settings, setSettings] = useState(getDemoSettings);

  useEffect(() => subscribeDemoSettings(setSettings), []);

  const canManage = isSuperAdmin && canManageDemoSettings();

  const toggle = useCallback((featureId, enabled) => {
    if (!canManageDemoSettings()) return;
    setDemoFeatureEnabled(featureId, enabled);
  }, []);

  const setAll = useCallback((enabled) => {
    if (!canManageDemoSettings()) return;
    setAllDemoFeaturesEnabled(enabled);
  }, []);

  const allEnabled = Object.values(settings).every(Boolean);
  const allDisabled = Object.values(settings).every((value) => !value);

  return {
    isDev: isDemoEnvironment(),
    isDemoActive: isDemoDataActive(),
    canManage,
    settings,
    features: DEMO_FEATURES,
    toggle,
    setAll,
    allEnabled,
    allDisabled,
  };
}

export function useDemoSettingsRevision() {
  const [revision, setRevision] = useState(0);

  useEffect(() => subscribeDemoSettings(() => setRevision((value) => value + 1)), []);

  return revision;
}
