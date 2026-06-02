#!/usr/bin/env node
/**
 * App Store 審査用の自己登録生徒アカウントを Firebase に作成する。
 *
 * 前提: firebase login 済み（~/.config/configstore/firebase-tools.json）
 *
 * 使い方:
 *   npm run create-review-account
 *   REVIEW_EMAIL=xxx REVIEW_PASSWORD=yyy npm run create-review-account
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
const DEFAULT_EMAIL = 'tsureben.appstore.review@gmail.com';
const DEFAULT_NAME = 'App Store 審査用';
const MIN_REVIEW_PASSWORD_LENGTH = 8;
// firebase-tools と同じ OAuth クライアント（公開値）
const FIREBASE_CLI_CLIENT_ID =
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET =
  process.env.FIREBASE_CLIENT_SECRET || 'j9iVZfS8kkCEFUPaAeJV0sAi';

const email = (process.env.REVIEW_EMAIL || DEFAULT_EMAIL).trim().toLowerCase();
const password = process.env.REVIEW_PASSWORD?.trim();
const displayName = process.env.REVIEW_NAME || DEFAULT_NAME;

if (!password) {
  console.error(
    'REVIEW_PASSWORD を環境変数で指定してください（8文字以上、リポジトリに保存しないこと）'
  );
  console.error(
    "例: REVIEW_EMAIL=review@example.com REVIEW_PASSWORD='YourPass8+' npm run create-review-account"
  );
  process.exit(1);
}

if (password.length < MIN_REVIEW_PASSWORD_LENGTH) {
  console.error(`REVIEW_PASSWORD は${MIN_REVIEW_PASSWORD_LENGTH}文字以上にしてください`);
  process.exit(1);
}

async function getAccessToken() {
  const configPath = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!existsSync(configPath)) {
    throw new Error('firebase login してください（firebase-tools.json が見つかりません）');
  }
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const refreshToken = config?.tokens?.refresh_token;
  if (!refreshToken) {
    throw new Error('firebase login の refresh_token がありません。firebase login を再実行してください。');
  }
  const client = new OAuth2Client(FIREBASE_CLI_CLIENT_ID, FIREBASE_CLI_CLIENT_SECRET);
  client.setCredentials({ refresh_token: refreshToken });
  const response = await client.getAccessToken();
  if (!response.token) {
    throw new Error('アクセストークンの取得に失敗しました。firebase login を再実行してください。');
  }
  return response.token;
}

async function authFetch(token, path, body) {
  const url = `https://identitytoolkit.googleapis.com/v1/projects/${PROJECT_ID}${path}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    throw new Error(`Auth API: ${msg}`);
  }
  return data;
}

async function lookupUserByEmail(token) {
  try {
    return await authFetch(token, '/accounts:lookup', { email: [email] });
  } catch (err) {
    if (String(err.message).includes('EMAIL_NOT_FOUND')) return null;
    throw err;
  }
}

async function ensureAuthUser(token) {
  const lookup = await lookupUserByEmail(token);
  const existing = lookup?.users?.[0];
  let created = false;
  let uid;

  if (existing?.localId) {
    uid = existing.localId;
    await authFetch(token, '/accounts:update', {
      localId: uid,
      email,
      password,
      displayName,
      emailVerified: true,
      returnSecureToken: false,
    });
    console.log(`既存の Auth ユーザーを更新しました: ${email}`);
  } else {
    const createdUser = await authFetch(token, '/accounts', {
      email,
      password,
      displayName,
      emailVerified: true,
    });
    uid = createdUser.localId;
    created = true;
    console.log(`Auth ユーザーを新規作成しました: ${email}`);
  }

  return { uid, created };
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
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

async function upsertUserDoc(token) {
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/users/${encodeURIComponent(email)}`;
  const url = `https://firestore.googleapis.com/v1/${docPath}`;
  const now = new Date().toISOString();
  const fields = {
    role: firestoreValue('student'),
    name: firestoreValue(displayName),
    nameLower: firestoreValue(displayName.toLowerCase()),
    schoolId: firestoreValue(null),
    registrationType: firestoreValue('self_registered'),
    profileComplete: firestoreValue(false),
    shareScope: firestoreValue('学年のみ'),
    mateScope: firestoreValue('学内のみ'),
    mutualMates: firestoreValue([]),
    pendingSent: firestoreValue([]),
    pendingReceived: firestoreValue([]),
    hiddenMates: firestoreValue([]),
    hiddenRequests: firestoreValue([]),
    subjectCatalog: firestoreValue({}),
    updatedAt: firestoreValue(now),
  };

  const getRes = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });

  const patchFields = { ...fields };
  if (!getRes.ok) {
    patchFields.createdAt = firestoreValue(now);
  }

  const mask = Object.keys(patchFields)
    .map((key) => `updateMask.fieldPaths=${key}`)
    .join('&');
  const patchUrl = `${url}?${mask}`;

  const res = await fetch(patchUrl, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ fields: patchFields }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || 'Firestore への書き込みに失敗しました');
  }
  console.log(`Firestore users/${email} を保存しました`);
}

async function checkTeacherDoc(token) {
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/teachers/${encodeURIComponent(email)}`;
  const res = await fetch(`https://firestore.googleapis.com/v1/${docPath}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.ok) {
    console.warn('警告: 同じメールが teachers にも存在します。審査用生徒としては不適切な可能性があります。');
  }
}

async function main() {
  const token = await getAccessToken();
  const { uid, created } = await ensureAuthUser(token);
  await upsertUserDoc(token);
  await checkTeacherDoc(token);

  console.log('\n--- App Store 審査メモに記載する内容 ---');
  console.log(`メール: ${email}`);
  console.log(`パスワード: ${password}`);
  console.log(`registrationType: self_registered（設定からアカウント削除可能）`);
  console.log(`Auth: ${created ? '新規作成' : 'パスワード更新'} (uid: ${uid})`);
  console.log('\nConnect の審査メモと docs/app-store-review.md に上記をコピーしてください。');
}

main().catch((err) => {
  console.error('失敗:', err.message || err);
  process.exit(1);
});
