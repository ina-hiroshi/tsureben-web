import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  startAfter,
} from 'firebase/firestore';
import { db } from '../../firebase';

const DEFAULT_THREAD_LIMIT = 30;
const STUDENT_QUERY_BATCH = 20;
const THREADS_PER_STUDENT = 8;

export function auditRowTimestamp(row) {
  const ts = row?.deletedAt || row?.updatedAt || row?.createdAt;
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
}

function messageTimestamp(message) {
  const ts = message?.updatedAt || message?.createdAt;
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
}

function threadLastMessageMs(thread) {
  const ts = thread?.lastMessageAt;
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.toDate === 'function') return ts.toDate().getTime();
  return 0;
}

function threadScopeLabel(thread) {
  if (thread.scope === 'daily' && thread.dateKey) {
    return `日次（${thread.dateKey}）`;
  }
  if (thread.scope === 'general') return '全体';
  return thread.scope || '—';
}

export function isFirestoreIndexError(err) {
  const message = err?.message || '';
  return /requires an index|currently building/i.test(message);
}

export function mapAuditRow(thread, message, studentProfile) {
  const student = studentProfile || {};
  return {
    id: `${thread.id}_${message.id}`,
    threadId: thread.id,
    messageId: message.id,
    authorEmail: message.authorEmail,
    authorRole: message.authorRole || '',
    authorName: message.authorName || message.authorEmail,
    body: message.body || '',
    createdAt: message.createdAt,
    updatedAt: message.updatedAt || null,
    deletedAt: message.deletedAt || null,
    deletedBy: message.deletedBy || null,
    studentEmail: thread.studentEmail,
    studentName: student.name || thread.studentEmail,
    studentGrade: student.grade,
    studentClass: student.class,
    studentNumber: student.number,
    threadTitle: thread.title || '',
    threadScope: thread.scope,
    threadScopeLabel: threadScopeLabel(thread),
    threadDateKey: thread.dateKey,
  };
}

function threadBelongsToSchool(thread, schoolId) {
  if (!schoolId) return true;
  if (!thread.schoolId) return true;
  return thread.schoolId === schoolId;
}

async function loadMessagesForThread(threadId) {
  const snap = await getDocs(collection(db, 'feedbackThreads', threadId, 'messages'));
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}

async function fetchThreadsBySchoolId(schoolId, threadLimit, cursor) {
  let q = query(
    collection(db, 'feedbackThreads'),
    where('schoolId', '==', schoolId),
    orderBy('lastMessageAt', 'desc'),
    limit(threadLimit)
  );
  if (cursor) {
    q = query(
      collection(db, 'feedbackThreads'),
      where('schoolId', '==', schoolId),
      orderBy('lastMessageAt', 'desc'),
      startAfter(cursor),
      limit(threadLimit)
    );
  }

  const threadSnap = await getDocs(q);
  const threads = threadSnap.docs.map((d) => ({ id: d.id, ...d.data() }));
  const lastDoc = threadSnap.docs[threadSnap.docs.length - 1] ?? null;
  const hasMore = threadSnap.docs.length >= threadLimit;

  return { threads, nextCursor: hasMore ? lastDoc : null, hasMore };
}

/**
 * schoolId フィールドが無い旧データ向け。既存の studentEmail インデックスのみ使用。
 */
async function fetchThreadsByStudentEmails(studentEmails, schoolId, { maxThreads }) {
  const threadMap = new Map();

  for (let i = 0; i < studentEmails.length; i += STUDENT_QUERY_BATCH) {
    const batch = studentEmails.slice(i, i + STUDENT_QUERY_BATCH);
    await Promise.all(
      batch.map(async (studentEmail) => {
        const q = query(
          collection(db, 'feedbackThreads'),
          where('studentEmail', '==', studentEmail),
          orderBy('lastMessageAt', 'desc'),
          limit(THREADS_PER_STUDENT)
        );
        const snap = await getDocs(q);
        snap.docs.forEach((d) => {
          const thread = { id: d.id, ...d.data() };
          if (!threadBelongsToSchool(thread, schoolId)) return;
          threadMap.set(thread.id, thread);
        });
      })
    );
    if (threadMap.size >= maxThreads) break;
  }

  return [...threadMap.values()]
    .sort((a, b) => threadLastMessageMs(b) - threadLastMessageMs(a))
    .slice(0, maxThreads);
}

function shouldIncludeAuditMessage(message, threadMessages, teacherEmail) {
  if (message.authorRole !== 'teacher' && message.authorRole !== 'student') return false;
  if (!teacherEmail) return true;
  if (message.authorRole === 'teacher') return message.authorEmail === teacherEmail;
  return threadMessages.some(
    (m) => m.authorRole === 'teacher' && m.authorEmail === teacherEmail
  );
}

async function buildRowsFromThreads(threads, teacherEmail, studentMap) {
  const messageBatches = await Promise.all(
    threads.map((thread) => loadMessagesForThread(thread.id))
  );

  const rows = [];
  threads.forEach((thread, i) => {
    const threadMessages = messageBatches[i];
    threadMessages.forEach((message) => {
      if (!shouldIncludeAuditMessage(message, threadMessages, teacherEmail)) return;
      const profile = studentMap?.get(thread.studentEmail);
      rows.push(mapAuditRow(thread, message, profile));
    });
  });

  rows.sort((a, b) => auditRowTimestamp(b) - auditRowTimestamp(a));
  return rows;
}

/**
 * @param {Object} opts
 * @param {string} opts.schoolId
 * @param {string[]} [opts.studentEmails]
 * @param {string} [opts.teacherEmail]
 * @param {number} [opts.threadLimit]
 * @param {import('firebase/firestore').QueryDocumentSnapshot} [opts.cursor]
 * @param {Map<string, object>} [opts.studentMap]
 * @param {'school'|'students'} [opts.source] pagination mode for load-more
 */
export async function fetchTeacherCommentAudit({
  schoolId,
  studentEmails = [],
  teacherEmail,
  threadLimit = DEFAULT_THREAD_LIMIT,
  cursor = null,
  studentMap = null,
  source = 'school',
}) {
  if (!schoolId && !studentEmails.length) {
    return { rows: [], nextCursor: null, hasMore: false, source: 'none' };
  }

  let threads = [];
  let nextCursor = null;
  let hasMore = false;
  let usedSource = source;

  const trySchoolQuery = schoolId && source === 'school';
  if (trySchoolQuery) {
    try {
      const result = await fetchThreadsBySchoolId(schoolId, threadLimit, cursor);
      threads = result.threads;
      nextCursor = result.nextCursor;
      hasMore = result.hasMore;
      usedSource = 'school';
    } catch (err) {
      if (!isFirestoreIndexError(err)) throw err;
      usedSource = 'students';
    }
  }

  if (usedSource === 'students' || threads.length === 0) {
    if (!studentEmails.length) {
      return { rows: [], nextCursor: null, hasMore: false, source: 'none' };
    }
    const depth = cursor ? Number(cursor) || 2 : 1;
    const maxThreads = threadLimit * depth;
    threads = await fetchThreadsByStudentEmails(studentEmails, schoolId, { maxThreads });
    usedSource = 'students';
    const canLoadMore = maxThreads < studentEmails.length * THREADS_PER_STUDENT;
    return {
      rows: await buildRowsFromThreads(threads, teacherEmail, studentMap),
      nextCursor: canLoadMore ? depth + 1 : null,
      hasMore: canLoadMore,
      source: 'students',
    };
  }

  return {
    rows: await buildRowsFromThreads(threads, teacherEmail, studentMap),
    nextCursor,
    hasMore,
    source: usedSource,
  };
}
