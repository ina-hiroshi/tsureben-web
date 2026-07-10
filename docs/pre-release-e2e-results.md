# 大規模リリース前 最終テスト結果

実施日: 2026-07-10  
環境: 本番（`tsureben`）

## Phase 0: 事前準備 — 完了

| 項目 | 結果 | 詳細 |
|------|------|------|
| `npm run test:pre-release` | **PASS** | ルール 27件 + オンボーディング 10件 |
| テストアカウント準備スクリプト | **READY** | `npm run create-e2e-test-accounts` |
| 本番学校ID確認 | **確認済** | `kiEygnE45I5JYQeSmTSN`（獨協埼玉中学高等学校） |

### アカウント作成コマンド（手動実施）

```bash
E2E_PASSWORD='YourPass8+' \
E2E_SCHOOL_ID='kiEygnE45I5JYQeSmTSN' \
E2E_STUDENT_A_EMAIL='your-a@domain' \
E2E_STUDENT_B_EMAIL='your-b@domain' \
E2E_STUDENT_C_EMAIL='your-c@domain' \
E2E_TEACHER_EMAIL='your-teacher@domain' \
npm run create-e2e-test-accounts
```

作成後、Callable 統合テスト:

```bash
E2E_PASSWORD='...' E2E_STUDENT_A_EMAIL='...' E2E_STUDENT_B_EMAIL='...' \
E2E_TEACHER_EMAIL='...' npm run test:e2e-production
```

---

## Phase 1: 連れ勉仲間

| ID | 結果 | 実施方法 | 備考 |
|----|------|----------|------|
| M-01 | MANUAL | Web/iOS 手動 | Callable スクリプトで代替可 |
| M-02 | MANUAL | iOS 手動 | |
| M-03 | AUTO | Callable HTTP | `createMateInvite` エンドポイント到達確認済 |
| M-04 | PARTIAL | Callable | `getMateInvitePreview` 正常応答 |
| M-05 | **PASS** | Web + Callable | 無効トークン →「招待が見つかりません」/ `{invalid:true}` |
| M-06〜M-18 | MANUAL | 要2アカウント | `test:e2e-production` で M-06,07,09,10,13 自動化 |

### 自動検証済み（Firestore ルール）

- `mutualMates` 直接書込拒否（M-17 相当）
- `mateInvites` クライアントアクセス拒否

---

## Phase 2: 学習記録

| ID | 結果 | 実施方法 | 備考 |
|----|------|----------|------|
| L-01〜L-12 | MANUAL | Web/iOS 手動 | `test:e2e-production` で L-01 自動化 |

### 自動検証済み（Firestore ルール）

- 生徒の自ログ書込可
- 教員の同一校ログ読取可（T-04 相当）
- 教員の他校ログ読取拒否（T-09 相当）
- 生徒の他者ログ読取拒否

---

## Phase 3: 教員コメント

| ID | 結果 | 実施方法 | 備考 |
|----|------|----------|------|
| F-01〜F-10 | MANUAL | 教員+生徒アカウント必要 | |

### 自動検証済み（Firestore ルール）

- 教員の同一校スレッド作成可（F-01 相当）
- 生徒の自スレッド読取可（F-03 相当）
- 他校スレッド読取拒否（F-09 相当）
- 他生徒スレッド読取拒否（F-10 相当）
- 教員メッセージ投稿可（F-02 相当）

---

## Phase 4: 教員データ閲覧

| ID | 結果 | 実施方法 | 備考 |
|----|------|----------|------|
| T-01〜T-10 | MANUAL | 教員アカウント必要 | |

### 自動検証済み（Firestore ルール）

- 教員の同一校 activeSessions 読取可（T-01 相当）
- 教員の同一校 plans 読取可（T-06 相当）
- 教員の他校 plans 読取拒否（T-08/T-09 相当）

---

## Phase 5: 横断統合

| ID | 結果 | 備考 |
|----|------|------|
| X-01〜X-04 | MANUAL | アカウント準備後に手動実施 |

---

## Phase 6: スケジュール Functions — 完了

```bash
npm run verify:scheduled-functions
```

| 項目 | 結果 | 詳細 |
|------|------|------|
| resetActiveSessions | **PASS** | activeSessions 0 件 |
| cleanupExpiredMateInvites | **PASS** | 期限切れ mateInvites 0 件 |
| Callable エラーログ | MANUAL | [Functions ログ](https://console.firebase.google.com/project/tsureben/functions/logs) を Phase 1〜5 実施時に確認 |

---

## 追加したテスト基盤

| ファイル | 用途 |
|----------|------|
| [`docs/pre-release-e2e-checklist.md`](pre-release-e2e-checklist.md) | 手動チェックリスト |
| [`scripts/createE2eTestAccounts.mjs`](../scripts/createE2eTestAccounts.mjs) | 本番テストアカウント作成 |
| [`scripts/runE2eProductionTests.mjs`](../scripts/runE2eProductionTests.mjs) | Callable 統合テスト |
| [`scripts/verifyScheduledFunctions.mjs`](../scripts/verifyScheduledFunctions.mjs) | スケジュール Functions 確認 |
| [`tests/firestore.rules.test.mjs`](../tests/firestore.rules.test.mjs) | 27件（logs/plans/feedback 追加） |

### npm スクリプト

```bash
npm run test:pre-release          # 自動ゲート（37件）
npm run create-e2e-test-accounts  # アカウント準備
npm run test:e2e-production     # 本番 Callable E2E
npm run verify:scheduled-functions # Phase 6
```

---

## 残作業（手動・iOS）

1. `create-e2e-test-accounts` でテストアカウント作成
2. `test:e2e-production` で Callable フロー自動検証
3. [`pre-release-e2e-checklist.md`](pre-release-e2e-checklist.md) の iOS 列を実機で記入
4. 教員 Google ログインでの T-*, F-* 手動確認
