import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

/** 1, 2, 10 のように数値として自然な順序で並べる（10組が1組の直後にならないようにする） */
export function compareNatural(a, b) {
  return String(a ?? '').localeCompare(String(b ?? ''), 'ja', { numeric: true });
}

export async function fetchStudentsForSchool(schoolId) {
  const snap = await getDocs(collection(db, 'users'));
  return snap.docs
    .map((d) => ({ email: d.id, ...d.data() }))
    .filter((u) => u.schoolId === schoolId && u.role === 'student')
    .sort((a, b) => {
      const byGrade = compareNatural(a.grade, b.grade);
      if (byGrade !== 0) return byGrade;
      const byClass = compareNatural(a.class, b.class);
      if (byClass !== 0) return byClass;
      return compareNatural(a.number, b.number);
    });
}

export function uniqueSorted(values) {
  return [...new Set(values.filter(Boolean).map(String))].sort(compareNatural);
}
