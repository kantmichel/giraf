# Changelog

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
