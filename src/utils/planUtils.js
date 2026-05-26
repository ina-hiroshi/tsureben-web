export function createId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export const SUBJECT_COLORS = {
  国語: 'border-pink-400 bg-pink-50',
  数学: 'border-blue-400 bg-blue-50',
  英語: 'border-purple-400 bg-purple-50',
  理科: 'border-green-400 bg-green-50',
  社会: 'border-yellow-400 bg-yellow-50',
  情報: 'border-indigo-400 bg-indigo-50',
  その他: 'border-gray-400 bg-gray-50',
};

export function subjectColorClass(subject) {
  return SUBJECT_COLORS[subject] || 'border-tsure-border bg-tsure-surface-hover';
}

export function flattenDayPlans(dayData) {
  const entries = dayData?.entries || [];
  return [...entries].sort((a, b) => (a.start || '').localeCompare(b.start || ''));
}

export function padHour(startTime) {
  if (!startTime) return '00';
  return startTime.split(':')[0].padStart(2, '0');
}
