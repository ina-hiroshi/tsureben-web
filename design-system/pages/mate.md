# Mate Page — Mobile Layout
Sticky search + mate list cards

## Implemented (連れ勉 `/turebenmate`)
- lg: 上段2列 — 仲間を招待 + QR読み取り
- 下段全幅 — 連れ勉仲間（`MateMutualFilters` 初期折りたたみ）/ 承認待ち / 申請中
- 一覧 UI: `MateList` + `MateListItem`（カード型グリッド md:3列）
- 隠した一覧も同様 grid
- 各セクション見出しに `SectionHelpButton`（?）→ `MATE_SECTION_HELP` 解説 Modal
- DEV: `src/dev/demoMate.js`（連れ勉仲間10件・承認待ち/申請中各3件）
