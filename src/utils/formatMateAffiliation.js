/**
 * 連れ勉リスト用: 学校名 学年組番（例: デモ高等学校 2年3組 8番）
 * @param {{ schoolName?: string, grade?: string|number, class?: string|number, number?: string|number } | null | undefined} profile
 * @returns {string | null}
 */
export function formatMateAffiliation(profile) {
  if (!profile) return null;

  const segments = [];
  const schoolName = String(profile.schoolName || '').trim();
  if (schoolName) segments.push(schoolName);

  let classInfo = '';
  const grade = profile.grade;
  if (grade != null && String(grade).trim() !== '') {
    classInfo += `${grade}年`;
  }
  const classNum = profile.class;
  if (classNum != null && String(classNum).trim() !== '') {
    classInfo += `${classNum}組`;
  }
  const number = profile.number;
  if (number != null && String(number).trim() !== '') {
    classInfo = classInfo ? `${classInfo} ${number}番` : `${number}番`;
  }
  if (classInfo) segments.push(classInfo);

  return segments.length > 0 ? segments.join(' ') : null;
}
