import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export async function fetchTeachersForSchool(schoolId) {
  const snap = await getDocs(collection(db, 'teachers'));
  return snap.docs
    .map((d) => ({ email: d.id, ...d.data() }))
    .filter((t) => t.schoolId === schoolId)
    .sort((a, b) => a.email.localeCompare(b.email));
}
