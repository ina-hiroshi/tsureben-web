export const SUBJECT_BAR_COLORS = {
  国語: 'bg-pink-400',
  数学: 'bg-blue-400',
  英語: 'bg-purple-400',
  理科: 'bg-green-400',
  社会: 'bg-amber-500',
  情報: 'bg-indigo-400',
  その他: 'bg-gray-400',
};

export function subjectBarColorClass(subject) {
  return SUBJECT_BAR_COLORS[subject] || 'bg-tsure-muted';
}

export const SUBJECT_BORDER_COLORS = {
  国語: 'border-l-pink-400',
  数学: 'border-l-blue-400',
  英語: 'border-l-purple-400',
  理科: 'border-l-green-400',
  社会: 'border-l-amber-500',
  情報: 'border-l-indigo-400',
  その他: 'border-l-gray-400',
};

export function subjectBorderColorClass(subject) {
  return SUBJECT_BORDER_COLORS[subject] || 'border-l-tsure-muted';
}

export const SUBJECT_TEXT_COLORS = {
  国語: 'text-pink-400',
  数学: 'text-blue-400',
  英語: 'text-purple-400',
  理科: 'text-green-400',
  社会: 'text-amber-600',
  情報: 'text-indigo-400',
  その他: 'text-gray-400',
};

export function subjectTextColorClass(subject) {
  return SUBJECT_TEXT_COLORS[subject] || 'text-tsure-muted';
}

export const SUBJECT_SURFACE_COLORS = {
  国語: 'bg-pink-50 border-pink-200',
  数学: 'bg-blue-50 border-blue-200',
  英語: 'bg-purple-50 border-purple-200',
  理科: 'bg-green-50 border-green-200',
  社会: 'bg-amber-50 border-amber-200',
  情報: 'bg-indigo-50 border-indigo-200',
  その他: 'bg-gray-50 border-gray-200',
};

export function subjectSurfaceColorClass(subject) {
  return SUBJECT_SURFACE_COLORS[subject] || 'bg-tsure-surface border-tsure-border';
}

/** カード配色用。未定義・「勉強中」はその他扱い */
export function resolveSubjectColorKey(subject) {
  const label = (subject || '').trim();
  if (!label || label === '勉強中') return 'その他';
  if (label in SUBJECT_SURFACE_COLORS) return label;
  return 'その他';
}
