# TsureBen Design System — Study Room

## Theme
Warm cafe study room. Mobile-first, iOS Capacitor target.

## Colors (Tailwind tokens)
| Token | Hex | Usage |
|-------|-----|-------|
| `tsure-bg` | #4b4039 | Page background |
| `tsure-surface` | #ede3d2 | Cards, modals |
| `tsure-surface-hover` | #f5ebe0 | Hover states |
| `tsure-primary` | #5a3e28 | Primary text, headers |
| `tsure-accent` | #ffa726 | CTA, live indicators |
| `tsure-on-primary` | #ede3d2 | Text on dark/bg |
| `tsure-border` | #c4b5a0 | Borders |
| `tsure-live` | #ff7043 | Active study pulse |

## Typography
- Logo: `font-script` (Dancing Script)
- Body: Noto Sans JP
- Numbers: `tabular-nums`

## Spacing
- Page padding: `px-4 py-4`
- Card padding: `p-4`
- Section gap: `gap-4` / `space-y-4`

## Elevation (3D shadows, no hover lift)
| Token | Usage |
|-------|-------|
| `shadow-tsure-raised` | Card, NavCard, Modal |
| `shadow-tsure-button` | Button (primary/secondary/accent/danger) |
| `shadow-tsure-chip` | Presence strip chips |

## Touch targets
Minimum 44×44px for all interactive elements.

## Anti-patterns
- No `#xxxxxx` inline colors — use tokens only
- No `.btn` legacy class
- No marquee animations — **exception**: `StudyPresenceGrid` slow horizontal scroll (24px/s, `prefers-reduced-motion` fallback only)
- No direct Firestore calls from pages — use `src/services/firestore/`

## Presence strip (一緒に勉強中)
- Subtle chips matching Card tokens: `bg-tsure-surface`, `border-tsure-border`, `text-tsure-primary` / `text-tsure-muted`, no subject colors, no live Badge
- Auto-scroll via `.animate-presence-scroll` when **3+ users**; duration computed from track width at **24px/s** so speed stays constant regardless of count
- Screen reader: `sr-only` count text inside component

## Responsive layout

| Breakpoint | Shell | Main content width |
|------------|-------|-------------------|
| &lt; `md` (768px) | `AppHeader` + hamburger dropdown | `max-w-2xl` centered |
| ≥ `md` | `AppSidebar` (240px, fixed) + no header | `main` は残り幅いっぱい（`md:max-w-none`）。設定のみ `md:max-w-xl` 中央 |

Shell height on desktop: `md:min-h-dvh` on `PageLayout` (content may extend; page scrolls). Do not force `h-dvh` + inner flex splits that compress sections when height is insufficient.

- Nav config: `src/utils/navConfig.js` (shared by `AppHeader` and `AppSidebar`)
- `PageLayout` `contentWidth`: `default` | `wide` (admin) | `narrow` (settings forms)
- Mobile-only shortcuts: Home `NavCard` grid (`md:hidden`)
- Page-level grids: Home 2-col (`md:`), StudyRecord charts (`lg:`), StudyTimer (`md:`), Mate invite (`lg:`)

## Components (UI Kit)
All pages MUST use: `PageLayout`, `AppHeader`, `AppSidebar` (via PageLayout), `Card`, `Button`, etc.

### Mate list
- `MateList` / `MateListItem` — 連れ勉ユーザー一覧（カード型・responsive grid）
- `FilterSelect` — フィルタ用カスタムプルダウン（Headless UI Listbox、ネイティブ select はフィルタに使わない）

### Button variants
- `primary` — `bg-tsure-primary` on cards / page
- `secondary` — `bg-tsure-primary/15` + `border-tsure-primary/35`（ログアウトの `bg-white/15` と同系。surface カード用）
- ログアウト（sidebar/header）— `bg-white/15` + `border-white/35`（`tsure-bg` 上専用）
- `ghost` — transparent, for dark `tsure-bg` areas only
