#!/usr/bin/env node
/**
 * Phase 6: スケジュール Functions の運用状態を確認する。
 *
 * - activeSessions: resetActiveSessions（毎日 3:00 JST）後の残存確認
 * - mateInvites: cleanupExpiredMateInvites 後の期限切れトークン残存確認
 *
 * 前提: firebase login 済み
 *
 * 使い方:
 *   npm run verify:scheduled-functions
 */
import { readFileSync, existsSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const require = createRequire(join(__dirname, '../functions/package.json'));
const { OAuth2Client } = require('google-auth-library');

const PROJECT_ID = 'tsureben';
const FIREBASE_CLI_CLIENT_ID =
  '563584335869-fgrhgmd47bqnekij5i8b5pr03ho849e6.apps.googleusercontent.com';
const FIREBASE_CLI_CLIENT_SECRET =
  process.env.FIREBASE_CLIENT_SECRET || 'j9iVZfS8kkCEFUPaAeJV0sAi';

async function getAccessToken() {
  const configPath = join(homedir(), '.config/configstore/firebase-tools.json');
  if (!existsSync(configPath)) throw new Error('firebase login してください');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const client = new OAuth2Client(FIREBASE_CLI_CLIENT_ID, FIREBASE_CLI_CLIENT_SECRET);
  client.setCredentials({ refresh_token: config.tokens.refresh_token });
  const response = await client.getAccessToken();
  if (!response.token) throw new Error('アクセストークン取得失敗');
  return response.token;
}

async function runQuery(token, collection, structuredQuery) {
  const url = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents:runQuery`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ structuredQuery: { from: [{ collectionId: collection }], ...structuredQuery } }),
  });
  const data = await res.json().catch(() => []);
  if (!res.ok) {
    const msg = data?.error?.message || res.statusText;
    throw new Error(`Firestore query failed: ${msg}`);
  }
  return data.filter((row) => row.document);
}

function parseTimestamp(field) {
  if (!field) return null;
  if (field.timestampValue) return new Date(field.timestampValue);
  return null;
}

async function main() {
  const token = await getAccessToken();
  const now = new Date();
  const issues = [];

  console.log(`\n=== スケジュール Functions 運用確認 (${now.toISOString()}) ===\n`);

  const sessions = await runQuery(token, 'activeSessions', { limit: 50 });
  console.log(`activeSessions: ${sessions.length} 件`);
  if (sessions.length > 0) {
    const hourJst = (now.getUTCHours() + 9) % 24;
    if (hourJst >= 4) {
      issues.push(
        `activeSessions に ${sessions.length} 件残存（resetActiveSessions 実行後の想定は 0 件近傍）`
      );
    }
    for (const row of sessions.slice(0, 5)) {
      const id = row.document.name.split('/').pop();
      console.log(`  - ${decodeURIComponent(id)}`);
    }
    if (sessions.length > 5) console.log(`  ... 他 ${sessions.length - 5} 件`);
  } else {
    console.log('  OK: セッションなし（resetActiveSessions 正常と推定）');
  }

  const expiredInvites = await runQuery(token, 'mateInvites', {
    where: {
      fieldFilter: {
        field: { fieldPath: 'expiresAt' },
        op: 'LESS_THAN',
        value: { timestampValue: now.toISOString() },
      },
    },
    limit: 50,
  });
  console.log(`\nmateInvites（期限切れ）: ${expiredInvites.length} 件`);
  if (expiredInvites.length > 0) {
    issues.push(
      `期限切れ mateInvites が ${expiredInvites.length} 件残存（cleanupExpiredMateInvites 要確認）`
    );
    for (const row of expiredInvites.slice(0, 5)) {
      const id = row.document.name.split('/').pop();
      const expiresAt = parseTimestamp(row.document.fields?.expiresAt);
      console.log(`  - ${id} (expires: ${expiresAt?.toISOString() || '?'})`);
    }
  } else {
    console.log('  OK: 期限切れ招待なし（cleanupExpiredMateInvites 正常と推定）');
  }

  console.log('\n--- Functions ログ確認（手動） ---');
  console.log(
    'https://console.firebase.google.com/project/tsureben/functions/logs'
  );
  console.log('Phase 1〜5 実施中に createMateInvite / redeemMateInvite 等で HttpsError がないこと');

  if (issues.length > 0) {
    console.log('\n⚠ 要確認:');
    issues.forEach((msg) => console.log(`  - ${msg}`));
    process.exit(1);
  }
  console.log('\n✔ 自動確認項目は問題なし');
}

main().catch((err) => {
  console.error('失敗:', err.message || err);
  process.exit(1);
});
