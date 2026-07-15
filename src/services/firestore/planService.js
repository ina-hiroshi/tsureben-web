import {
  doc,
  getDoc,
  setDoc,
  getDocs,
  collection,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { createId } from '../../utils/planUtils';

async function refreshPlanNotifications(email) {
  try {
    const { syncPlanNotificationsForUser } = await import('../planNotificationService.js');
    await syncPlanNotificationsForUser(email);
  } catch (err) {
    console.error('refreshPlanNotifications error:', err);
  }
}

export async function getDayPlans(email, dateKey) {
  const snap = await getDoc(doc(db, 'plans', email, 'days', dateKey));
  if (!snap.exists()) return { entries: [] };
  return snap.data();
}

export async function saveDayPlans(email, dateKey, entries) {
  await setDoc(doc(db, 'plans', email, 'days', dateKey), { entries }, { merge: true });
}

export async function saveEntry(email, dateKey, entry, entryId = null) {
  const ref = doc(db, 'plans', email, 'days', dateKey);
  const snap = await getDoc(ref);
  const entries = snap.exists() ? [...(snap.data().entries || [])] : [];
  const id = entryId || entry.id || createId();
  const newEntry = { ...entry, id };

  const idx = entries.findIndex((e) => e.id === id);
  if (idx >= 0) entries[idx] = newEntry;
  else entries.push(newEntry);

  entries.sort((a, b) => (a.start || '').localeCompare(b.start || ''));
  await setDoc(ref, { entries }, { merge: true });
  await refreshPlanNotifications(email);
  return id;
}

export async function deleteEntry(email, dateKey, entryId) {
  const ref = doc(db, 'plans', email, 'days', dateKey);
  const snap = await getDoc(ref);
  if (!snap.exists()) return;
  const entries = (snap.data().entries || []).filter((e) => e.id !== entryId);
  await setDoc(ref, { entries }, { merge: true });
  await refreshPlanNotifications(email);
}

export async function getDayPlansRange(email, startDate, endDate) {
  const snap = await getDocs(collection(db, 'plans', email, 'days'));
  const result = {};
  snap.docs.forEach((d) => {
    if (d.id >= startDate && d.id <= endDate) {
      result[d.id] = d.data();
    }
  });
  return result;
}
