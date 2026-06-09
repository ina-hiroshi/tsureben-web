# TsureBen Firestore Schema

## users/{email}

Profile and social graph (flat document).

- `name`, `nameLower`, `grade`, `class`, `number`
- `schoolId`, `role`, `registrationType`
- `shareScope`, `mateScope` (`学内のみ` | `学内外`)
- `mutualMates`, `pendingSent`, `pendingReceived`, `hiddenMates`, `hiddenRequests`
- `subjectCatalog` (map for autocomplete)
- `profileComplete`, `mustChangePassword`, `onboardingComplete`（学校配布アカウントの初回セットアップ完了）
- `migratedTo`, `migratedAt`, `disabledAt`（別メールへ引き継ぎ後に無効化された移行元の tombstone。Cloud Functions のみ）

## plans/{email}/days/{YYYY-MM-DD}

```json
{ "entries": [{ "id", "start", "end", "subject", "topic", "book", "content" }] }
```

## logs/{email}/days/{YYYY-MM-DD}

```json
{
  "entries": [{ "id", "startTime", "subject", "topic", "book", "content", "duration" }],
  "totalMinutes": 0,
  "bySubject": {}
}
```

## activeSessions/{email}

Live study session for presence.

- `name`, `schoolId`, `grade`, `class`, `shareScope`
- `subject`, `topic`, `book`, `content`, `startTime`
- `mateEmails` (array for array-contains queries)

## feedbackThreads/{threadId}

Teacher–student feedback threads.

- `studentEmail`, `schoolId`, `scope` (`daily` | `general`), `dateKey`, `title`
- `createdBy`, `createdByName`, `createdAt`, `updatedAt`, `lastMessageAt`
- `unreadByStudent`, `unreadByTeacher`

### messages/{messageId}

- `authorEmail`, `authorRole` (`teacher` | `student`), `authorName`, `body`, `createdAt`
- `updatedAt` (optional, on edit)
- `deletedAt`, `deletedBy` (optional, soft delete — hidden from normal UI; visible on school admin audit page)

## schools/{id}

- `name`, `settings`（`studentEmailDomain` など）
- `billing`（Cloud Functions / Stripe Webhook のみ書き込み）
  - `plan`: `starter` | `standard` | `campus` | `legacy_free`
  - `status`: `trialing` | `active` | `past_due` | `canceled` | `unpaid`
  - `seatLimit`（`legacy_free` は `null`）
  - `stripeCustomerId`, `stripeSubscriptionId`
  - `currentPeriodEnd`, `trialEnd`
- `createdAt`, `createdBy`, `updatedAt`

## billingInvites/{email}

Checkout 完了後の school_admin 紐づけ（Cloud Functions のみ）。

- `schoolId`, `plan`, `schoolName`, `stripeCustomerId`
- `createdAt`, `claimedAt`, `claimedBy`

## stripeEvents/{eventId}

Stripe Webhook の冪等性用（Cloud Functions のみ）。

## teachers/{email}, verification_codes/{email}

Unchanged from prior design.

## mateInvites/{tokenId}

Time-limited mate invite tokens (Cloud Functions only).

- `inviterEmail`
- `createdAt`, `expiresAt` (30-minute TTL)

## accountTransfers/{code}

一般ユーザー（`self_registered`）が別メールの管理アカウント（`school_provisioned`）へデータを引き継ぐためのコード（Cloud Functions のみ）。

- `sourceEmail`（引き継ぎ元）
- `used`, `usedAt`, `targetEmail`（使用後）
- `createdAt`, `expiresAt`（15-minute TTL、単回使用）

## schoolJoinInvites/{email}

学校管理者の一括登録で「既存の一般ユーザーと同一メール」が検出されたときに作成される参加招待（Cloud Functions のみ）。承認するとその場で `school_provisioned` へ昇格する。

- `schoolId`, `name`, `grade`, `class`, `number`
- `createdAt`, `createdBy`
