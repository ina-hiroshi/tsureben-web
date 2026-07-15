import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import dayjs from 'dayjs';
import {
  buildNotificationRequests,
  buildPlanNotificationBody,
  computeScheduleAt,
  getPlanNotificationPrefs,
  notificationIdFromEntryId,
  PLAN_NOTIFY_LEAD_OPTIONS,
} from './planNotificationSchedule.js';

describe('notificationIdFromEntryId', () => {
  it('returns a stable positive integer for the same entry id', () => {
    const id = notificationIdFromEntryId('entry-abc-123');
    assert.equal(notificationIdFromEntryId('entry-abc-123'), id);
    assert.ok(id > 0);
  });

  it('returns different ids for different entry ids', () => {
    assert.notEqual(
      notificationIdFromEntryId('entry-a'),
      notificationIdFromEntryId('entry-b')
    );
  });
});

describe('computeScheduleAt', () => {
  it('subtracts lead minutes from the plan start time', () => {
    const at = computeScheduleAt('2026-07-15', '10:00', 10);
    assert.equal(dayjs(at).format('YYYY-MM-DD HH:mm'), '2026-07-15 09:50');
  });

  it('supports crossing midnight when lead minutes spill to the previous day', () => {
    const at = computeScheduleAt('2026-07-15', '00:05', 10);
    assert.equal(dayjs(at).format('YYYY-MM-DD HH:mm'), '2026-07-14 23:55');
  });
});

describe('buildPlanNotificationBody', () => {
  it('includes subject, topic, and time range', () => {
    const body = buildPlanNotificationBody({
      subject: '数学',
      topic: '数II',
      start: '15:00',
      end: '16:00',
    });
    assert.equal(body, '「数学 / 数II」の学習予定（15:00〜16:00）です');
  });
});

describe('buildNotificationRequests', () => {
  const now = dayjs('2026-07-15T09:00:00').toDate();

  it('builds future notifications with lead minutes applied', () => {
    const requests = buildNotificationRequests(
      {
        '2026-07-15': {
          entries: [
            {
              id: 'plan-1',
              subject: '英語',
              topic: '長文',
              start: '10:00',
              end: '11:00',
            },
          ],
        },
      },
      { leadMinutes: 10, now }
    );

    assert.equal(requests.length, 1);
    assert.equal(requests[0].id, notificationIdFromEntryId('plan-1'));
    assert.equal(dayjs(requests[0].scheduleAt).format('HH:mm'), '09:50');
    assert.match(requests[0].body, /英語/);
  });

  it('excludes past notifications', () => {
    const requests = buildNotificationRequests(
      {
        '2026-07-15': {
          entries: [{ id: 'past', subject: '数学', topic: 'I', start: '08:00', end: '09:00' }],
        },
      },
      { leadMinutes: 0, now }
    );

    assert.equal(requests.length, 0);
  });

  it('sorts by schedule time and limits the number of notifications', () => {
    const daysMap = {};
    for (let day = 0; day < 3; day += 1) {
      const dateKey = dayjs('2026-07-15').add(day, 'day').format('YYYY-MM-DD');
      daysMap[dateKey] = {
        entries: Array.from({ length: 25 }, (_, index) => ({
          id: `plan-${day}-${index}`,
          subject: '理科',
          topic: `単元${index}`,
          start: `${String(8 + Math.floor(index / 12)).padStart(2, '0')}:${String((index * 5) % 60).padStart(2, '0')}`,
          end: '23:59',
        })),
      };
    }

    const requests = buildNotificationRequests(daysMap, { leadMinutes: 0, now, maxCount: 60 });

    assert.equal(requests.length, 60);
    for (let i = 1; i < requests.length; i += 1) {
      assert.ok(requests[i].scheduleAt >= requests[i - 1].scheduleAt);
    }
  });
});

describe('getPlanNotificationPrefs', () => {
  it('defaults to disabled with 10 minute lead', () => {
    assert.deepEqual(getPlanNotificationPrefs(null), {
      enabled: false,
      leadMinutes: 10,
    });
  });

  it('reads stored preferences when valid', () => {
    assert.deepEqual(
      getPlanNotificationPrefs({
        planNotifyEnabled: true,
        planNotifyLeadMinutes: 15,
      }),
      { enabled: true, leadMinutes: 15 }
    );
  });

  it('falls back to default lead minutes for invalid values', () => {
    assert.deepEqual(
      getPlanNotificationPrefs({
        planNotifyEnabled: true,
        planNotifyLeadMinutes: 99,
      }),
      { enabled: true, leadMinutes: 10 }
    );
    assert.ok(PLAN_NOTIFY_LEAD_OPTIONS.includes(10));
  });
});
