import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { normalizeNameLower } from '../../utils/mateScope';
import { compareNatural } from '../../utils/adminStudents';

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
  return snap.docs
    .map((d) => ({ email: d.id, ...d.data() }))
    .sort((a, b) => {
      const byGrade = compareNatural(a.grade, b.grade);
      if (byGrade !== 0) return byGrade;
      const byClass = compareNatural(a.class, b.class);
      if (byClass !== 0) return byClass;
      return compareNatural(a.number, b.number);
    });
}

function cloneSubjectCatalog(catalog = {}) {
  const result = {};
  for (const [subject, topics] of Object.entries(catalog)) {
    result[subject] = {};
    for (const [topic, books] of Object.entries(topics || {})) {
      result[subject][topic] = [...(books || [])];
    }
  }
  return result;
}

async function mutateSubjectCatalog(email, mutator) {
  const profile = await getProfile(email);
  const catalog = cloneSubjectCatalog(profile?.subjectCatalog);
  const next = mutator(catalog);
  await updateProfile(email, { subjectCatalog: next });
  return next;
}

export async function getSubjectCatalog(email) {
  const profile = await getProfile(email);
  return cloneSubjectCatalog(profile?.subjectCatalog);
}

export async function saveSubjectCatalog(email, catalog) {
  await updateProfile(email, { subjectCatalog: cloneSubjectCatalog(catalog) });
}

export async function addTopic(email, subject, topic) {
  const trimmed = topic?.trim();
  if (!subject?.trim() || !trimmed) return null;
  return mutateSubjectCatalog(email, (cat) => {
    if (!cat[subject]) cat[subject] = {};
    if (!cat[subject][trimmed]) cat[subject][trimmed] = [];
    return cat;
  });
}

export async function renameTopic(email, subject, oldTopic, newTopic) {
  const trimmed = newTopic?.trim();
  if (!subject || !oldTopic || !trimmed || oldTopic === trimmed) return null;
  return mutateSubjectCatalog(email, (cat) => {
    if (!cat[subject]?.[oldTopic]) return cat;
    if (cat[subject][trimmed]) return cat;
    cat[subject][trimmed] = cat[subject][oldTopic];
    delete cat[subject][oldTopic];
    return cat;
  });
}

export async function deleteTopic(email, subject, topic) {
  if (!subject || !topic) return null;
  return mutateSubjectCatalog(email, (cat) => {
    if (!cat[subject]?.[topic]) return cat;
    delete cat[subject][topic];
    if (Object.keys(cat[subject]).length === 0) delete cat[subject];
    return cat;
  });
}

export async function addBook(email, subject, topic, book) {
  const trimmed = book?.trim();
  if (!subject || !topic || !trimmed) return null;
  return mutateSubjectCatalog(email, (cat) => {
    if (!cat[subject]) cat[subject] = {};
    if (!cat[subject][topic]) cat[subject][topic] = [];
    if (!cat[subject][topic].includes(trimmed)) {
      cat[subject][topic] = [...cat[subject][topic], trimmed];
    }
    return cat;
  });
}

export async function renameBook(email, subject, topic, oldBook, newBook) {
  const trimmed = newBook?.trim();
  if (!subject || !topic || !oldBook || !trimmed || oldBook === trimmed) return null;
  return mutateSubjectCatalog(email, (cat) => {
    const books = cat[subject]?.[topic];
    if (!books) return cat;
    const idx = books.indexOf(oldBook);
    if (idx === -1) return cat;
    books[idx] = trimmed;
    cat[subject][topic] = [...books];
    return cat;
  });
}

export async function deleteBook(email, subject, topic, book) {
  if (!subject || !topic || !book) return null;
  return mutateSubjectCatalog(email, (cat) => {
    const books = cat[subject]?.[topic];
    if (!books) return cat;
    cat[subject][topic] = books.filter((b) => b !== book);
    return cat;
  });
}
