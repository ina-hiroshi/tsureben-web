import dayjs from 'dayjs';
import { flattenDayPlans } from '../utils/planUtils';
import { enumerateDateKeys } from '../utils/studyPeriod';
import { isDemoDataActive, isDemoFeatureEnabled } from './demoSettings';

const DEMO_REVIEW_EMAIL_PREFIX = 'demo-review-';

const SUBJECTS = ['国語', '数学', '英語', '理科', '社会', '情報'];
const TOPICS = {
  国語: ['現代文', '古文', '漢文'],
  数学: ['二次関数', '三角比', '数B'],
  英語: ['長文読解', '文法', 'リスニング'],
  理科: ['化学反応', '力学', '遺伝'],
  社会: ['日本史', '世界史', '地理'],
  情報: ['Python', 'アルゴリズム'],
};
const BOOKS = ['チャート', '問題精講', '一問一答', '過去問'];
const CONTENTS = ['復習', '演習', '確認テスト', '弱点補強', '予習'];

function seedHash(input) {
  let hash = 0;
  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

function pick(list, hash, salt = 0) {
  return list[(hash + salt) % list.length];
}

function buildPlans(studentEmail, dateKey, hash, count) {
  const plans = [];
  let startHour = 16 + (hash % 2);

  for (let i = 0; i < count; i += 1) {
    const subject = pick(SUBJECTS, hash, i);
    const topic = pick(TOPICS[subject], hash, i + 3);
    const durationSlots = [60, 90, 45][(hash + i) % 3];
    const startMin = (hash + i * 7) % 2 === 0 ? 0 : 30;
    const start = `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}`;
    const endTotal = startHour * 60 + startMin + durationSlots;
    const end = `${String(Math.floor(endTotal / 60)).padStart(2, '0')}:${String(endTotal % 60).padStart(2, '0')}`;

    plans.push({
      id: `demo-plan-${hash}-${dateKey}-${i}`,
      start,
      end,
      subject,
      topic,
      book: pick(BOOKS, hash, i),
      content: `${topic}の${pick(CONTENTS, hash, i + 1)}`,
    });
    startHour += Math.ceil(durationSlots / 60) + 1;
  }

  return plans;
}

function buildLogs(studentEmail, dateKey, hash, count) {
  const entries = [];
  const bySubject = {};
  let totalMinutes = 0;
  let startHour = 16 + ((hash >> 3) % 2);

  for (let i = 0; i < count; i += 1) {
    const subject = pick(SUBJECTS, hash, i + 5);
    const topic = pick(TOPICS[subject], hash, i + 8);
    const duration = 30 + ((hash + i * 11) % 5) * 15;
    totalMinutes += duration;
    bySubject[subject] = (bySubject[subject] || 0) + duration;
    entries.push({
      id: `demo-log-${hash}-${dateKey}-${i}`,
      startTime: `${String(startHour).padStart(2, '0')}:${String((hash + i * 13) % 6 * 10).padStart(2, '0')}`,
      duration,
      subject,
      topic,
      book: pick(BOOKS, hash, i + 2),
      content: `${topic}を中心に${pick(CONTENTS, hash, i + 4)}`,
    });
    startHour += 1 + (i % 2);
  }

  return { entries, totalMinutes, bySubject };
}

const EMPTY_LOGS = { entries: [], totalMinutes: 0, bySubject: {} };

export function isDemoStudyDataEnabled() {
  return isDemoFeatureEnabled('studyData');
}

export function isDemoReviewStudentEmail(email) {
  return (
    typeof email === 'string' &&
    email.startsWith(DEMO_REVIEW_EMAIL_PREFIX) &&
    email.endsWith('@tsureben.dev')
  );
}

export function shouldUseDemoStudyData(email) {
  if (!isDemoDataActive() || !email) return false;
  if (isDemoFeatureEnabled('teacherReview') && isDemoReviewStudentEmail(email)) {
    return true;
  }
  return isDemoStudyDataEnabled();
}

export function getDemoStudyDayData(studentEmail, dateKey) {
  const hash = seedHash(`${studentEmail}:${dateKey}`);
  const date = dayjs(dateKey);
  const today = dayjs().startOf('day');
  const isFuture = date.isAfter(today, 'day');
  const isToday = date.isSame(today, 'day');

  if (!isToday && hash % 20 === 0) {
    return { plans: [], dayLogs: EMPTY_LOGS };
  }

  const planCount = (hash % 3) + 2;
  const hasPlans = isFuture || isToday || hash % 6 !== 0;
  const plans = hasPlans ? buildPlans(studentEmail, dateKey, hash, planCount) : [];

  if (isFuture) {
    return { plans, dayLogs: EMPTY_LOGS };
  }

  const logCount = Math.max(1, planCount - (hash % 2));
  const dayLogs = buildLogs(studentEmail, dateKey, hash, logCount);

  return { plans, dayLogs };
}

export function getDemoStudyRangeData(studentEmail, startDate, endDate) {
  const logsByDay = {};
  const plansByDay = {};

  for (const dateKey of enumerateDateKeys(startDate, endDate)) {
    const { plans, dayLogs } = getDemoStudyDayData(studentEmail, dateKey);
    const flatPlans = flattenDayPlans({ entries: plans });
    if (flatPlans.length) plansByDay[dateKey] = flatPlans;
    if ((dayLogs.entries?.length || 0) > 0 || (dayLogs.totalMinutes || 0) > 0) {
      logsByDay[dateKey] = dayLogs;
    }
  }

  return { logsByDay, plansByDay };
}
