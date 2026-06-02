/** 1, 2, 10 のように数値として自然な順序で並べる（10組が1組の直後にならないようにする） */
export function compareNatural(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'ja', { numeric: true });
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort(compareNatural);
}

export { fetchStudentsForSchool } from '../services/firestore/userService';
