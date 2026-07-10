#!/usr/bin/env node
/**
 * 大規模リリース前 E2E テスト用アカウントを Firebase 本番に作成する。
 *
 * 前提: firebase login 済み
 *
 * 使い方:
 *   E2E_PASSWORD='YourPass8+' E2E_SCHOOL_ID='your-school-id' npm run create-e2e-test-accounts
 *
 * 別校テスト用（生徒C）:
 *   E2E_SCHOOL_ID_B='other-school-id' を追加指定
 */
import { createRequire } from 'node:module';
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, '../functions/package.json'));
const { OAuth2Client } = require('google-auth-library');

const PROJECT_ID = 'tsureben';
const MIN_PASSWORD_LENGTH = 8;
const FIREBASE_CLI_CLIENT_ID =
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET =
  process.env.FIREBASE_CLIENT_SECRET || 'j9iVZfS8kkCEFUPaAeJV0sAi';

const password = process.env.E2E_PASSWORD?.trim();
const schoolId = process.env.E2E_SCHOOL_ID?.trim();
const schoolIdB = process.env.E2E_SCHOOL_ID_B?.trim() || schoolId;

const ACCOUNTS = [
  {
    key: 'studentA',
    email: (process.env.E2E_STUDENT_A_EMAIL || 'e2e.student.a@tsureben.test').trim().toLowerCase(),
    name: 'E2E生徒A',
    role: 'student',
    schoolId,
    grade: '1',
    class: '1',
    number: '901',
    type: 'user',
  },
  {
    key: 'studentB',
    email: (process.env.E2E_STUDENT_B_EMAIL || 'e2e.student.b@tsureben.test').trim().toLowerCase(),
    name: 'E2E生徒B',
    role: 'student',
    schoolId,
    grade: '1',
    class: '1',
    number: '902',
    type: 'user',
  },
  {
    key: 'studentC',
    email: (process.env.E2E_STUDENT_C_EMAIL || 'e2e.student.c@tsureben.test').trim().toLowerCase(),
    name: 'E2E生徒C',
    role: 'student',
    schoolId: schoolIdB,
    grade: '1',
    class: '2',
    number: '903',
    type: 'user',
  },
  {
    key: 'teacher',
    email: (process.env.E2E_TEACHER_EMAIL || 'e2e.teacher@tsureben.test').trim().toLowerCase(),
    name: 'E2E教員T',
    role: 'teacher',
    schoolId,
    type: 'teacher',
  },
  {
    key: 'admin',
    email: (process.env.E2E_ADMIN_EMAIL || 'e2e.admin@tsureben.test').trim().toLowerCase(),
    name: 'E2E管理者',
    role: 'school_admin',
    schoolId,
    type: 'teacher',
  },
];

if (!password) {
  console.error('E2E_PASSWORD を環境変数で指定してください（8文字以上）');
  console.error("例: E2E_PASSWORD='YourPass8+' E2E_SCHOOL_ID='school-xxx' npm run create-e2e-test-accounts");
  process.exit(1);
}
if (password.length < MIN_PASSWORD_LENGTH) {
  console.error(`E2E_PASSWORD は${MIN_PASSWORD_LENGTH}文字以上にしてください`);
  process.exit(1);
}
if (!schoolId) {
  console.error('E2E_SCHOOL_ID を指定してください（生徒A/B・教員の所属校）');
  process.exit(1);
}

async function getAccessToken() {
  const configPath = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!existsSync(configPath)) {
    throw new Error('firebase login してください');
  }
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const refreshToken = config?.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error('firebase login を再実行してください');
  }
  const client = new OAuth2Client(FIREBASE_CLI_CLIENT_ID, FIREBASE_CLI_CLIENT_SECRET);
  client.setCredentials({ refresh_token: refreshToken });
  const response = await client.getAccessToken();
  if (!response.token) throw new Error('アクセストークンの取得に失敗しました');
  return response.token;
}

async function authFetch(token, path, body) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error?.message || res.statusText);
  return data;
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'number') return { integerValue: String(value) };
  if (Array.isArray(value)) {
    return { arrayValue: { values: value.map((v) => firestoreValue(v)) } };
  }
  if (typeof value === 'object') {
    return {
      mapValue: {
        fields: Object.fromEntries(
          Object.entries(value).map(([k, v]) => [k, firestoreValue(v)])
        ),
      },
    };
  }
  throw new Error(`Unsupported Firestore value: ${value}`);
}

async function ensureAuthUser(token, email, displayName) {
  let existing = null;
  try {
    const lookup = await authFetch(token, '/accounts:lookup', { email: [email] });
    existing = lookup?.users?.[0];
  } catch (err) {
    if (!String(err.message).includes('EMAIL_NOT_FOUND')) throw err;
  }

  if (existing?.localId) {
    await authFetch(token, '/accounts:update', {
      localId: existing.localId,
      email,
      password,
      displayName,
      emailVerified: true,
      returnSecureToken: false,
    });
    return { uid: existing.localId, created: false };
  }

  const created = await authFetch(token, '/accounts', {
    email,
    password,
    displayName,
    emailVerified: true,
  });
  return { uid: created.localId, created: true };
}

async function patchFirestoreDoc(token, collection, email, fields) {
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/${collection}/${encodeURIComponent(email)}`;
  const url = `https://firestore.googleapis.com/v1/${docPath}`;
  const now = new Date().toISOString();

  const getRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  const patchFields = { ...fields, updatedAt: firestoreValue(now) };
  if (!getRes.ok) patchFields.createdAt = firestoreValue(now);

  const mask = Object.keys(patchFields)
    .map((key) => `updateMask.fieldPaths=${key}`)
    .join('&');
  const res = await fetch(`${url}?${mask}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      fields: Object.fromEntries(
        Object.entries(patchFields).map(([k, v]) => [k, firestoreValue(v)])
      ),
    }),
  });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || `Firestore ${collection}/${email} への書き込み失敗`);
  }
}

function buildUserFields(account) {
  return {
    role: account.role === 'student' ? 'student' : 'student',
    name: account.name,
    nameLower: account.name.toLowerCase(),
    schoolId: account.schoolId,
    grade: account.grade,
    class: account.class,
    number: account.number,
    registrationType: 'school_provisioned',
    profileComplete: true,
    onboardingComplete: true,
    mustChangePassword: false,
    shareScope: '学年のみ',
    mateScope: '学内のみ',
    mutualMates: [],
    pendingSent: [],
    pendingReceived: [],
    hiddenMates: [],
    hiddenRequests: [],
    subjectCatalog: {},
  };
}

function buildTeacherFields(account) {
  return {
    schoolId: account.schoolId,
    role: account.role,
    name: account.name,
  };
}

async function main() {
  const token = await getAccessToken();
  const results = [];

  for (const account of ACCOUNTS) {
    const { uid, created } = await ensureAuthUser(token, account.email, account.name);
    if (account.type === 'user') {
      await patchFirestoreDoc(token, 'users', account.email, buildUserFields(account));
    } else {
      await patchFirestoreDoc(token, 'teachers', account.email, buildTeacherFields(account));
    }
    results.push({ ...account, uid, created });
    console.log(
      `${created ? '作成' : '更新'}: ${account.key} → ${account.email} (${account.type})`
    );
  }

  console.log('\n--- E2E テスト用ログイン情報（docs/pre-release-e2e-checklist.md に記録） ---');
  console.log(`共通パスワード: ${password}`);
  console.log(`学校ID (A/B/教員): ${schoolId}`);
  if (schoolIdB !== schoolId) console.log(`学校ID (生徒C): ${schoolIdB}`);
  console.log('');
  for (const r of results) {
    console.log(`${r.key}: ${r.email}`);
  }
  console.log('\n※ @tsureben.test はプレースホルダーです。実際のドメインは E2E_*_EMAIL で上書きしてください。');
}

main().catch((err) => {
  console.error('失敗:', err.message || err);
  process.exit(1);
});
