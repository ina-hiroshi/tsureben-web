const STORAGE_KEY = 'tsureben.demoSettings';

export const DEMO_FEATURES = {
  teacherReview: {
    id: 'teacherReview',
    label: '生徒確認',
    description: '教員の生徒確認ページ用。120名のデモ生徒・学習計画・記録・フィードバックを表示します。',
  },
  mate: {
    id: 'mate',
    label: '連れ勉',
    description: '連れ勉ページ用。相互・申請中・受信待ちのデモ仲間を表示します。',
  },
  presence: {
    id: 'presence',
    label: '一緒に勉強中',
    description: 'ホーム・学習タイマー用。勉強中のデモユーザーをグリッドに表示します。',
  },
  studyData: {
    id: 'studyData',
    label: '学習計画・記録',
    description:
      '学習計画・学習記録ページ用。ログイン中ユーザーの計画・記録・週/月集計にデモデータを表示します。',
  },
};

const DEFAULTS = {
  teacherReview: true,
  mate: true,
  presence: true,
  studyData: true,
};

const listeners = new Set();

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULTS };
    const parsed = JSON.parse(raw);
    return {
      teacherReview: parsed.teacherReview !== false,
      mate: parsed.mate !== false,
      presence: parsed.presence !== false,
      studyData: parsed.studyData !== false,
    };
  } catch {
    return { ...DEFAULTS };
  }
}

let cached = readStored();
let managerAllowed = false;

function notify() {
  const snapshot = getDemoSettings();
  listeners.forEach((listener) => listener(snapshot));
}

export function isDemoEnvironment() {
  return import.meta.env.DEV;
}

export function setDemoSettingsManagerAllowed(allowed) {
  managerAllowed = Boolean(allowed);
}

export function canManageDemoSettings() {
  return isDemoEnvironment() && managerAllowed;
}

export function getDemoSettings() {
  if (!isDemoEnvironment()) {
    return { teacherReview: false, mate: false, presence: false, studyData: false };
  }
  return { ...cached };
}

export function isDemoFeatureEnabled(featureId) {
  if (!isDemoEnvironment()) return false;
  return cached[featureId] !== false;
}

export function setDemoFeatureEnabled(featureId, enabled) {
  if (!canManageDemoSettings()) return;
  cached = { ...cached, [featureId]: Boolean(enabled) };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  notify();
}

export function setAllDemoFeaturesEnabled(enabled) {
  if (!canManageDemoSettings()) return;
  cached = {
    teacherReview: Boolean(enabled),
    mate: Boolean(enabled),
    presence: Boolean(enabled),
    studyData: Boolean(enabled),
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  notify();
}

export function subscribeDemoSettings(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}
