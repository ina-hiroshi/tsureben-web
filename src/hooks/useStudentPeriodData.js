import { useCallback, useEffect, useMemo, useState } from 'react';
import { getDayLogs, getDayRange } from '../services/firestore/logService';
import { getDayPlans, getDayPlansRange } from '../services/firestore/planService';
import { flattenDayPlans } from '../utils/planUtils';
import {
  aggregateLogsFromRange,
  aggregatePlansFromRange,
  buildDailyTotals,
  buildLogGroups,
  buildPlanDailyOverview,
  buildPlanGroups,
  enumerateDateKeys,
  getPeriodBounds,
} from '../utils/studyPeriod';
import {
  shouldUseDemoStudyData,
  getDemoStudyDayData,
  getDemoStudyRangeData,
} from '../dev/demoStudyData';
import { useDemoSettingsRevision } from './useDemoSettings';

const EMPTY_LOGS = { entries: [], totalMinutes: 0, bySubject: {} };
const EMPTY_PLANS = {
  entries: [],
  totalCount: 0,
  planDayCount: 0,
  totalPlannedMinutes: 0,
  bySubject: {},
};

export function useStudentPeriodData(studentEmail, anchorDate, periodMode = 'day') {
  const demoRevision = useDemoSettingsRevision();
  const [loading, setLoading] = useState(false);
  const [plans, setPlans] = useState([]);
  const [dayLogs, setDayLogs] = useState(EMPTY_LOGS);
  const [planGroups, setPlanGroups] = useState([]);
  const [logGroups, setLogGroups] = useState([]);
  const [aggregatedLogs, setAggregatedLogs] = useState(EMPTY_LOGS);
  const [aggregatedPlans, setAggregatedPlans] = useState(EMPTY_PLANS);
  const [planDailyOverview, setPlanDailyOverview] = useState([]);
  const [dailyTotals, setDailyTotals] = useState([]);
  const [studyDayCount, setStudyDayCount] = useState(0);

  const { startDate, endDate } = useMemo(
    () => getPeriodBounds(anchorDate, periodMode),
    [anchorDate, periodMode]
  );

  const dateKeys = useMemo(
    () => enumerateDateKeys(startDate, endDate),
    [startDate, endDate]
  );

  const reload = useCallback(async () => {
    if (!studentEmail || !startDate || !endDate) {
      setPlans([]);
      setDayLogs(EMPTY_LOGS);
      setPlanGroups([]);
      setLogGroups([]);
      setAggregatedLogs(EMPTY_LOGS);
      setAggregatedPlans(EMPTY_PLANS);
      setPlanDailyOverview([]);
      setDailyTotals([]);
      setStudyDayCount(0);
      return;
    }

    setLoading(true);
    try {
      if (shouldUseDemoStudyData(studentEmail)) {
        if (periodMode === 'day') {
          const demo = getDemoStudyDayData(studentEmail, startDate);
          setPlans(demo.plans);
          setDayLogs(demo.dayLogs);
          setPlanGroups([]);
          setLogGroups([]);
          setAggregatedLogs(EMPTY_LOGS);
          setAggregatedPlans(EMPTY_PLANS);
          setPlanDailyOverview([]);
          setDailyTotals([]);
          setStudyDayCount(0);
          return;
        }

        const { logsByDay, plansByDay } = getDemoStudyRangeData(
          studentEmail,
          startDate,
          endDate
        );
        applyRangeData(logsByDay, plansByDay, dateKeys);
        setPlans([]);
        setDayLogs(EMPTY_LOGS);
        return;
      }

      if (periodMode === 'day') {
        const [dayPlans, logs] = await Promise.all([
          getDayPlans(studentEmail, startDate),
          getDayLogs(studentEmail, startDate),
        ]);
        setPlans(flattenDayPlans(dayPlans));
        setDayLogs({
          entries: logs.entries || [],
          totalMinutes: logs.totalMinutes || 0,
          bySubject: logs.bySubject || {},
        });
        setPlanGroups([]);
        setLogGroups([]);
        setAggregatedLogs(EMPTY_LOGS);
        setAggregatedPlans(EMPTY_PLANS);
        setPlanDailyOverview([]);
        setDailyTotals([]);
        setStudyDayCount(0);
        return;
      }

      const [logsRange, plansRange] = await Promise.all([
        getDayRange(studentEmail, startDate, endDate),
        getDayPlansRange(studentEmail, startDate, endDate),
      ]);

      const plansByDay = {};
      for (const dateKey of dateKeys) {
        const flat = flattenDayPlans(plansRange[dateKey] || { entries: [] });
        if (flat.length) plansByDay[dateKey] = flat;
      }

      applyRangeData(logsRange, plansByDay, dateKeys);
      setPlans([]);
      setDayLogs(EMPTY_LOGS);
    } catch (err) {
      console.error('useStudentPeriodData load error:', err);
      setPlans([]);
      setDayLogs(EMPTY_LOGS);
      setPlanGroups([]);
      setLogGroups([]);
      setAggregatedLogs(EMPTY_LOGS);
      setAggregatedPlans(EMPTY_PLANS);
      setPlanDailyOverview([]);
      setDailyTotals([]);
      setStudyDayCount(0);
    } finally {
      setLoading(false);
    }

    function applyRangeData(logsByDay, plansByDay, keys) {
      const aggregated = aggregateLogsFromRange(logsByDay, keys);
      const plansAgg = aggregatePlansFromRange(plansByDay, keys);
      setPlanGroups(buildPlanGroups(plansByDay, keys));
      setLogGroups(buildLogGroups(logsByDay, keys));
      setAggregatedLogs({
        entries: aggregated.entries,
        totalMinutes: aggregated.totalMinutes,
        bySubject: aggregated.bySubject,
      });
      setAggregatedPlans(plansAgg);
      setPlanDailyOverview(buildPlanDailyOverview(plansByDay, keys));
      setDailyTotals(buildDailyTotals(logsByDay, keys));
      setStudyDayCount(aggregated.studyDayCount);
    }
  }, [studentEmail, startDate, endDate, periodMode, dateKeys, demoRevision]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    loading,
    startDate,
    endDate,
    plans,
    dayLogs,
    planGroups,
    logGroups,
    aggregatedLogs,
    aggregatedPlans,
    planDailyOverview,
    dailyTotals,
    studyDayCount,
    reload,
  };
}
