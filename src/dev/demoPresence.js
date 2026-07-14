import { isDemoFeatureEnabled } from './demoSettings';
import { getDemoTeacherReviewStudents } from './demoTeacherReview';

const SESSION_PRESETS = [
  { subject: '数学', topic: '数A', book: 'チャート式', content: '第3章 確率', startTime: '09:15' },
  { subject: '英語', topic: '長文読解', book: 'ポレポレ', content: '2024 第2問', startTime: '10:30' },
  { subject: '国語', topic: '現代文', book: 'センター過去問', content: '評論 要約', startTime: '11:00' },
  { subject: '理科', topic: '物理', book: '物理のエッセンス', content: '力学 演習', startTime: '13:00' },
  { subject: '社会', topic: '日本史', book: '詳説世界史', content: '鎌倉時代', startTime: '09:45' },
  { subject: '数学', topic: '数B', book: '青チャート', content: '積分法', startTime: '10:00' },
  { subject: '英語', topic: '英作文', book: 'ポレポレ', content: '意見論述', startTime: '11:30' },
  { subject: '理科', topic: '化学', book: '良問の風', content: '有機化学', startTime: '12:15' },
  { subject: '情報', topic: 'Python', book: '情報I', content: 'リスト操作', startTime: '14:00' },
  { subject: '国語', topic: '古文', book: '読解の技術', content: '助動詞', startTime: '14:30' },
];

/** 生徒確認デモが無効のときのフォールバック（学年・組・番号付き） */
const LEGACY_DEMO_PRESENCE_USERS = [
  {
    email: 'demo-tanaka@tsureben.dev',
    name: '田中 花子',
    grade: '1',
    class: '1',
    number: '12',
    schoolId: '__demo_school__',
    subject: '数学',
    topic: '数A',
    book: 'チャート式',
    startTime: '09:15',
  },
  {
    email: 'demo-sato@tsureben.dev',
    name: '佐藤 健太',
    grade: '1',
    class: '2',
    number: '7',
    schoolId: '__demo_school__',
    subject: '英語',
    topic: '長文読解',
    book: 'ポレポレ',
    startTime: '10:30',
  },
  {
    email: 'demo-yamada@tsureben.dev',
    name: '山田 美咲',
    grade: '2',
    class: '1',
    number: '18',
    schoolId: '__demo_school__',
    subject: '国語',
    topic: '現代文',
    book: 'センター過去問',
    startTime: '11:00',
  },
  {
    email: 'demo-suzuki@tsureben.dev',
    name: '鈴木 大輔',
    grade: '2',
    class: '3',
    number: '5',
    schoolId: '__demo_school__',
    subject: '理科',
    topic: '物理',
    book: '物理のエッセンス',
    startTime: '13:00',
  },
  {
    email: 'demo-takahashi@tsureben.dev',
    name: '高橋 翔',
    grade: '3',
    class: '1',
    number: '22',
    schoolId: '__demo_school__',
    subject: '社会',
    topic: '日本史',
    book: '詳説世界史',
    startTime: '09:45',
  },
  {
    email: 'demo-itou@tsureben.dev',
    name: '伊藤 結衣',
    grade: '1',
    class: '1',
    number: '3',
    schoolId: '__demo_school__',
    subject: '数学',
    topic: '数B',
    book: '青チャート',
    startTime: '10:00',
  },
  {
    email: 'demo-watanabe@tsureben.dev',
    name: '渡辺 蓮',
    grade: '2',
    class: '2',
    number: '9',
    schoolId: '__demo_school__',
    subject: '英語',
    topic: '英作文',
    book: 'ポレポレ',
    startTime: '11:30',
  },
  {
    email: 'demo-kobayashi@tsureben.dev',
    name: '小林 陽菜',
    grade: '3',
    class: '2',
    number: '14',
    schoolId: '__demo_school__',
    subject: '理科',
    topic: '化学',
    book: '良問の風',
    startTime: '12:15',
  },
  {
    email: 'demo-kato@tsureben.dev',
    name: '加藤 悠真',
    grade: '1',
    class: '3',
    number: '27',
    schoolId: '__demo_school__',
    subject: '情報',
    topic: 'Python',
    book: '情報I',
    startTime: '14:00',
  },
  {
    email: 'demo-yoshida@tsureben.dev',
    name: '吉田 さくら',
    grade: '2',
    class: '1',
    number: '1',
    schoolId: '__demo_school__',
    subject: '国語',
    topic: '古文',
    book: '読解の技術',
    startTime: '14:30',
  },
];

function buildDemoPresenceUsers() {
  const students = getDemoTeacherReviewStudents();
  if (students.length > 0) {
    return students.slice(0, SESSION_PRESETS.length).map((student, index) => {
      const session = SESSION_PRESETS[index % SESSION_PRESETS.length];
      return {
        email: student.email,
        name: student.name,
        grade: student.grade,
        class: student.class,
        number: student.number,
        schoolId: student.schoolId,
        ...session,
      };
    });
  }
  return LEGACY_DEMO_PRESENCE_USERS;
}

export const DEMO_PRESENCE_USERS = buildDemoPresenceUsers();

export function isDemoPresenceEnabled() {
  return isDemoFeatureEnabled('presence');
}

export function getDemoPresenceUsers() {
  const users = buildDemoPresenceUsers();
  const limit = Number(import.meta.env.VITE_DEMO_PRESENCE_COUNT);
  if (!Number.isFinite(limit) || limit <= 0) return users;
  return users.slice(0, limit);
}

export function mergeDemoPresenceUsers(realUsers, myEmail) {
  if (!isDemoPresenceEnabled()) return realUsers;
  const realEmails = new Set(realUsers.map((u) => u.email));
  const demos = getDemoPresenceUsers().filter(
    (u) => u.email !== myEmail && !realEmails.has(u.email)
  );
  return [...demos, ...realUsers];
}
