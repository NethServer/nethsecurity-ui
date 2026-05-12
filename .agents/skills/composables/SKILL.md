---
name: composables
description: Create or refactor Vue 3 composables (use* functions) in src/composables/. Use when building shared reactive logic, migrating legacy manual-fetch composables to TanStack Query, deciding between a composable and a Pinia store, or structuring type exports. Covers the modern useQuery pattern and how to recognise the old pattern that must not be replicated.
metadata:
  project: nethsecurity-ui
---

# Composables

Composables live in `src/composables/` and expose reusable reactive logic as `use*` functions. New composables that fetch server data must use TanStack Query.

## Modern Pattern — `useQuery`

```ts
// src/composables/useFirewallRules.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/vue-query'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import { MessageBag } from '@/lib/validation.ts'

export type Rule = {
  id: string
  name: string
  enabled: boolean
}

type ListRulesResponse = { data: { values: Rule[] } }

export function useFirewallRules() {
  const queryClient = useQueryClient()

  const { data: rules, isPending, isError, error } = useQuery({
    queryKey: ['firewall', 'rules'],
    queryFn: () => ubusCall<ListRulesResponse>('ns.firewall', 'list-rules'),
    select: (res) => res.data.values,
  })

  const validationBag = ref(new MessageBag())

  const { mutate: deleteRule, isPending: isDeleting } = useMutation({
    mutationFn: (id: string) => ubusCall('ns.firewall', 'delete-rule', { id }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] }),
    onError: (e: Error) => {
      if (e instanceof ValidationError) {
        validationBag.value = e.errorBag
      }
    },
  })

  return { rules, isPending, isError, error, deleteRule, isDeleting, validationBag }
}
```

## Legacy Pattern — Recognise, Do Not Replicate

Several existing composables still use manual refs. When you touch them, migrate:

```ts
// ❌ Legacy — do not write new composables like this
export function useHostSets() {
  const hostSets = ref<HostSet[]>([])
  const loadingListHostSets = ref(false)
  const errorListHostSets = ref('')

  async function listHostSets() {
    loadingListHostSets.value = true
    try {
      const res = await ubusCall('ns.objects', 'list-hosts')
      hostSets.value = res.data.values as HostSet[]
    } catch (err: unknown) {
      errorListHostSets.value = t(getAxiosErrorMessage(err))
    } finally {
      loadingListHostSets.value = false
    }
  }
  return { hostSets, loadingListHostSets, errorListHostSets, listHostSets }
}
```

Migration: replace with `useQuery`, remove the manual refs, remove the trigger function.

## Exporting Types

Always export domain types from the composable file:

```ts
// ✅ exported so components can import without reaching into internal files
export type Rule = { id: string; name: string }
```

Import with `import type`:

```ts
import type { Rule } from '@/composables/useFirewallRules.ts'
```

## Computed Derived State

Use `computed` for all filtered/derived values — never recompute inside the return object:

```ts
const filteredRules = computed(() =>
  rules.value?.filter((r) => r.name.toLowerCase().includes(search.value)) ?? []
)
```

## Composable vs. Pinia Store

| Use composable | Use Pinia store |
|---|---|
| Logic is local to a component subtree | State needs to survive route navigation |
| Data is re-fetched per mount | Data shared globally across unrelated parts |
| Component-scoped feature state | App-wide singletons: login, notifications, UCI changes |

For global shared server data, embed `useQuery` directly in the Setup Store (see `src/stores/standalone/netifyd.ts`).

## Gotchas

- **`useQuery`/`useMutation` must be called at setup time** — not inside `if` blocks, loops, or after `await`. Same Vue Composition API rule applies. If you need conditional fetching, use the `enabled` option: `useQuery({ ..., enabled: computed(() => !!id.value) })`.
- **`ref` is not auto-imported in composable files** — unlike `<script setup>` where auto-imports work, `.ts` composable files need explicit imports: `import { ref, computed } from 'vue'`.
- **Composable mutations don't need `validationBag` in the component** — put it inside the composable so it persists across re-renders and is co-located with the mutation logic.
- **Returning `useQuery` result directly exposes reactive internals** — if a composable wraps a query, return the named properties (`data`, `isPending`, `isError`) rather than the entire query object so the public API is stable.

