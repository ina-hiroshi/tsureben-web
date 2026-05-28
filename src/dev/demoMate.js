import { isDemoFeatureEnabled } from './demoSettings';

export function isDemoMateEnabled() {
  return isDemoFeatureEnabled('mate');
}

export const DEMO_MATE_EMAIL_PREFIX = 'demo-mate-';

const DEMO_MUTUAL = [
  {
    email: 'demo-mate-mutual-1@tsureben.dev',
    name: '田中 花子',
    schoolName: 'デモ高等学校',
    grade: '3',
    class: '1',
    number: '12',
  },
  {
    email: 'demo-mate-mutual-2@tsureben.dev',
    name: '佐藤 健太',
    schoolName: 'デモ高等学校',
    grade: '2',
    class: '4',
    number: '7',
  },
  {
    email: 'demo-mate-mutual-3@tsureben.dev',
    name: '山田 美咲',
    schoolName: 'デモ高等学校',
    grade: '1',
    class: '2',
    number: '18',
  },
  {
    email: 'demo-mate-mutual-4@tsureben.dev',
    name: '鈴木 大輔',
    schoolName: 'デモ高等学校',
    grade: '3',
    class: '3',
    number: '5',
  },
  {
    email: 'demo-mate-mutual-5@tsureben.dev',
    name: '高橋 翔',
    schoolName: 'デモ高等学校',
    grade: '2',
    class: '1',
    number: '22',
  },
  {
    email: 'demo-mate-mutual-6@tsureben.dev',
    name: '伊藤 結衣',
    schoolName: 'デモ高等学校',
    grade: '1',
    class: '5',
    number: '3',
  },
  {
    email: 'demo-mate-mutual-7@tsureben.dev',
    name: '渡辺 蓮',
    schoolName: 'デモ高等学校',
    grade: '3',
    class: '2',
    number: '9',
  },
  {
    email: 'demo-mate-mutual-8@tsureben.dev',
    name: '小林 陽菜',
    schoolName: 'デモ高等学校',
    grade: '2',
    class: '6',
    number: '14',
  },
  {
    email: 'demo-mate-mutual-9@tsureben.dev',
    name: '加藤 悠真',
    schoolName: 'デモ高等学校',
    grade: '1',
    class: '3',
    number: '27',
  },
  {
    email: 'demo-mate-mutual-10@tsureben.dev',
    name: '吉田 さくら',
    schoolName: 'デモ高等学校',
    grade: '3',
    class: '4',
    number: '1',
  },
];

const DEMO_RECEIVED = [
  {
    email: 'demo-mate-received-1@tsureben.dev',
    name: '鈴木 大輔',
    schoolName: 'デモ高等学校',
    grade: '3',
    class: '3',
    number: '5',
  },
  {
    email: 'demo-mate-received-2@tsureben.dev',
    name: '高橋 翔',
    schoolName: 'デモ高等学校',
    grade: '2',
    class: '1',
    number: '22',
  },
  {
    email: 'demo-mate-received-3@tsureben.dev',
    name: '伊藤 結衣',
    schoolName: 'デモ高等学校',
    grade: '1',
    class: '5',
    number: '3',
  },
];

const DEMO_SENT = [
  {
    email: 'demo-mate-sent-1@tsureben.dev',
    name: '渡辺 蓮',
    schoolName: 'デモ高等学校',
    grade: '3',
    class: '2',
    number: '9',
  },
  {
    email: 'demo-mate-sent-2@tsureben.dev',
    name: '小林 陽菜',
    schoolName: 'デモ高等学校',
    grade: '2',
    class: '6',
    number: '14',
  },
  {
    email: 'demo-mate-sent-3@tsureben.dev',
    name: '加藤 悠真',
    schoolName: 'デモ高等学校',
    grade: '1',
    class: '3',
    number: '27',
  },
];

function profilesFromList(list) {
  return Object.fromEntries(list.map((u) => [u.email, u]));
}

export const DEMO_MATE_PROFILES = {
  ...profilesFromList(DEMO_MUTUAL),
  ...profilesFromList(DEMO_RECEIVED),
  ...profilesFromList(DEMO_SENT),
};

export function isDemoMateEmail(email) {
  return (
    typeof email === 'string' &&
    email.startsWith(DEMO_MATE_EMAIL_PREFIX) &&
    email.endsWith('@tsureben.dev')
  );
}

function appendDemoEmails(targetList, demos, myEmail) {
  const next = [...targetList];
  for (const { email } of demos) {
    if (email === myEmail || next.includes(email)) continue;
    next.push(email);
  }
  return next;
}

/**
 * @param {object} state - loadMateProfiles の戻り値
 * @param {string} myEmail
 */
export function mergeDemoMateState(state, myEmail) {
  if (!isDemoMateEnabled() || !myEmail) return state;

  return {
    ...state,
    mutualMates: appendDemoEmails(state.mutualMates || [], DEMO_MUTUAL, myEmail),
    pendingReceived: appendDemoEmails(state.pendingReceived || [], DEMO_RECEIVED, myEmail),
    pendingSent: appendDemoEmails(state.pendingSent || [], DEMO_SENT, myEmail),
    profiles: {
      ...(state.profiles || {}),
      ...DEMO_MATE_PROFILES,
    },
  };
}
