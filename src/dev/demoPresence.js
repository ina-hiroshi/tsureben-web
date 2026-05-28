import { isDemoFeatureEnabled } from './demoSettings';

export function isDemoPresenceEnabled() {
  return isDemoFeatureEnabled('presence');
}

export const DEMO_PRESENCE_USERS = [
  {
    email: 'demo-tanaka@tsureben.dev',
    name: '田中 花子',
    subject: '数学',
    topic: '数A',
    book: 'チャート式',
    startTime: '09:15',
  },
  {
    email: 'demo-sato@tsureben.dev',
    name: '佐藤 健太',
    subject: '英語',
    topic: '長文読解',
    book: 'ポレポレ',
    startTime: '10:30',
  },
  {
    email: 'demo-yamada@tsureben.dev',
    name: '山田 美咲',
    subject: '国語',
    topic: '現代文',
    book: 'センター過去問',
    startTime: '11:00',
  },
  {
    email: 'demo-suzuki@tsureben.dev',
    name: '鈴木 大輔',
    subject: '理科',
    topic: '物理',
    book: '物理のエッセンス',
    startTime: '13:00',
  },
  {
    email: 'demo-takahashi@tsureben.dev',
    name: '高橋 翔',
    subject: '社会',
    topic: '日本史',
    book: '詳説世界史',
    startTime: '09:45',
  },
  {
    email: 'demo-itou@tsureben.dev',
    name: '伊藤 結衣',
    subject: '数学',
    topic: '数B',
    book: '青チャート',
    startTime: '10:00',
  },
  {
    email: 'demo-watanabe@tsureben.dev',
    name: '渡辺 蓮',
    subject: '英語',
    topic: '英作文',
    book: 'ポレポレ',
    startTime: '11:30',
  },
  {
    email: 'demo-kobayashi@tsureben.dev',
    name: '小林 陽菜',
    subject: '理科',
    topic: '化学',
    book: '良問の風',
    startTime: '12:15',
  },
  {
    email: 'demo-kato@tsureben.dev',
    name: '加藤 悠真',
    subject: '情報',
    topic: 'Python',
    book: '情報I',
    startTime: '14:00',
  },
  {
    email: 'demo-yoshida@tsureben.dev',
    name: '吉田 さくら',
    subject: '国語',
    topic: '古文',
    book: '読解の技術',
    startTime: '14:30',
  },
];

export function getDemoPresenceUsers() {
  const limit = Number(import.meta.env.VITE_DEMO_PRESENCE_COUNT);
  if (!Number.isFinite(limit) || limit <= 0) return DEMO_PRESENCE_USERS;
  return DEMO_PRESENCE_USERS.slice(0, limit);
}

export function mergeDemoPresenceUsers(realUsers, myEmail) {
  if (!isDemoPresenceEnabled()) return realUsers;
  const realEmails = new Set(realUsers.map((u) => u.email));
  const demos = getDemoPresenceUsers().filter(
    (u) => u.email !== myEmail && !realEmails.has(u.email)
  );
  return [...demos, ...realUsers];
}
