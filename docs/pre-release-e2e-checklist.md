# 大規模リリース前 最終テストチェックリスト

本番環境（`tsureben`）・Web + iOS 向けの手動 E2E テスト記録用です。

## 事前準備

### 自動テスト（ゲート）

```bash
npm run test:pre-release
```

| 項目 | 結果 | 実施日 |
|------|------|--------|
| `test:rules`（Firestore ルール 27件+） | PASS (2026-07-10) | 2026-07-10 |
| `test:school-onboarding` | PASS (2026-07-10) | 2026-07-10 |

### テストアカウント

```bash
E2E_PASSWORD='YourPass8+' E2E_SCHOOL_ID='your-school-id' \
  E2E_STUDENT_A_EMAIL='...' E2E_STUDENT_B_EMAIL='...' \
  E2E_STUDENT_C_EMAIL='...' E2E_TEACHER_EMAIL='...' \
  npm run create-e2e-test-accounts
```

| ロール | メール | 備考 |
|--------|--------|------|
| 生徒A | | 招待者・学習記録作成 |
| 生徒B | | 同一校内 |
| 生徒C | | 別校（学外テスト） |
| 教員T | | teachers 登録済み |
| 学校管理者 | | 任意（F-08） |

共通パスワード: _______________  
学校ID (A/B/教員): `kiEygnE45I5JYQeSmTSN`（獨協埼玉中学高等学校）  
学校ID (生徒C): _______________（別校テスト時）

### 検証ツール

- [Firestore Console](https://console.firebase.google.com/project/tsureben/firestore)
- [Functions ログ](https://console.firebase.google.com/project/tsureben/functions/logs)
- ブラウザ DevTools → Network（Callable 確認）
- iOS: Safari Web インスペクタ / Xcode コンソール

---

## Phase 1: 連れ勉仲間（Cloud Functions）

| ID | 内容 | Web | iOS | Firestore/Functions | 結果 |
|----|------|-----|-----|---------------------|------|
| M-01 | 招待QR/URL表示 | | | `mateInvites/{token}` 作成 | |
| M-02 | iOS で招待表示 | | | 同上 | |
| M-03 | `createMateInvite` 200 | | | Network 確認 | |
| M-04 | 未ログインでプレビュー | | | `getMateInvitePreview` | |
| M-05 | 期限切れトークン拒否 | PASS | | 無効トークン→エラー表示 | |
| M-06 | 申請（redeemMateInvite） | | | pending 配列更新 | |
| M-07 | 承認待ち表示（home/mate） | | | | |
| M-08 | Web招待→iOS申請 | | | | |
| M-09 | 重複申請拒否 | | | | |
| M-10 | 承認（mutualMates） | | | 双方 mutualMates | |
| M-11 | 一緒に勉強中表示 | | | activeSessions.mateEmails | |
| M-12 | 申請取消 | | | pending 削除 | |
| M-13 | 学内のみ→別校拒否 | | | Callable エラー | |
| M-14 | 学内外→別校成功 | | | | |
| M-15 | iOS QR 読取 | | | | |
| M-16 | 共有リンクタップ | | | | |
| M-17 | mutualMates 直接書込拒否 | | | ルール拒否 | |
| M-18 | 教員は仲間機能非使用 | | | | |

---

## Phase 2: 学習記録

| ID | 内容 | Web | iOS | Firestore | 結果 |
|----|------|-----|-----|-----------|------|
| L-01 | タイマー→記録保存 | | | `logs/{email}/days/{date}` | |
| L-02 | ホーム本日サマリー | | | totalMinutes | |
| L-03 | iOS タイマー記録 | | | | |
| L-04 | 計測漏れ追加（過去日） | | | entries 追加 | |
| L-05 | 未来日追加拒否 | | | 書込なし | |
| L-06 | 記録編集 | | | entries 更新 | |
| L-07 | 記録削除 | | | entries 削除 | |
| L-08 | 週/月ビュー集計 | | | | |
| L-09 | 教科別集計一致 | | | bySubject | |
| L-10 | 学習中→教員 live 表示 | | | activeSessions | |
| L-11 | 終了後 live から消える | | | | |
| L-12 | 仲間の勉強中表示 | | | mateEmails | |

---

## Phase 3: 教員コメント

| ID | 内容 | Web | iOS | Firestore | 結果 |
|----|------|-----|-----|-----------|------|
| F-01 | 日次スレッド作成・送信 | | | feedbackThreads | |
| F-02 | メッセージ保存 | | | messages authorRole=teacher | |
| F-03 | 生徒 /feedback 閲覧 | | | unreadByStudent=false | |
| F-04 | 生徒返信 | | | unreadByTeacher=true | |
| F-05 | 教員未読解消 | | | | |
| F-06 | コメント編集 | | | body, updatedAt | |
| F-07 | 論理削除 | | | deletedAt/deletedBy | |
| F-08 | 管理者監査画面 | | | /admin/teacher-comments | |
| F-09 | 別校生徒へ送信不可 | | | | |
| F-10 | 他生徒スレッド閲覧拒否 | | | | |

---

## Phase 4: 教員データ閲覧

| ID | 内容 | Web | iOS | 結果 |
|----|------|-----|-----|------|
| T-01 | live で学習中生徒表示 | | | |
| T-02 | 学年・組・名前フィルタ | | | |
| T-03 | カードクリック→students 遷移 | | | |
| T-04 | 学習記録 readOnly 表示 | | | |
| T-05 | 日/週/月切替一致 | | | |
| T-06 | 学習計画タブ | | | |
| T-07 | 編集ボタンなし | | | |
| T-08 | 同一校生徒のみ一覧 | | | |
| T-09 | 別校 logs 読取拒否 | | | |
| T-10 | iOS 教員 live | | | |

---

## Phase 5: 横断統合

| ID | シナリオ | Web | iOS | 結果 |
|----|----------|-----|-----|------|
| X-01 | 学習→live→記録→コメント→feedback | | | |
| X-02 | 仲間化→勉強中表示 | | | |
| X-03 | Web記録→iOS教員即時反映 | | | |
| X-04 | iOS受信→Web返信→iOS未読 | | | |

---

## Phase 6: スケジュール Functions

```bash
npm run verify:scheduled-functions
```

| 項目 | 確認方法 | 結果 | 実施日 |
|------|----------|------|--------|
| resetActiveSessions | 翌朝 activeSessions ≒ 0 | PASS | 2026-07-10 |
| cleanupExpiredMateInvites | 期限切れ mateInvites なし | PASS | 2026-07-10 |
| Callable エラーなし | Functions ログ確認 | | |

---

## 合格基準

- ブロッカー: 0 件
- メジャー: 0 件
- 各 Phase の正常系 + 権限1件が Web/iOS で PASS

## 不具合記録

| ケースID | 重要度 | 内容 | 対応 |
|----------|--------|------|------|
| | | | |
