#!/usr/bin/env node
/**
 * 本番環境での E2E Callable / Firestore 統合テスト。
 *
 * 環境変数（すべて必須）:
 *   E2E_PASSWORD
 *   E2E_STUDENT_A_EMAIL, E2E_STUDENT_B_EMAIL
 *   E2E_TEACHER_EMAIL（教員コメント・閲覧テスト用）
 *
 * 任意:
 *   E2E_STUDENT_C_EMAIL（学外テスト）
 *
 * 使い方:
 *   E2E_PASSWORD='...' E2E_STUDENT_A_EMAIL='...' ... npm run test:e2e-production
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ID = 'tsureben';
const REGION = 'asia-northeast1';
const API_KEY = 'AIzaSyDcGpXuofSqCj3Ngc22lKq3VZoeXAV2hUw';

const password = process.env.E2E_PASSWORD?.trim();
const studentA = process.env.E2E_STUDENT_A_EMAIL?.trim().toLowerCase();
const studentB = process.env.E2E_STUDENT_B_EMAIL?.trim().toLowerCase();
const studentC = process.env.E2E_STUDENT_C_EMAIL?.trim().toLowerCase();
const teacherEmail = process.env.E2E_TEACHER_EMAIL?.trim().toLowerCase();

const results = [];

function record(id, pass, detail = '') {
  results.push({ id, pass, detail });
  const mark = pass ? 'PASS' : 'FAIL';
  console.log(`[${mark}] ${id}${detail ? `: ${detail}` : ''}`);
}

async function signIn(email) {
  const res = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || 'signIn failed');
  return data.idToken;
}

async function callCallable(name, data, idToken = null) {
  const headers = { 'Content-Type': 'application/json' };
  if (idToken) headers.Authorization = `Bearer ${idToken}`;
  const res = await fetch(
    `https://${REGION}-${PROJECT_ID}.cloudfunctions.net/${name}`,
    { method: 'POST', headers, body: JSON.stringify({ data: data ?? {} }) }
  );
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.error?.message || res.statusText);
    err.code = body?.error?.status;
    err.details = body?.error?.details;
    throw err;
  }
  return body.result;
}

async function getFirestoreDoc(idToken, path) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(url, { headers: { Authorization: `Bearer ${idToken}` } });
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'Firestore get failed');
  }
  return res.json();
}

function fieldStrings(doc, field) {
  const arr = doc?.fields?.[field]?.arrayValue?.values || [];
  return arr.map((v) => v.stringValue).filter(Boolean);
}

async function testMateInviteFlow(tokenA, tokenB) {
  const invite = await callCallable('createMateInvite', {}, tokenA);
  record('M-01/M-03', Boolean(invite?.inviteUrl || invite?.token), 'createMateInvite');

  const token = invite?.token || invite?.inviteUrl?.split('/mate-invite/')?.[1]?.split(/[?#]/)[0];
  if (!token) {
    record('M-04', false, 'token missing');
    return;
  }

  const preview = await callCallable('getMateInvitePreview', { token });
  record('M-04', Boolean(preview?.inviterName), 'getMateInvitePreview');

  try {
    await callCallable('redeemMateInvite', { token }, tokenB);
    record('M-06', true, 'redeemMateInvite');
  } catch (err) {
    record('M-06', false, err.message);
    return;
  }

  const docA = await getFirestoreDoc(tokenA, `users/${encodeURIComponent(studentA)}`);
  const pendingReceived = fieldStrings(docA, 'pendingReceived');
  record('M-07', pendingReceived.includes(studentB), `pendingReceived has B`);

  try {
    await callCallable('redeemMateInvite', { token }, tokenB);
    record('M-09', false, 'duplicate should fail');
  } catch {
    record('M-09', true, 'duplicate rejected');
  }

  await callCallable('acceptMateRequest', { targetEmail: studentB }, tokenA);
  const docA2 = await getFirestoreDoc(tokenA, `users/${encodeURIComponent(studentA)}`);
  const docB2 = await getFirestoreDoc(tokenB, `users/${encodeURIComponent(studentB)}`);
  const matesA = fieldStrings(docA2, 'mutualMates');
  const matesB = fieldStrings(docB2, 'mutualMates');
  record('M-10', matesA.includes(studentB) && matesB.includes(studentA), 'mutualMates');
}

async function testCrossSchoolReject(tokenC, tokenA) {
  if (!studentC || !tokenC) {
    record('M-13', null, 'SKIP (E2E_STUDENT_C_EMAIL unset)');
    return;
  }
  const invite = await callCallable('createMateInvite', {}, tokenA);
  const token = invite?.token || invite?.inviteUrl?.split('/mate-invite/')?.[1]?.split(/[?#]/)[0];
  try {
    await callCallable('redeemMateInvite', { token }, tokenC);
    record('M-13', false, 'should reject cross-school');
  } catch {
    record('M-13', true, 'cross-school rejected');
  }
}

async function testExpiredInvitePreview() {
  try {
    await callCallable('getMateInvitePreview', { token: '00000000-0000-0000-0000-000000000000' });
    record('M-05', false, 'invalid token should fail');
  } catch {
    record('M-05', true, 'invalid/expired token rejected');
  }
}

async function testLogsWrite(tokenA) {
  const today = new Date().toISOString().slice(0, 10);
  const path = `logs/${encodeURIComponent(studentA)}/days/${today}`;
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`;
  const res = await fetch(`${url}?updateMask.fieldPaths=entries&updateMask.fieldPaths=totalMinutes&updateMask.fieldPaths=bySubject`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${tokenA}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      fields: {
        entries: {
          arrayValue: {
            values: [{
              mapValue: {
                fields: {
                  id: { stringValue: 'e2e-test-1' },
                  startTime: { stringValue: '10:00' },
                  subject: { stringValue: 'E2E数学' },
                  duration: { integerValue: '25' },
                },
              },
            }],
          },
        },
        totalMinutes: { integerValue: '25' },
        bySubject: { mapValue: { fields: { E2E数学: { integerValue: '25' } } } },
      },
    }),
  });
  record('L-01', res.ok, res.ok ? 'log write' : (await res.json().catch(() => ({})))?.error?.message);

  if (teacherEmail) {
    const tokenT = await signIn(teacherEmail);
    const readRes = await fetch(url, { headers: { Authorization: `Bearer ${tokenT}` } });
    record('T-04', readRes.ok, 'teacher reads student log');
  }
}

async function main() {
  if (!password || !studentA || !studentB) {
    console.error('E2E_PASSWORD, E2E_STUDENT_A_EMAIL, E2E_STUDENT_B_EMAIL が必要です');
    console.error('docs/pre-release-e2e-checklist.md のアカウント準備を先に実施してください');
    process.exit(1);
  }

  console.log('\n=== 本番 E2E Callable テスト ===\n');

  await testExpiredInvitePreview();

  const tokenA = await signIn(studentA);
  const tokenB = await signIn(studentB);
  let tokenC = null;
  if (studentC) {
    try {
      tokenC = await signIn(studentC);
    } catch (err) {
      console.warn(`生徒C ログイン失敗: ${err.message}`);
    }
  }

  await testMateInviteFlow(tokenA, tokenB);
  await testCrossSchoolReject(tokenC, tokenA);
  await testLogsWrite(tokenA);

  const failed = results.filter((r) => r.pass === false);
  const passed = results.filter((r) => r.pass === true);
  console.log(`\n--- 結果: ${passed.length} PASS, ${failed.length} FAIL ---`);
  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error('失敗:', err.message || err);
  process.exit(1);
});
