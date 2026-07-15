import dayjs from 'dayjs';

export const PLAN_NOTIFY_LEAD_OPTIONS = [0, 5, 10, 15, 30];
export const DEFAULT_PLAN_NOTIFY_LEAD_MINUTES = 10;
export const PLAN_NOTIFICATION_SCHEDULE_DAYS = 14;
export const MAX_PLAN_NOTIFICATIONS = 60;

/**
 * @param {string} entryId
 * @returns {number}
 */
export function notificationIdFromEntryId(entryId) {
  let hash = 0;
  for (let i = 0; i < entryId.length; i += 1) {
    hash = (hash * 31 + entryId.charCodeAt(i)) >>> 0;
  }
  return (hash % 2147483646) + 1;
}

/**
 * @param {string} dateKey YYYY-MM-DD
 * @param {string} startTime HH:mm
 * @param {number} leadMinutes
 * @returns {Date}
 */
export function computeScheduleAt(dateKey, startTime, leadMinutes) {
  const [hours, minutes] = startTime.split(':').map(Number);
  return dayjs(dateKey)
    .hour(hours)
    .minute(minutes)
    .second(0)
    .millisecond(0)
    .subtract(leadMinutes, 'minute')
    .toDate();
}

/**
 * @param {{ subject?: string; topic?: string; start?: string; end?: string }} entry
 * @returns {string}
 */
export function buildPlanNotificationBody(entry) {
  const subject = entry.subject?.trim() || '学習';
  const topic = entry.topic?.trim();
  const label = topic ? `「${subject} / ${topic}」` : `「${subject}」`;
  const timeRange =
    entry.start && entry.end ? `（${entry.start}〜${entry.end}）` : entry.start ? `（${entry.start}〜）` : '';
  return `${label}の学習予定${timeRange}です`;
}

/**
 * @param {Record<string, { entries?: Array<object> }>} daysMap
 * @param {{ leadMinutes: number; now?: Date; maxCount?: number }} options
 * @returns {Array<{
 *   id: number;
 *   entryId: string;
 *   dateKey: string;
 *   scheduleAt: Date;
 *   title: string;
 *   body: string;
 * }>}
 */
export function buildNotificationRequests(
  daysMap,
  { leadMinutes, now = new Date(), maxCount = MAX_PLAN_NOTIFICATIONS }
) {
  const candidates = [];

  for (const [dateKey, dayData] of Object.entries(daysMap || {})) {
    const entries = dayData?.entries || [];
    for (const entry of entries) {
      if (!entry?.id || !entry?.start) continue;

      const scheduleAt = computeScheduleAt(dateKey, entry.start, leadMinutes);
      if (scheduleAt.getTime() <= now.getTime()) continue;

      candidates.push({
        id: notificationIdFromEntryId(entry.id),
        entryId: entry.id,
        dateKey,
        scheduleAt,
        title: '学習予定',
        body: buildPlanNotificationBody(entry),
      });
    }
  }

  candidates.sort((a, b) => a.scheduleAt.getTime() - b.scheduleAt.getTime());
  return candidates.slice(0, maxCount);
}

/**
 * @param {object | null | undefined} profile
 * @returns {{ enabled: boolean; leadMinutes: number }}
 */
export function getPlanNotificationPrefs(profile) {
  const enabled = profile?.planNotifyEnabled === true;
  const rawLead = profile?.planNotifyLeadMinutes;
  const leadMinutes = PLAN_NOTIFY_LEAD_OPTIONS.includes(rawLead)
    ? rawLead
    : DEFAULT_PLAN_NOTIFY_LEAD_MINUTES;
  return { enabled, leadMinutes };
}
