import dayjs from 'dayjs';
import { compareNatural } from '../utils/adminStudents';

import { isDemoFeatureEnabled } from './demoSettings';
import {
  getDemoStudyDayData,
  getDemoStudyRangeData,
  isDemoReviewStudentEmail,
} from './demoStudyData';

export function isDemoTeacherReviewEnabled() {
  return isDemoFeatureEnabled('teacherReview');
}

export const DEMO_TEACHER_REVIEW_EMAIL_PREFIX = 'demo-review-';

const DEMO_TEACHER_EMAIL = 'demo-teacher@tsureben.dev';
const DEMO_TEACHER_NAME = 'デモ 先生';

const SURNAMES = [
  '青木', '赤坂', '江川', '浅野', '新井', '飯島', '飯塚', '生田', '池田', '石川',
  '岩澤', '上田', '内田', '大野', '小松', '加藤', '木村', '桐山', '久保', '黒田',
  '後藤', '斎藤', '坂本', '佐々木', '佐藤', '篠原', '柴田', '清水', '杉山', '鈴木',
  '高橋', '田中', '田辺', '千葉', '辻', '中村', '西村', '野口', '原田', '平野',
  '藤田', '松本', '三浦', '村田', '森', '山口', '山田', '吉田', '渡辺', '綿引',
];

const GIVEN_NAMES = [
  '志穏', '友栄', '美歩', '椿', '旺佑', '秀吾', '優太郎', '恵樹', '恒太', '美結',
  '向', '璃桜', '亜門', '健', '陽菜', '翔', '結衣', '蓮', '悠真', 'さくら',
  '大輔', '美咲', '直樹', '真央', '颯太', '彩花', '涼', '心春', '蒼', 'ひなた',
];

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

function fakeTimestamp(dateKey, hour, minute) {
  const date = dayjs(`${dateKey}T${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}:00`);
  return {
    toDate: () => date.toDate(),
    toMillis: () => date.valueOf(),
  };
}

function buildDemoStudents() {
  const students = [];
  let nameIndex = 0;

  for (const grade of ['1', '2', '3']) {
    for (let classNum = 1; classNum <= 8; classNum += 1) {
      for (let number = 1; number <= 5; number += 1) {
        const email = `${DEMO_TEACHER_REVIEW_EMAIL_PREFIX}${grade}-${classNum}-${number}@tsureben.dev`;
        students.push({
          email,
          role: 'student',
          schoolId: '__demo_school__',
          name: `${pick(SURNAMES, nameIndex)} ${pick(GIVEN_NAMES, nameIndex, 7)}`,
          grade,
          class: String(classNum),
          number: String(number),
        });
        nameIndex += 1;
      }
    }
  }

  return students.sort((a, b) => {
    const byGrade = compareNatural(a.grade, b.grade);
    if (byGrade !== 0) return byGrade;
    const byClass = compareNatural(a.class, b.class);
    if (byClass !== 0) return byClass;
    return compareNatural(a.number, b.number);
  });
}

const DEMO_STUDENTS = buildDemoStudents();

export function getDemoTeacherReviewStudents() {
  if (!isDemoTeacherReviewEnabled()) return [];
  return DEMO_STUDENTS;
}

const DEMO_THREADS_BY_STUDENT = Object.fromEntries(
  DEMO_STUDENTS.map((student, index) => {
    const threads = [];
    const today = dayjs().format('YYYY-MM-DD');
    const yesterday = dayjs().subtract(1, 'day').format('YYYY-MM-DD');

    threads.push({
      id: `demo-thread-daily-${student.email}-${today}`,
      studentEmail: student.email,
      schoolId: '__demo_school__',
      scope: 'daily',
      dateKey: today,
      title: `${dayjs(today).format('M月D日')}の学習について`,
      createdBy: DEMO_TEACHER_EMAIL,
      createdByName: DEMO_TEACHER_NAME,
      createdAt: fakeTimestamp(today, 9, 0),
      updatedAt: fakeTimestamp(today, 18, 30),
      lastMessageAt: fakeTimestamp(today, 18, 30),
      unreadByStudent: index % 5 === 0,
      unreadByTeacher: index % 7 === 0,
    });

    if (index % 3 !== 0) {
      threads.push({
        id: `demo-thread-daily-${student.email}-${yesterday}`,
        studentEmail: student.email,
        schoolId: '__demo_school__',
        scope: 'daily',
        dateKey: yesterday,
        title: `${dayjs(yesterday).format('M月D日')}の学習について`,
        createdBy: DEMO_TEACHER_EMAIL,
        createdByName: DEMO_TEACHER_NAME,
        createdAt: fakeTimestamp(yesterday, 10, 0),
        updatedAt: fakeTimestamp(yesterday, 20, 0),
        lastMessageAt: fakeTimestamp(yesterday, 20, 0),
        unreadByStudent: false,
        unreadByTeacher: false,
      });
    }

    if (index % 4 === 0) {
      threads.push({
        id: `demo-thread-general-${student.email}`,
        studentEmail: student.email,
        schoolId: '__demo_school__',
        scope: 'general',
        dateKey: null,
        title: '全体のフィードバック',
        createdBy: DEMO_TEACHER_EMAIL,
        createdByName: DEMO_TEACHER_NAME,
        createdAt: fakeTimestamp(today, 8, 0),
        updatedAt: fakeTimestamp(today, 16, 0),
        lastMessageAt: fakeTimestamp(today, 16, 0),
        unreadByStudent: index % 8 === 0,
        unreadByTeacher: false,
      });
    }

    return [student.email, threads];
  })
);

const DEMO_MESSAGES_BY_THREAD = {};

for (const [email, threads] of Object.entries(DEMO_THREADS_BY_STUDENT)) {
  for (const thread of threads) {
    const hash = seedHash(email + thread.id);
    const messages = [
      {
        id: `${thread.id}-msg-1`,
        authorEmail: DEMO_TEACHER_EMAIL,
        authorRole: 'teacher',
        authorName: DEMO_TEACHER_NAME,
        body: `${thread.scope === 'daily' ? 'この日の学習量は順調です。' : '今週も継続できていて良いです。'}引き続き計画通り進めましょう。`,
        createdAt: fakeTimestamp(thread.dateKey || dayjs().format('YYYY-MM-DD'), 9, 15),
      },
    ];

    if (hash % 3 !== 0) {
      messages.push({
        id: `${thread.id}-msg-2`,
        authorEmail: email,
        authorRole: 'student',
        authorName: DEMO_STUDENTS.find((s) => s.email === email)?.name || '生徒',
        body: 'ありがとうございます。明日も頑張ります。',
        createdAt: fakeTimestamp(thread.dateKey || dayjs().format('YYYY-MM-DD'), 19, 40),
      });
    }

    if (hash % 5 === 0) {
      messages.push({
        id: `${thread.id}-msg-3`,
        authorEmail: DEMO_TEACHER_EMAIL,
        authorRole: 'teacher',
        authorName: DEMO_TEACHER_NAME,
        body: '数学の記録時間が増えています。英語もバランスを意識してみてください。',
        createdAt: fakeTimestamp(thread.dateKey || dayjs().format('YYYY-MM-DD'), 20, 5),
      });
    }

    DEMO_MESSAGES_BY_THREAD[thread.id] = messages;
  }
}

export function isDemoTeacherReviewEmail(email) {
  return isDemoReviewStudentEmail(email);
}

export function isDemoFeedbackThreadId(threadId) {
  return typeof threadId === 'string' && threadId.startsWith('demo-thread-');
}

export function mergeDemoStudents(students = []) {
  if (!isDemoTeacherReviewEnabled()) return students;

  const existing = new Set(students.map((s) => s.email));
  const merged = [...students];
  for (const demo of DEMO_STUDENTS) {
    if (!existing.has(demo.email)) merged.push(demo);
  }

  return merged.sort((a, b) => {
    const byGrade = compareNatural(a.grade, b.grade);
    if (byGrade !== 0) return byGrade;
    const byClass = compareNatural(a.class, b.class);
    if (byClass !== 0) return byClass;
    return compareNatural(a.number, b.number);
  });
}

export function getDemoStudentDayData(studentEmail, dateKey) {
  return getDemoStudyDayData(studentEmail, dateKey);
}

export function getDemoStudentRangeData(studentEmail, startDate, endDate) {
  return getDemoStudyRangeData(studentEmail, startDate, endDate);
}

export function getDemoFeedbackThreads(studentEmail) {
  return [...(DEMO_THREADS_BY_STUDENT[studentEmail] || [])].sort(
    (a, b) => (b.lastMessageAt?.toMillis?.() || 0) - (a.lastMessageAt?.toMillis?.() || 0)
  );
}

export function getDemoFeedbackMessages(threadId) {
  return [...(DEMO_MESSAGES_BY_THREAD[threadId] || [])];
}

export function getDemoStudentProfile(studentEmail) {
  return DEMO_STUDENTS.find((s) => s.email === studentEmail) || null;
}

export const DEMO_TEACHER_REVIEW_STUDENT_COUNT = DEMO_STUDENTS.length;
