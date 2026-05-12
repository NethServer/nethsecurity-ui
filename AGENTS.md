# NethSecurity UI — Agent Instructions

NethSecurity UI is a Vue 3 + TypeScript single-page app for the NethSecurity firewall. It runs in two modes
controlled by `VITE_UI_MODE`: **standalone** (direct device management) and **controller** (managing multiple units from a central host).

## Build & Dev

```bash
npm install
npm run dev          # Vite dev server on :5173
npm run build        # Type-check + bundle
npm run test         # Vitest unit tests
npm run lint-fix     # ESLint auto-fix
npm run format-fix   # Prettier auto-format
```

Requires `.env.development` copied from `.env.development.sample`. See [CONTRIBUTING.md](CONTRIBUTING.md) for full dev setup.

## Architecture

| Layer       | Location                                                  | Description                             |
| ----------- | --------------------------------------------------------- | --------------------------------------- |
| Views       | `src/views/standalone/` `src/views/controller/`           | Page-level components, one per route    |
| Components  | `src/components/standalone/` `src/components/controller/` | Reusable UI pieces                      |
| Composables | `src/composables/`                                        | Shared reactive logic and types         |
| Stores      | `src/stores/standalone/` `src/stores/controller/`         | Pinia global state                      |
| Lib         | `src/lib/`                                                | Pure utilities, API helpers, validation |
| Router      | `src/router/index.ts`                                     | Vue Router, lazy-loaded routes          |
| i18n        | `src/i18n/`                                               | Translation files (en, it, fr, nl, ta)  |

## Key Libraries

- **UI components**: `@nethesis/vue-components` (`Ne*` prefix) — always prefer these over raw HTML
- **Data fetching**: `@tanstack/vue-query` — **required for all new server-state queries and mutations**
- **State management**: `pinia` Setup Store pattern
- **API calls**: `ubusCall()` / `ubusCallFromController()` from `@/lib/standalone/ubus.ts`
- **Validation**: `valibot` schemas + `MessageBag` from `@/lib/validation.ts`
- **i18n**: `vue-i18n` (`const { t } = useI18n()`)
- **Utilities**: `lodash-es` (tree-shaken), `@vueuse/core`, `@vueuse/router`

## Conventions

> This codebase was developed in phases — some older files use legacy patterns (manual loading/error refs, raw axios). **New code must follow the patterns described below and in the linked instructions.**

- Always use `<script setup lang="ts">` — never Options API
- Always use TanStack Query for new data fetching, not manual `ref(false)` loading flags
- Avoid `any` — type all API response shapes explicitly
- All user-visible strings go through `t('key')` — never hardcode text
- Use `NeInlineNotification` to surface errors in the UI

## Skills

| Skill                                                        | Trigger                                                                        |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| [vue-components](.github/skills/vue-components/SKILL.md)     | Writing or reviewing Vue components/views; Ne\* component library usage        |
| [data-fetching](.github/skills/data-fetching/SKILL.md)       | Adding `useQuery`, `useMutation`, `ubusCall`, or migrating manual loading refs |
| [typescript](.github/skills/typescript/SKILL.md)             | Typing API responses, avoiding `any`, ESLint-clean TypeScript                  |
| [composables](.github/skills/composables/SKILL.md)           | Creating or refactoring `use*` composables in `src/composables/`               |
| [forms-validation](.github/skills/forms-validation/SKILL.md) | Building forms with `valibot`, `MessageBag`, `ValidationError`                 |
| [testing](.github/skills/testing/SKILL.md)                   | Writing Vitest tests (TDD, edge cases, mocking `ubusCall`)                     |

Ne\* component reference: [.github/skills/vue-components/references/ne-components.md](.github/skills/vue-components/references/ne-components.md)
