export const SUBJECTS = ['国語', '数学', '英語', '理科', '社会', '情報', 'その他'];

export function getSubjectList(catalog = {}) {
  const custom = Object.keys(catalog).filter((s) => !SUBJECTS.includes(s));
  return [...SUBJECTS, ...custom];
}
