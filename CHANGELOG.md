# Changelog

## [1.1.0](https://github.com/kantmichel/giraf/compare/v1.0.0...v1.1.0) (2026-04-13)


### Features

* **agents:** Control Room dashboard for Claude + GH Actions agents ([6ee99c0](https://github.com/kantmichel/giraf/commit/6ee99c00743b3d10fe00034cfc9c63f746888b46))
* **agents:** persistent SQLite cache for historical closed issues ([95a8e9f](https://github.com/kantmichel/giraf/commit/95a8e9f25526dadcffee80bcdf4b9fdae1c85d63))
* AI filter, PR toggle, and default filter presets ([52de361](https://github.com/kantmichel/giraf/commit/52de361a7d74c9074f7c8ea678462e33a630e436))
* auto-sync status with Claude AI workflow and show AI in issue detail ([b870e29](https://github.com/kantmichel/giraf/commit/b870e29530eac9d42c74a7a0254d963224a67194))
* changelog page with version badges and full history ([0cac479](https://github.com/kantmichel/giraf/commit/0cac479c006ad4dcea94d46858e3b51195a279ea))
* Claude AI workflow column with review → work pipeline ([dc0eea6](https://github.com/kantmichel/giraf/commit/dc0eea6d9274848abea9987738358be413de53a2))
* click issue number to copy GitHub link to clipboard ([22efc4c](https://github.com/kantmichel/giraf/commit/22efc4cb3a6b35e532f2e6086887ff457e0af9d8))
* closed issue notifications with watch/follow system ([33ebba3](https://github.com/kantmichel/giraf/commit/33ebba3f8a486c02b4a5f7514a993439d533ba62))
* closed issues browser with week navigation + auto status sync on close ([3ac536b](https://github.com/kantmichel/giraf/commit/3ac536b59c817b2720580772e891661e4a240d60))
* **command:** open/closed/all toggle for issue search ([5a96082](https://github.com/kantmichel/giraf/commit/5a9608223699365afb6a51b833a4aaa97aeb9a91))
* copy metadata button in issue detail header ([a4da100](https://github.com/kantmichel/giraf/commit/a4da100573220cd5c561a1c497eacab008a3312c))
* effort labels (low/medium/high) — full end-to-end support ([0e79587](https://github.com/kantmichel/giraf/commit/0e795875f55512902d9f7a1cb01e66611ab334ff))
* extract and display linked PRs on issues ([3e952f3](https://github.com/kantmichel/giraf/commit/3e952f3be0b02525f82340a1308f1f57548bc6ef))
* **filters:** "not set" option for enum filters ([97d443e](https://github.com/kantmichel/giraf/commit/97d443e431ddc026d6da09b3f7b363e3fa5bb06e))
* **impact:** boost WSJF with impact labels and settings management ([7496127](https://github.com/kantmichel/giraf/commit/7496127d75b3c4052fdb241df162c9bb708ec2ab))
* inline editing + multi-select bulk actions on issues table ([4c72d2b](https://github.com/kantmichel/giraf/commit/4c72d2b37da9f4ec0af29705df382a26da3ade62))
* kanban column sorting with per-column controls and saved preferences ([02d24ed](https://github.com/kantmichel/giraf/commit/02d24edc4ba005d3e36dcb8b4812b6aae968c95f))
* labels column back in table with inline editor ([77f0c0b](https://github.com/kantmichel/giraf/commit/77f0c0b60e14bac284c4e72796b0fd24bf2628b4))
* metrics dashboard with 17 metric cards and collapsible mini row on issues page ([718e8d3](https://github.com/kantmichel/giraf/commit/718e8d359876218a1ce7d6183703f8eddcb085ff))
* **repos:** sync Gira labels to tracked repos ([78781a1](https://github.com/kantmichel/giraf/commit/78781a14ce0a1756cfabdbadde550632e75e37db))
* **table:** customizable column visibility with saved views ([d92d506](https://github.com/kantmichel/giraf/commit/d92d506acc459b830a708ce807227666499cdd06))
* unified issues page with list view and default view preference ([7ebc4ef](https://github.com/kantmichel/giraf/commit/7ebc4efd185fc902ca5498c633b93bc260230e11))
* version filter with GitHub release tracking, grouped multi-select ([5eb3d7f](https://github.com/kantmichel/giraf/commit/5eb3d7fd34d755bf9fb43c3eed055255a087eb44))
* **wsjf:** WSJF priority scoring column for table and kanban ([1de76dd](https://github.com/kantmichel/giraf/commit/1de76dd42f27ba512d71396ec00ea5abf46dc555))


### Bug Fixes

* AI column wider + no text wrap ([92e03cd](https://github.com/kantmichel/giraf/commit/92e03cd1af03187a19a52547175c27176e27bad0))
* command palette issue search — pass issues from AppShell, improve number matching ([b7ab25b](https://github.com/kantmichel/giraf/commit/b7ab25b89e7747c8f6b27e089d3da0a7f984e301))
* dynamic version from package.json, footer links with UTM ([add329d](https://github.com/kantmichel/giraf/commit/add329dd26d27f081bdd433fef7f5edb12857aa0))
* exact substring search in command palette, show all issues ([76363f5](https://github.com/kantmichel/giraf/commit/76363f5e90d32018cc00cd9208444b809d30756a))
* gitignore db-shm files, remove tracked one ([0bfaf5e](https://github.com/kantmichel/giraf/commit/0bfaf5e670d434377fcd05f1379c1ef604a3511a))
* hide effort labels from Labels column in table ([60ac7a9](https://github.com/kantmichel/giraf/commit/60ac7a98a9bbd745e7c37437e02b81acdf6c277d))
* **kanban:** correct priority sort direction semantics ([ce00565](https://github.com/kantmichel/giraf/commit/ce00565d802b652802f176844d49390c4a795425))
* repo filter uses short names (aliases) ([aebadd7](https://github.com/kantmichel/giraf/commit/aebadd7bd7bae8aedbf5282d665234e52fc39e37))
* show issue title and make triage items clickable in priority review ([28d1386](https://github.com/kantmichel/giraf/commit/28d1386ba88228d6b2102b87377ae2aff1458e77))
* sort closed issues by closed date, open issues by created date ([d9971ee](https://github.com/kantmichel/giraf/commit/d9971eebb56a0a57ecf4b4daecd1d9918476aed4))
* **ssr:** resolve hydration mismatches on localStorage state ([4bcd0f8](https://github.com/kantmichel/giraf/commit/4bcd0f8698f6458ed1c2d5c0ece53ecdad131192))
* wrap notification detection in try/catch to prevent 500 errors ([b0a866f](https://github.com/kantmichel/giraf/commit/b0a866fd604f0797278c410b0c5a3eac01addbd8))

## 1.1.0 (2026-04-01)


### Features

* unified issues page — My Issues and All Issues merged into a single view with automatic assignee filtering
* list view added as third view option alongside table and kanban, with drag-and-drop between status sections
* preferred default view setting — choose list, table, or kanban as your default in Settings
* assignee avatars shown in list view rows


### Bug Fixes

* recently completed issues now sort by closed date instead of last updated date
* triage auto-promoted issues show title and are clickable to open in detail sheet
* triage stale issues are now clickable to open in detail sheet


## 1.0.0 (2026-03-28)


### Features

* 'Remove priority' option in priority editor (back to backlog) ([712c8e4](https://github.com/kantmichel/giraf/commit/712c8e466302a11b18211ae5a5db2b4524ac3144))
* bulk priority/assignee in triage, accept without forcing status ([394ebb9](https://github.com/kantmichel/giraf/commit/394ebb9c6a738c56a7fe12c8ee77d662c8248444))
* clickable issues + inline priority editor in over-budget review ([bd91a73](https://github.com/kantmichel/giraf/commit/bd91a737c8a670e3eee032aa4f813160534d82b3))
* drag-and-drop between My Issues sections ([0b553f3](https://github.com/kantmichel/giraf/commit/0b553f30685823843fc66ef5a5fd306027525e7c))
* kanban board view with drag-and-drop status changes ([82727bd](https://github.com/kantmichel/giraf/commit/82727bdab7b71246398601b03a5bbd93c96b0914))
* priority escalation system with auto-promotion and weekly review ([55a74e1](https://github.com/kantmichel/giraf/commit/55a74e1433002e2c63916d507c1643bfe32f5606))
* rename Gira to Giraf with new banner and favicon ([6cb1203](https://github.com/kantmichel/giraf/commit/6cb1203f4366d55c47abc9287e0e686f1804b75e))
* repo filter on triage page ([9a00bcf](https://github.com/kantmichel/giraf/commit/9a00bcf4f2c3be9c831af6e7682131e918a9562c))
* Stage 1 — project scaffolding, SQLite, and GitHub OAuth ([adb131c](https://github.com/kantmichel/giraf/commit/adb131c188ca648cac8e8ff904cb1984c4c7b9c2)), closes [#1](https://github.com/kantmichel/giraf/issues/1)
* Stage 2 — app shell with sidebar, topbar, footer, and route groups ([6128f3e](https://github.com/kantmichel/giraf/commit/6128f3ec04d7cbc31f82f588ecd0d32491c9ebb4)), closes [#2](https://github.com/kantmichel/giraf/issues/2)
* Stage 3 — GitHub client, repo management, and rate limit ([b2922c6](https://github.com/kantmichel/giraf/commit/b2922c6a7efea4ebf9a11ad9879f8c936cb2b9e0)), closes [#3](https://github.com/kantmichel/giraf/issues/3)
* Stage 4 — issues table view with filters and sorting ([1c7516a](https://github.com/kantmichel/giraf/commit/1c7516ac7880c62c8fdd5a7cf9771b997b701194)), closes [#4](https://github.com/kantmichel/giraf/issues/4)
* Stage 5 — issue detail sidebar with markdown and inline editing ([57c133c](https://github.com/kantmichel/giraf/commit/57c133c3d23cf65995c722058fe5014e45a98b2d)), closes [#5](https://github.com/kantmichel/giraf/issues/5)
* Stage 6 — triage inbox, my issues dashboard, help page, repo aliases ([903887b](https://github.com/kantmichel/giraf/commit/903887b8ad6857cf2662ee2de5313f9a62565f40)), closes [#6](https://github.com/kantmichel/giraf/issues/6) [#9](https://github.com/kantmichel/giraf/issues/9)
* Stage 7 — command palette, keyboard shortcuts, and UX polish ([6c17886](https://github.com/kantmichel/giraf/commit/6c1788668b4a7028a8ed9a885dc11eb0756754ed)), closes [#7](https://github.com/kantmichel/giraf/issues/7)
* Stage 8 — polish, refresh, error handling, triage UX improvements ([7c7f3f3](https://github.com/kantmichel/giraf/commit/7c7f3f306b192ba3f50a90e17b528b2857247efb)), closes [#8](https://github.com/kantmichel/giraf/issues/8)
* triage table view with multi-select and bulk actions ([363ca82](https://github.com/kantmichel/giraf/commit/363ca8211aa90c0308099e457626184f2d2decc4))
* yellow dot on Triage nav when priority review needs attention ([a5b6d29](https://github.com/kantmichel/giraf/commit/a5b6d29334d34119918867056da9e4d1519ab190))


### Bug Fixes

* align over-budget issue rows with grid layout ([ffc2907](https://github.com/kantmichel/giraf/commit/ffc29070003686b8efb0fa180e4e0a6ff865115d))
* align remove priority option with other items ([908b708](https://github.com/kantmichel/giraf/commit/908b708771f8be146274b8dbce5d4a925637bd56))
* align remove priority text with badge labels ([b2623d9](https://github.com/kantmichel/giraf/commit/b2623d9f8faa90e3f69785338942f8a00e277c9e))
* equal spacing around priority separator line ([57d215e](https://github.com/kantmichel/giraf/commit/57d215e582a05e59ee9634ca58638dd619d6024b))
* force Node.js 24 for release-please action ([55571b3](https://github.com/kantmichel/giraf/commit/55571b378cf4327ec97c658d365ae447c80fba26))
* make over-budget priority rows collapsible ([2fe06b4](https://github.com/kantmichel/giraf/commit/2fe06b443b03a58a84fcba3fe16d8b808f108b3d))
* move priority review to top of triage, make collapsible ([2ae5700](https://github.com/kantmichel/giraf/commit/2ae5700d9deea8fa91030eba687743f66d3b970e))
* optimistic updates for triage cache in useUpdateIssue ([a841df9](https://github.com/kantmichel/giraf/commit/a841df95a414597be4eaea1055cfae33f228947e))
* race condition when setting status and priority in quick succession ([86ec957](https://github.com/kantmichel/giraf/commit/86ec957a0221375062a1869cae0433c7514c9550))
* remove priority button works in inline popover (use onMouseDown) ([06ee25d](https://github.com/kantmichel/giraf/commit/06ee25dd2473ea4b45ca80dfddb984ba2b98cb03))
* show actual issues in over-budget section, wider repo filter with aliases ([8dfa0d1](https://github.com/kantmichel/giraf/commit/8dfa0d1b6f20bf216a88151baa008b3f405b41c7))
* sidebar metadata uses local state for instant visual feedback ([75be25f](https://github.com/kantmichel/giraf/commit/75be25f332dca40418a7044f8371de6086fc44de))
* sync command palette sidebar with issues cache for live updates ([72b537b](https://github.com/kantmichel/giraf/commit/72b537b054feb74cd8bfec5c12fb4d06d9fd7407))
* use proper table layout for over-budget issue list ([e882d82](https://github.com/kantmichel/giraf/commit/e882d823b85f6ef2de1256844609e6d4fa365319))
* yellow review dot visible next to triage count badge ([27943bf](https://github.com/kantmichel/giraf/commit/27943bf7cc4a661f3ddde5c9c82ec0e30666979b))


### Performance Improvements

* comprehensive optimistic updates across all mutations ([e374840](https://github.com/kantmichel/giraf/commit/e374840e9d6e593d528e792fb0378c42921928ca))
* optimistic updates for drag-and-drop and issue mutations ([39dfa34](https://github.com/kantmichel/giraf/commit/39dfa34d4c104971db739eaaf33a8d6ac43d6b20))
