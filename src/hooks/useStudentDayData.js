import { useCallback, useEffect, useState } from 'react';
import { getDayLogs } from '../services/firestore/logService';
import { getDayPlans } from '../services/firestore/planService';
import { flattenDayPlans } from '../utils/planUtils';
import {
  shouldUseDemoStudyData,
  getDemoStudyDayData,
} from '../dev/demoStudyData';
import { useDemoSettingsRevision } from './useDemoSettings';

export function useStudentDayData(studentEmail, dateKey) {
  const demoRevision = useDemoSettingsRevision();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [dayLogs, setDayLogs] = useState({
    entries: [],
    totalMinutes: 0,
    bySubject: {},
  });

  const reload = useCallback(async () => {
    if (!studentEmail || !dateKey) {
      setPlans([]);
      setDayLogs({ entries: [], totalMinutes: 0, bySubject: {} });
      return;
    }
    setLoading(true);
    try {
      if (shouldUseDemoStudyData(studentEmail)) {
        const demo = getDemoStudyDayData(studentEmail, dateKey);
        setPlans(demo.plans);
        setDayLogs(demo.dayLogs);
        return;
      }

      const [dayPlans, logs] = await Promise.all([
        getDayPlans(studentEmail, dateKey),
        getDayLogs(studentEmail, dateKey),
      ]);
      setPlans(flattenDayPlans(dayPlans));
      setDayLogs({
        entries: logs.entries || [],
        totalMinutes: logs.totalMinutes || 0,
        bySubject: logs.bySubject || {},
      });
    } catch (err) {
      console.error('useStudentDayData load error:', err);
      setPlans([]);
      setDayLogs({ entries: [], totalMinutes: 0, bySubject: {} });
    } finally {
      setLoading(false);
    }
  }, [studentEmail, dateKey, demoRevision]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { loading, plans, dayLogs, reload };
}
