import { formatMateAffiliation } from './formatMateAffiliation';

function norm(value) {
  return String(value ?? '').trim();
}

/**
 * @param {Array<object>} users
 * @param {{ grade?: string }} options
 */
export function getMateFilterOptions(users, { grade } = {}) {
  const schools = [
    ...new Set(users.map((u) => norm(u.schoolName)).filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'ja'));

  const grades = [
    ...new Set(users.map((u) => norm(u.grade)).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, 'ja'));

  const classSource = grade
    ? users.filter((u) => norm(u.grade) === grade)
    : users;
  const classes = [
    ...new Set(classSource.map((u) => norm(u.class)).filter(Boolean)),
  ].sort((a, b) => Number(a) - Number(b) || a.localeCompare(b, 'ja'));

  return { schools, grades, classes };
}

/**
 * @param {Array<object>} users
 * @param {{ query?: string, schoolName?: string, grade?: string, class?: string }} filters
 */
export function filterMateUsers(users, filters = {}) {
  const query = norm(filters.query).toLowerCase();

  return users.filter((user) => {
    if (filters.schoolName && norm(user.schoolName) !== filters.schoolName) {
      return false;
    }
    if (filters.grade && norm(user.grade) !== filters.grade) {
      return false;
    }
    if (filters.class && norm(user.class) !== filters.class) {
      return false;
    }
    if (!query) return true;

    const haystack = [
      user.name,
      user.email,
      user.schoolName,
      user.grade != null && user.grade !== '' ? `${user.grade}年` : '',
      user.class != null && user.class !== '' ? `${user.class}組` : '',
      user.number != null && user.number !== '' ? `${user.number}番` : '',
      formatMateAffiliation(user),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();

    return haystack.includes(query);
  });
}

export function hasActiveMateFilters(filters = {}) {
  return Boolean(
    norm(filters.query) ||
      filters.schoolName ||
      filters.grade ||
      filters.class
  );
}
