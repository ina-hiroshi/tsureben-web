# TsureBen Firestore Schema

## users/{email}

Profile and social graph (flat document).

- `name`, `nameLower`, `grade`, `class`, `number`
- `schoolId`, `role`, `registrationType`
- `shareScope`, `mateScope` (`学内のみ` | `学内外`)
- `mutualMates`, `pendingSent`, `pendingReceived`, `hiddenMates`, `hiddenRequests`
- `subjectCatalog` (map for autocomplete)
- `profileComplete`, `mustChangePassword`

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

## teachers/{email}, schools/{id}, verification_codes/{email}

Unchanged from prior design.
