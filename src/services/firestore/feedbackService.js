import {
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../firebase';
import { createId } from '../../utils/planUtils';
import {
  isDemoTeacherReviewEmail,
  getDemoFeedbackThreads,
  getDemoFeedbackMessages,
  isDemoTeacherReviewEnabled,
  isDemoFeedbackThreadId,
} from '../../dev/demoTeacherReview';

function mapThreadDoc(snap) {
  return {
    id: snap.id,
    ...snap.data(),
  };
}

function mapMessageDoc(snap) {
  return {
    id: snap.id,
    ...snap.data(),
  };
}

export function isMessageVisible(message) {
  return message != null && !message.deletedAt;
}

function threadTimestamp(thread) {
  const ts = thread?.lastMessageAt;
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
}

function sortThreadsByLastMessage(threads) {
  return [...threads].sort((a, b) => threadTimestamp(b) - threadTimestamp(a));
}

export function subscribeThreads(studentEmail, { scope, dateKey } = {}, onChange, onError) {
  if (!studentEmail) return () => {};

  if (isDemoTeacherReviewEnabled() && isDemoTeacherReviewEmail(studentEmail)) {
    let threads = getDemoFeedbackThreads(studentEmail);
    if (scope) threads = threads.filter((thread) => thread.scope === scope);
    if (dateKey) threads = threads.filter((thread) => thread.dateKey === dateKey);
    onChange(threads);
    return () => {};
  }

  const q = query(collection(db, 'feedbackThreads'), where('studentEmail', '==', studentEmail));
  return onSnapshot(
    q,
    (snap) => {
      let threads = snap.docs.map(mapThreadDoc);
      if (scope) threads = threads.filter((thread) => thread.scope === scope);
      if (dateKey) threads = threads.filter((thread) => thread.dateKey === dateKey);
      onChange(sortThreadsByLastMessage(threads));
    },
    onError
  );
}

export function subscribeMessages(threadId, onChange, onError) {
  if (!threadId) return () => {};

  if (isDemoTeacherReviewEnabled() && isDemoFeedbackThreadId(threadId)) {
    const visible = getDemoFeedbackMessages(threadId).filter(isMessageVisible);
    onChange(visible);
    return () => {};
  }

  const q = query(
    collection(db, 'feedbackThreads', threadId, 'messages'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(
    q,
    (snap) => {
      const messages = snap.docs.map(mapMessageDoc).filter(isMessageVisible);
      onChange(messages);
    },
    onError
  );
}

export async function findDailyThread(studentEmail, dateKey) {
  const q = query(collection(db, 'feedbackThreads'), where('studentEmail', '==', studentEmail));
  const snap = await getDocs(q);
  const match = snap.docs
    .map(mapThreadDoc)
    .find((thread) => thread.scope === 'daily' && thread.dateKey === dateKey);
  return match || null;
}

export async function createThread({
  studentEmail,
  schoolId,
  scope,
  dateKey = null,
  title,
  createdBy,
  createdByName,
  initialMessage,
  authorRole = 'teacher',
}) {
  const now = serverTimestamp();
  const trimmedInitial = initialMessage?.trim() || '';
  const threadRef = await addDoc(collection(db, 'feedbackThreads'), {
    studentEmail,
    schoolId,
    scope,
    dateKey: scope === 'daily' ? dateKey : null,
    title,
    createdBy,
    createdByName,
    createdAt: now,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: trimmedInitial.slice(0, 80),
    unreadByStudent: true,
    unreadByTeacher: false,
  });

  if (trimmedInitial) {
    await addDoc(collection(db, 'feedbackThreads', threadRef.id, 'messages'), {
      authorEmail: createdBy,
      authorRole,
      authorName: createdByName,
      body: trimmedInitial,
      createdAt: now,
    });
  }

  return threadRef.id;
}

export async function getOrCreateDailyThread({
  studentEmail,
  schoolId,
  dateKey,
  createdBy,
  createdByName,
  title,
}) {
  const existing = await findDailyThread(studentEmail, dateKey);
  if (existing) return existing.id;

  return createThread({
    studentEmail,
    schoolId,
    scope: 'daily',
    dateKey,
    title,
    createdBy,
    createdByName,
    initialMessage: '',
  });
}

export async function addMessage(threadId, { authorEmail, authorRole, authorName, body }) {
  const trimmed = body?.trim();
  if (!threadId || !trimmed || isDemoFeedbackThreadId(threadId)) return;

  const now = serverTimestamp();
  await addDoc(collection(db, 'feedbackThreads', threadId, 'messages'), {
    authorEmail,
    authorRole,
    authorName,
    body: trimmed,
    createdAt: now,
  });

  const unreadPatch =
    authorRole === 'teacher'
      ? { unreadByStudent: true, unreadByTeacher: false }
      : { unreadByStudent: false, unreadByTeacher: true };

  await updateDoc(doc(db, 'feedbackThreads', threadId), {
    ...unreadPatch,
    updatedAt: now,
    lastMessageAt: now,
    lastMessagePreview: trimmed.slice(0, 80),
  });
}

function messageTimestamp(message) {
  const ts = message?.updatedAt || message?.createdAt;
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
}

async function syncThreadMetadata(threadId) {
  const threadRef = doc(db, 'feedbackThreads', threadId);
  const [threadSnap, messagesSnap] = await Promise.all([
    getDoc(threadRef),
    getDocs(collection(db, 'feedbackThreads', threadId, 'messages')),
  ]);

  const messages = messagesSnap.docs.map(mapMessageDoc).filter(isMessageVisible);
  const now = serverTimestamp();

  if (messages.length === 0) {
    const fallback = threadSnap.exists() ? threadSnap.data().createdAt : now;
    await updateDoc(threadRef, {
      lastMessageAt: fallback,
      updatedAt: now,
    });
    return;
  }

  const latest = [...messages].sort((a, b) => messageTimestamp(b) - messageTimestamp(a))[0];
  const preview = (latest.body || '').replace(/\s+/g, ' ').trim().slice(0, 80);
  await updateDoc(threadRef, {
    lastMessageAt: latest.updatedAt || latest.createdAt,
    lastMessagePreview: preview,
    updatedAt: now,
  });
}

export async function updateMessage(threadId, messageId, body) {
  const trimmed = body?.trim();
  if (!threadId || !messageId || !trimmed || isDemoFeedbackThreadId(threadId)) return;

  await updateDoc(doc(db, 'feedbackThreads', threadId, 'messages', messageId), {
    body: trimmed,
    updatedAt: serverTimestamp(),
  });
  await syncThreadMetadata(threadId);
}

export async function deleteMessage(threadId, messageId, deletedBy) {
  if (!threadId || !messageId || !deletedBy || isDemoFeedbackThreadId(threadId)) return;
  await updateDoc(doc(db, 'feedbackThreads', threadId, 'messages', messageId), {
    deletedAt: serverTimestamp(),
    deletedBy,
  });
  await syncThreadMetadata(threadId);
}

export async function markThreadRead(threadId, readerRole) {
  if (!threadId || isDemoFeedbackThreadId(threadId)) return;
  const patch =
    readerRole === 'teacher'
      ? { unreadByTeacher: false }
      : { unreadByStudent: false };
  await updateDoc(doc(db, 'feedbackThreads', threadId), {
    ...patch,
    updatedAt: serverTimestamp(),
  });
}

export async function fetchThreadsForStudent(studentEmail) {
  if (!studentEmail) return [];

  if (isDemoTeacherReviewEnabled() && isDemoTeacherReviewEmail(studentEmail)) {
    return sortThreadsByLastMessage(getDemoFeedbackThreads(studentEmail));
  }

  const q = query(collection(db, 'feedbackThreads'), where('studentEmail', '==', studentEmail));
  const snap = await getDocs(q);
  return sortThreadsByLastMessage(snap.docs.map(mapThreadDoc));
}

export async function getUnreadCountForStudent(studentEmail) {
  if (!studentEmail) return 0;
  const q = query(collection(db, 'feedbackThreads'), where('studentEmail', '==', studentEmail));
  const snap = await getDocs(q);
  return snap.docs.filter((d) => d.data().unreadByStudent === true).length;
}

export function subscribeUnreadCountForStudent(studentEmail, onChange, onError) {
  if (!studentEmail) return () => {};

  const q = query(collection(db, 'feedbackThreads'), where('studentEmail', '==', studentEmail));
  return onSnapshot(
    q,
    (snap) => {
      const count = snap.docs.filter((d) => d.data().unreadByStudent === true).length;
      onChange(count);
    },
    onError
  );
}

export async function getThread(threadId) {
  const snap = await getDoc(doc(db, 'feedbackThreads', threadId));
  if (!snap.exists()) return null;
  return mapThreadDoc(snap);
}

export async function createGeneralThread({
  studentEmail,
  schoolId,
  createdBy,
  createdByName,
  title,
  initialMessage,
}) {
  return createThread({
    studentEmail,
    schoolId,
    scope: 'general',
    title: title || '全体のフィードバック',
    createdBy,
    createdByName,
    initialMessage,
  });
}

export { createId };
