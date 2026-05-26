import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db } from '../../firebase';
import { createId } from '../../utils/planUtils';

function recomputeAggregates(entries) {
  let totalMinutes = 0;
  const bySubject = {};
  for (const e of entries) {
    const mins = Number(e.duration) || 0;
    totalMinutes += mins;
    const sub = e.subject || 'その他';
    bySubject[sub] = (bySubject[sub] || 0) + mins;
  }
  return { totalMinutes, bySubject };
}

export async function getDayLogs(email, dateKey) {
  const snap = await getDoc(doc(db, 'logs', email, 'days', dateKey));
  if (!snap.exists()) return { entries: [], totalMinutes: 0, bySubject: {} };
  const entries = snap.data().entries || [];
  const { totalMinutes, bySubject } = recomputeAggregates(entries);
  return { ...snap.data(), entries, totalMinutes, bySubject };
}

export async function getDayRange(email, startDate, endDate) {
  const snap = await getDocs(collection(db, 'logs', email, 'days'));
  const result = {};
  snap.docs.forEach((d) => {
    if (d.id >= startDate && d.id <= endDate) {
      const entries = d.data().entries || [];
      const { totalMinutes, bySubject } = recomputeAggregates(entries);
      result[d.id] = { ...d.data(), entries, totalMinutes, bySubject };
    }
  });
  return result;
}

export async function addEntry(email, dateKey, entry) {
  const ref = doc(db, 'logs', email, 'days', dateKey);
  const snap = await getDoc(ref);
  const entries = snap.exists() ? [...(snap.data().entries || [])] : [];
  const id = entry.id || createId();
  const newEntry = { ...entry, id };
  entries.push(newEntry);
  entries.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''));
  const { totalMinutes, bySubject } = recomputeAggregates(entries);
  await setDoc(ref, { entries, totalMinutes, bySubject }, { merge: true });
  return id;
}

export async function updateEntry(email, dateKey, entryId, patch) {
  const ref = doc(db, 'logs', email, 'days', dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const entries = (snap.data().entries || []).map((e) =>
    e.id === entryId ? { ...e, ...patch } : e
  );
  const { totalMinutes, bySubject } = recomputeAggregates(entries);
  await setDoc(ref, { entries, totalMinutes, bySubject }, { merge: true });
}

export async function deleteEntry(email, dateKey, entryId) {
  const ref = doc(db, 'logs', email, 'days', dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const entries = (snap.data().entries || []).filter((e) => e.id !== entryId);
  const { totalMinutes, bySubject } = recomputeAggregates(entries);
  await setDoc(ref, { entries, totalMinutes, bySubject }, { merge: true });
}

export async function updateSubjectCatalog(email, entry) {
  const userRef = doc(db, 'users', email);
  const snap = await getDoc(userRef);
  const catalog = snap.exists() ? { ...(snap.data().subjectCatalog || {}) } : {};
  const { subject, topic, book } = entry;
  if (!subject) return;
  if (!catalog[subject]) catalog[subject] = {};
  if (topic) {
    if (!catalog[subject][topic]) catalog[subject][topic] = [];
    if (book && !catalog[subject][topic].includes(book)) {
      catalog[subject][topic] = [...catalog[subject][topic], book];
    }
  }
  await setDoc(userRef, { subjectCatalog: catalog }, { merge: true });
}
