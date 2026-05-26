import { getFunctions, httpsCallable } from 'firebase/functions';
import { app } from '../firebase';

const functions = getFunctions(app, 'asia-northeast1');

const CALLABLE_TIMEOUT_MS = 300_000;
const STUDENT_IMPORT_BATCH_SIZE = 15;
const TEACHER_IMPORT_BATCH_SIZE = 40;

function formatCallableError(err) {
  const code = err?.code?.replace?.('functions/', '') || '';
  const detail = err?.details || err?.message || 'リクエストに失敗しました';
  if (code === 'unauthenticated') {
    return 'ログインが必要です。一度ログアウトして再ログインしてください。';
  }
  if (code === 'permission-denied') {
    return detail;
  }
  if (code === 'deadline-exceeded') {
    return '処理がタイムアウトしました。CSV の行数を減らすか、しばらく待って再試行してください。';
  }
  if (code === 'internal' || code === 'unknown') {
    const corsHint =
      typeof detail === 'string' &&
      (detail.includes('CORS') || detail.includes('network'))
        ? ' ブラウザを再読み込みし、http://localhost:5173 で開いているか確認してください。'
        : '';
    return `サーバーエラー: ${detail}${corsHint}`;
  }
  return detail;
}

async function call(name, data, { onProgress } = {}) {
  try {
    const fn = httpsCallable(functions, name, { timeout: CALLABLE_TIMEOUT_MS });
    const res = await fn(data);
    onProgress?.(1, 1);
    return res.data;
  } catch (err) {
    console.error(`Cloud Function ${name} failed:`, err);
    throw new Error(formatCallableError(err));
  }
}

function mergeImportResults(target, chunk) {
  target.created += chunk.created || 0;
  target.updated += chunk.updated || 0;
  target.skipped += chunk.skipped || 0;
  if (chunk.errors?.length) {
    target.errors.push(...chunk.errors);
  }
}

async function callBatched(name, { schoolId, rows }, batchSize, onProgress) {
  const aggregate = { created: 0, updated: 0, skipped: 0, errors: [] };
  const totalBatches = Math.ceil(rows.length / batchSize) || 1;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batchIndex = Math.floor(i / batchSize);
    onProgress?.(batchIndex + 1, totalBatches);
    const chunk = rows.slice(i, i + batchSize);
    const data = await call(name, { schoolId, rows: chunk });
    mergeImportResults(aggregate, data);
  }

  return aggregate;
}

export const adminBulkImportStudents = (payload, options) =>
  callBatched(
    'adminBulkImportStudents',
    payload,
    STUDENT_IMPORT_BATCH_SIZE,
    options?.onProgress
  );

export const adminBulkImportTeachers = (payload, options) =>
  callBatched(
    'adminBulkImportTeachers',
    payload,
    TEACHER_IMPORT_BATCH_SIZE,
    options?.onProgress
  );

export const adminResetStudentPassword = (payload) =>
  call('adminResetStudentPassword', payload);

export const createSchool = (payload) => call('createSchool', payload);

export const sendVerificationCode = (payload) =>
  call('sendVerificationCode', payload);

export const verifyCode = (payload) => call('verifyCode', payload);

export const createSelfRegisteredStudent = (payload) =>
  call('createSelfRegisteredStudent', payload);

export const acceptMateRequest = (payload) => call('acceptMateRequest', payload);
