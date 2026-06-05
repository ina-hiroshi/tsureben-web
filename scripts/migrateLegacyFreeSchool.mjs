#!/usr/bin/env node
/**
 * 既存の無償提供校に legacy_free 課金情報を付与します。
 *
 *   LEGACY_SCHOOL_ID=<schoolId> npm run migrate:legacy-school
 *
 * 前提: firebase login 済み
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
const FIREBASE_CLI_CLIENT_ID =
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET =
  process.env.FIREBASE_CLIENT_SECRET || 'j9iVZfS8kkCEFUPaAeJV0sAi';

const schoolId = process.env.LEGACY_SCHOOL_ID?.trim();
if (!schoolId) {
  console.error('LEGACY_SCHOOL_ID を指定してください。');
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
  if (!response.token) {
    throw new Error('アクセストークンの取得に失敗しました');
  }
  return response.token;
}

function firestoreValue(value) {
  if (value === null) return { nullValue: null };
  if (typeof value === 'string') return { stringValue: value };
  if (typeof value === 'boolean') return { booleanValue: value };
  if (typeof value === 'object' && !Array.isArray(value)) {
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

async function getSchoolDoc(token) {
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/schools/${schoolId}`;
  const url = `https://firestore.googleapis.com/v1/${docPath}`;
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data?.error?.message || res.statusText);
  }
  return res.json();
}

async function patchSchoolBilling(token) {
  const docPath = `projects/${PROJECT_ID}/databases/(default)/documents/schools/${schoolId}`;
  const url = `https://firestore.googleapis.com/v1/${docPath}?updateMask.fieldPaths=billing&updateMask.fieldPaths=updatedAt`;
  const now = new Date().toISOString();
  const body = {
    fields: {
      billing: firestoreValue({
        plan: 'legacy_free',
        status: 'active',
        seatLimit: null,
        stripeCustomerId: null,
        stripeSubscriptionId: null,
        currentPeriodEnd: null,
        trialEnd: null,
        updatedAt: now,
      }),
      updatedAt: firestoreValue(now),
    },
  };
  const res = await fetch(url, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error?.message || res.statusText);
  }
  return data;
}

function readFieldString(fields, key) {
  return fields?.[key]?.stringValue ?? null;
}

const token = await getAccessToken();
const existing = await getSchoolDoc(token);
if (!existing) {
  console.error(`学校が見つかりません: ${schoolId}`);
  process.exit(1);
}

const name = readFieldString(existing.fields, 'name') || '名称不明';
await patchSchoolBilling(token);
console.log(`legacy_free を設定しました: ${schoolId} (${name})`);
