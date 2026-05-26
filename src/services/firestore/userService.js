import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { normalizeNameLower } from '../../utils/mateScope';

export async function getProfile(email) {
  if (!email) return null;
  const snap = await getDoc(doc(db, 'users', email));
  if (!snap.exists()) return null;
  return { email: snap.id, ...snap.data() };
}

export async function updateProfile(email, patch) {
  const ref = doc(db, 'users', email);
  const data = { ...patch };
  if (patch.name !== undefined) {
    data.nameLower = normalizeNameLower(patch.name);
  }
  await updateDoc(ref, data);
}

export async function setProfile(email, data, merge = true) {
  const payload = { ...data };
  if (data.name !== undefined) {
    payload.nameLower = normalizeNameLower(data.name);
  }
  await setDoc(doc(db, 'users', email), payload, { merge });
}

export async function getProfiles(emails) {
  const results = await Promise.all(emails.map((e) => getProfile(e)));
  return results.filter(Boolean);
}

export async function searchUsers({ queryText, schoolId, max = 10 }) {
  const q = normalizeNameLower(queryText);
  if (!q) return [];

  let firestoreQuery;
  if (schoolId) {
    firestoreQuery = query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId),
      where('nameLower', '>=', q),
      where('nameLower', '<=', q + '\uf8ff'),
      limit(max)
    );
  } else {
    firestoreQuery = query(
      collection(db, 'users'),
      where('nameLower', '>=', q),
      where('nameLower', '<=', q + '\uf8ff'),
      limit(max)
    );
  }

  const snap = await getDocs(firestoreQuery);
  return snap.docs.map((d) => ({ email: d.id, ...d.data() }));
}

export async function fetchStudentsByGradeClass(grade, classNum) {
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('grade', '==', grade),
      where('class', '==', classNum),
      where('role', '==', 'student')
    )
  );
  return snap.docs
    .map((d) => ({ id: d.id, email: d.id, ...d.data() }))
    .sort((a, b) => String(a.number).localeCompare(String(b.number), undefined, { numeric: true }));
}

export async function fetchStudentsForSchool(schoolId) {
  const snap = await getDocs(
    query(
      collection(db, 'users'),
      where('schoolId', '==', schoolId),
      where('role', '==', 'student')
    )
  );
  return snap.docs.map((d) => ({ email: d.id, ...d.data() }));
}
