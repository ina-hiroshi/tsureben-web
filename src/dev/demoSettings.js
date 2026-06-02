const STORAGE_KEY = 'tsureben.demoSettings';

export const DEMO_FEATURES = {
  teacherReview: {
    id: 'teacherReview',
    label: '生徒確認',
    description: '教員の生徒確認ページ用。120名のデモ生徒・学習計画・記録・フィードバックを表示します。',
  },
  teacherCommentAudit: {
    id: 'teacherCommentAudit',
    label: '教員コメント履歴',
    description:
      '管理画面の教員コメント履歴用。デモの教員コメント・生徒返信（削除済みサンプル含む）を一覧表示します。',
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

const DEV_DEFAULTS = {
  teacherReview: true,
  teacherCommentAudit: true,
  mate: true,
  presence: true,
  studyData: true,
};

const PROD_DEFAULTS = {
  teacherReview: false,
  teacherCommentAudit: false,
  mate: false,
  presence: false,
  studyData: false,
};

const listeners = new Set();

function getDefaults() {
  return import.meta.env.DEV ? { ...DEV_DEFAULTS } : { ...PROD_DEFAULTS };
}

function parseStored(parsed) {
  if (import.meta.env.DEV) {
    return {
      teacherReview: parsed.teacherReview !== false,
      teacherCommentAudit: parsed.teacherCommentAudit !== false,
      mate: parsed.mate !== false,
      presence: parsed.presence !== false,
      studyData: parsed.studyData !== false,
    };
  }
  return {
    teacherReview: parsed.teacherReview === true,
    teacherCommentAudit: parsed.teacherCommentAudit === true,
    mate: parsed.mate === true,
    presence: parsed.presence === true,
    studyData: parsed.studyData === true,
  };
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return getDefaults();
    const parsed = JSON.parse(raw);
    return parseStored(parsed);
  } catch {
    return getDefaults();
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

export function isDemoDataActive() {
  return isDemoEnvironment() || managerAllowed;
}

export function setDemoSettingsManagerAllowed(allowed) {
  const next = Boolean(allowed);
  if (managerAllowed === next) return;
  managerAllowed = next;
  notify();
}

export function canManageDemoSettings() {
  return managerAllowed;
}

export function getDemoSettings() {
  if (!isDemoDataActive()) {
    return {
      teacherReview: false,
      teacherCommentAudit: false,
      mate: false,
      presence: false,
      studyData: false,
    };
  }
  return { ...cached };
}

export function isDemoFeatureEnabled(featureId) {
  if (!isDemoDataActive()) return false;
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
    teacherCommentAudit: Boolean(enabled),
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
