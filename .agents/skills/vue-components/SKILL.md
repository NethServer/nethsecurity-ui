---
name: vue-components
description: Write, edit, or review Vue 3 components and views in this project. Use for creating new components, fixing template issues, applying Ne* component library, handling props/emits, i18n strings, loading/error state, and icon usage. Covers script setup patterns, typed props, Ne component substitutions, and anti-patterns to avoid.
metadata:
  project: nethsecurity-ui
  storybook: https://nethesis.github.io/vue-components
  source: https://github.com/nethesis/vue-components
---

# Vue 3 Components

Always use `<script setup lang="ts">`. Never use Options API, `defineComponent()`, or `<script>` without `setup`.

## Component Skeleton

```vue
<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeButton, NeInlineNotification } from '@nethesis/vue-components'

const { t } = useI18n()

// Props: always type-based, never runtime validators
const { isShown, item = undefined } = defineProps<{
  isShown: boolean
  item?: MyType
}>()

// Emits: typed payload tuple
const emit = defineEmits<{
  close: []
  success: [result: MyType]
}>()
</script>
```

## Ne\* Component Library

**Always use `Ne*` components** over raw HTML. Load [references/ne-components.md](references/ne-components.md) when you need the full export list, available props, or to check if a specific component exists.

Quick substitution map:

| Raw HTML                  | Ne\* replacement                                                   |
| ------------------------- | ------------------------------------------------------------------ |
| `<button>`                | `NeButton`                                                         |
| `<input type="text">`     | `NeTextInput`                                                      |
| `<textarea>`              | `NeTextArea`                                                       |
| `<input type="checkbox">` | `NeCheckbox`                                                       |
| `<input type="file">`     | `NeFileInput`                                                      |
| `<select>`                | `NeCombobox` or `NeListbox`                                        |
| `<table>`                 | `NeTable` + `NeTableHead/Body/Row/Cell`                            |
| Alert/banner              | `NeInlineNotification`                                             |
| Modal dialog              | `NeModal`                                                          |
| Slide-in panel            | `NeSideDrawer`                                                     |
| Loading spinner           | `NeSpinner`                                                        |
| Skeleton loader           | `NeSkeleton`                                                       |
| Badge                     | `NeBadgeV2` (not the deprecated `NeBadge`)                         |
| Toast                     | `NeToastNotificationV2` (not the deprecated `NeToastNotification`) |

Import alongside utilities:

```ts
import {
  NeButton,
  NeInlineNotification,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
```

## Error Display

```vue
<NeInlineNotification
  v-if="isError"
  kind="error"
  :title="t('error.generic_error')"
  :description="t(getAxiosErrorMessage(error))"
/>
```

## Loading State

With TanStack Query, derive state from `isPending`/`isError` — do not add a separate `loading` ref for server data. A local `loading` ref is fine for non-query actions (e.g., delete confirmation).

## i18n

```ts
const { t } = useI18n()  // always at top of script setup
```

- Never hardcode user-visible strings; always `t('key')`
- Key convention: `section.subsection.label` — e.g. `standalone.firewall.add_rule`

## Icons

```ts
import { faShieldHalved } from '@fortawesome/free-solid-svg-icons'
```

```vue
<FontAwesomeIcon :icon="faShieldHalved" />
```

Use `@nethesis/nethesis-solid-svg-icons` or `@nethesis/nethesis-light-svg-icons` for custom Nethesis icons.

## Reset Form on Drawer/Modal Open

```ts
watch(
  () => props.isShown,
  (isShown) => {
    if (isShown) resetForm()
  }
)
```

## Gotchas

- **Deprecated components** — `NeBadge` and `NeToastNotification` are still in the package but deprecated. The agent will reach for them first. Use `NeBadgeV2` and `NeToastNotificationV2` instead. Same for the `NeNotification` type → `NeNotificationV2`.
- **Props destructuring requires Vue 3.5+** — This project uses it. Some older files use `const props = defineProps<...>()` without destructuring; don't replicate that pattern.
- **`const props = defineProps()`** — The old form is visible in legacy files; new code always uses destructuring with defaults: `const { foo = 'bar' } = defineProps<{ foo?: string }>()`.
- **`v-if` on error, not `v-show`** — `NeInlineNotification` should use `v-if` so it unmounts cleanly when the error is cleared; `v-show` will leave it in the DOM with stale content.
