import { LocalNotifications } from '@capacitor/local-notifications';
import dayjs from 'dayjs';
import { isIOSNative } from '../utils/platformAccess';
import { getDayPlansRange } from './firestore/planService';
import { getProfile } from './firestore/userService';
import {
  buildNotificationRequests,
  getPlanNotificationPrefs,
  PLAN_NOTIFICATION_SCHEDULE_DAYS,
} from '../utils/planNotificationSchedule';

const PLAN_NOTIFICATION_EXTRA_TYPE = 'planReminder';

export { getPlanNotificationPrefs } from '../utils/planNotificationSchedule';
export {
  PLAN_NOTIFY_LEAD_OPTIONS,
  DEFAULT_PLAN_NOTIFY_LEAD_MINUTES,
} from '../utils/planNotificationSchedule';

export async function checkPlanNotificationPermission() {
  if (!isIOSNative()) return false;
  const { display } = await LocalNotifications.checkPermissions();
  return display === 'granted';
}

export async function requestPlanNotificationPermission() {
  if (!isIOSNative()) return false;
  const { display } = await LocalNotifications.requestPermissions();
  return display === 'granted';
}

async function cancelPlanNotifications() {
  if (!isIOSNative()) return;
  const pending = await LocalNotifications.getPending();
  const planIds = (pending.notifications || [])
    .filter((notification) => notification.extra?.type === PLAN_NOTIFICATION_EXTRA_TYPE)
    .map((notification) => ({ id: notification.id }));
  if (planIds.length > 0) {
    await LocalNotifications.cancel({ notifications: planIds });
  }
}

/**
 * @param {{ enabled: boolean; leadMinutes: number }} prefs
 */
export async function syncPlanNotifications(email, prefs) {
  if (!isIOSNative() || !email) return;

  await cancelPlanNotifications();

  if (!prefs?.enabled) return;

  const granted = await checkPlanNotificationPermission();
  if (!granted) return;

  const startDate = dayjs().format('YYYY-MM-DD');
  const endDate = dayjs().add(PLAN_NOTIFICATION_SCHEDULE_DAYS, 'day').format('YYYY-MM-DD');
  const daysMap = await getDayPlansRange(email, startDate, endDate);
  const requests = buildNotificationRequests(daysMap, {
    leadMinutes: prefs.leadMinutes,
  });

  if (requests.length === 0) return;

  await LocalNotifications.schedule({
    notifications: requests.map((request) => ({
      id: request.id,
      title: request.title,
      body: request.body,
      schedule: { at: request.scheduleAt },
      sound: 'default',
      extra: {
        type: PLAN_NOTIFICATION_EXTRA_TYPE,
        entryId: request.entryId,
        dateKey: request.dateKey,
      },
    })),
  });
}

export async function syncPlanNotificationsForUser(email) {
  if (!isIOSNative() || !email) return;
  try {
    const profile = await getProfile(email);
    const prefs = getPlanNotificationPrefs(profile);
    await syncPlanNotifications(email, prefs);
  } catch (err) {
    console.error('syncPlanNotificationsForUser error:', err);
  }
}
