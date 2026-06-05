# TsureBen Firestore Schema

## users/{email}

Profile and social graph (flat document).

- `name`, `nameLower`, `grade`, `class`, `number`
- `schoolId`, `role`, `registrationType`
- `shareScope`, `mateScope` (`学内のみ` | `学内外`)
- `mutualMates`, `pendingSent`, `pendingReceived`, `hiddenMates`, `hiddenRequests`
- `subjectCatalog` (map for autocomplete)
- `profileComplete`, `mustChangePassword`, `onboardingComplete`（学校配布アカウントの初回セットアップ完了）

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
