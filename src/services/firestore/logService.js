import { doc, getDoc, setDoc, getDocs, collection, query, where, documentId } from 'firebase/firestore';
import { db } from '../../firebase';
import { createId } from '../../utils/planUtils';

function formatDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getRecentDateKeys(days, anchorDate = new Date()) {
  const keys = [];
  for (let offset = 0; offset < days; offset += 1) {
    const date = new Date(anchorDate);
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - offset);
    keys.push(formatDateKey(date));
  }
  return keys;
}

export async function getRecentStudySummary(email, days = 7, anchorDate = new Date()) {
  const dateKeys = getRecentDateKeys(days, anchorDate);
  if (!dateKeys.length) {
    return { hasStudy: false, totalMinutes: 0, days };
  }

  const oldest = dateKeys[dateKeys.length - 1];
  const newest = dateKeys[0];
  const snap = await getDocs(
    query(
      collection(db, 'logs', email, 'days'),
      where(documentId(), '>=', oldest),
      where(documentId(), '<=', newest)
    )
  );

  let totalMinutes = 0;
  let studyDayCount = 0;
  snap.docs.forEach((dayDoc) => {
    const minutes = Number(dayDoc.data().totalMinutes) || 0;
    if (minutes <= 0) return;
    studyDayCount += 1;
    totalMinutes += minutes;
  });

  return {
    hasStudy: studyDayCount > 0,
    studyDayCount,
    totalMinutes,
    days,
  };
}

export async function getRecentStudyDetail(email, days = 7, anchorDate = new Date()) {
  const dateKeys = getRecentDateKeys(days, anchorDate);
  if (!dateKeys.length) {
    return { hasStudy: false, studyDayCount: 0, totalMinutes: 0, bySubject: {}, days };
  }

  const oldest = dateKeys[dateKeys.length - 1];
  const newest = dateKeys[0];
  const snap = await getDocs(
    query(
      collection(db, 'logs', email, 'days'),
      where(documentId(), '>=', oldest),
      where(documentId(), '<=', newest)
    )
  );

  let totalMinutes = 0;
  let studyDayCount = 0;
  const bySubject = {};
  snap.docs.forEach((dayDoc) => {
    const minutes = Number(dayDoc.data().totalMinutes) || 0;
    if (minutes <= 0) return;
    studyDayCount += 1;
    totalMinutes += minutes;
    const dayBySubject = dayDoc.data().bySubject || {};
    Object.entries(dayBySubject).forEach(([subject, mins]) => {
      const value = Number(mins) || 0;
      if (value <= 0) return;
      bySubject[subject] = (bySubject[subject] || 0) + value;
    });
  });

  return {
    hasStudy: studyDayCount > 0,
    studyDayCount,
    totalMinutes,
    bySubject,
    days,
  };
}

export async function getRecentStudySummaries(emails, days = 7, concurrency = 20) {
  const uniqueEmails = [...new Set((emails || []).filter(Boolean))];
  const summaries = {};

  for (let index = 0; index < uniqueEmails.length; index += concurrency) {
    const batch = uniqueEmails.slice(index, index + concurrency);
    await Promise.all(
      batch.map(async (email) => {
        summaries[email] = await getRecentStudySummary(email, days);
      })
    );
  }

  return summaries;
}

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
