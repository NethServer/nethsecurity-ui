---
name: data-fetching
description: Write new API calls, server-state queries, or mutations in this project. Use when adding useQuery, useMutation, ubusCall, or migrating manual loading/error refs to TanStack Query. Covers query keys, typed responses, invalidation, pagination with keepPreviousData, and the legacy patterns to recognise and replace.
metadata:
  project: nethsecurity-ui
---

# Data Fetching — TanStack Query

**All new server-state data fetching must use `@tanstack/vue-query`.** Do not add new `loading`/`error` refs for data that comes from the server.

## Reading Data — `useQuery`

```ts
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'

type ListRulesResponse = { data: { values: Rule[] } }

const { data: rules, isPending, isError, error } = useQuery({
  queryKey: ['firewall', 'rules'],
  queryFn: () => ubusCall<ListRulesResponse>('ns.firewall', 'list-rules'),
  select: (res) => res.data.values,
})
```

- **Always** pass a generic type to `ubusCall<T>`
- Use `select` to unwrap nested response shapes — keeps template refs clean
- Destructure only what the component needs

## Writing Data — `useMutation`

```ts
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import { MessageBag } from '@/lib/validation.ts'

const queryClient = useQueryClient()
const validationBag = ref(new MessageBag())

const { mutate, isPending, error } = useMutation({
  mutationFn: (payload: CreateRulePayload) =>
    ubusCall('ns.firewall', 'add-rule', payload),
  onMutate: () => validationBag.value.clear(),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] })
    emit('close')
  },
  onError: (e: Error) => {
    if (e instanceof ValidationError) {
      validationBag.value = e.errorBag
    }
  },
})
```

- Use `isPending` from `useMutation` for button loading state — no extra ref
- Always handle `ValidationError` in `onError` to show field-level errors
- Call `invalidateQueries` in `onSuccess` to refresh related queries

## `ubusCall` — API Wrapper

Source: `@/lib/standalone/ubus.ts`

```ts
// Always provide the generic type — never let it default to any
const result = await ubusCall<MyResponseType>('ns.module', 'method-name', payload)

// From controller context:
const result = await ubusCallFromController('ns.module', 'method', payload, unitId)
```

Throws `ValidationError` (with `.errorBag: MessageBag`) for 422-style validation failures; re-throws Axios errors for everything else.

## Query Key Convention

Use hierarchical arrays for scoped invalidation:

```ts
['feature', 'list']              // e.g. ['firewall', 'rules']
['feature', 'detail', id]        // e.g. ['firewall', 'rule', ruleId]
['feature', 'list', filterState] // include reactive filters in the key
```

Invalidate a whole feature: `queryClient.invalidateQueries({ queryKey: ['firewall'] })`

## Reactive Query Keys (Filters / Pagination)

Pass reactive values directly into the `queryKey` array — TanStack Query re-fetches automatically when they change:

```ts
const { data } = useQuery({
  queryKey: ['rules', currentPage, searchText],
  queryFn: () =>
    ubusCall<Response>('ns.module', 'list', {
      page: currentPage.value,
      search: searchText.value,
    }),
  placeholderData: keepPreviousData, // avoid layout jumps between pages
})
```

## TanStack Query Inside Pinia Stores

For globally shared server state, embed `useQuery` in a Setup Store:

```ts
// src/stores/standalone/myStore.ts
export const useMyStore = defineStore('my-store', () => {
  const items = useQuery({
    queryKey: ['my-store', 'items'],
    queryFn: () => ubusCall<Response<Item[]>>('ns.module', 'list-items'),
    select: (res) => res.data.values,
  })
  return { items }
})
```

See `src/stores/standalone/netifyd.ts` for a real example.

## UCI-Changing Mutations

Some operations write to UCI config (firewall rules, network settings, etc.). After these succeed, also refresh the pending changes badge:

```ts
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges.ts'

const uci = useUciPendingChangesStore()

onSuccess: async () => {
  await Promise.all([
    uci.getChanges(),
    queryClient.invalidateQueries({ queryKey: ['firewall', 'rules'] }),
  ])
  emit('close')
},
```

See `src/components/standalone/monitoring/flows/FlowConfigureDrawer.vue` for a real example.

## Legacy Pattern — Recognise, Do Not Replicate

Several composables (`useNetworkDevices`, `useHostSets`, `useDomainSets`, etc.) still use this:

```ts
// ❌ Do not write new code like this
const items = ref<Item[]>([])
const loadingListItems = ref(false)
const errorListItems = ref('')

async function listItems() {
  loadingListItems.value = true
  try {
    const res = await ubusCall('ns.module', 'list-items')
    items.value = res.data.values
  } catch (err: unknown) {
    errorListItems.value = t(getAxiosErrorMessage(err))
  } finally {
    loadingListItems.value = false
  }
}
```

When touching such files, migrate to `useQuery` and remove the manual refs.

## Gotchas

- **`error` from `useQuery`/`useMutation` is `Error | null`**, not `unknown`. Pass it directly to `getAxiosErrorMessage(error)` — no cast needed.
- **`ubusCall` generic types the full Axios response data**, not just the payload. If the backend returns `{ data: { values: [] } }`, your type is `{ data: { values: Item[] } }`, not `Item[]`.
- **Query keys must exactly match for invalidation**. `['firewall']` invalidates `['firewall', 'rules']`, but `['firewall-rules']` does not. Keep keys hierarchical and consistent.
- **`useQuery` cannot be called conditionally**. Like all Vue composables, it must be called at the top level of `<script setup>` or a setup function — not inside `if` blocks or after `await`.
- **`select` runs on every render if the reference isn’t stable**. If `select` creates a new array/object on each call, wrap it in a stable function reference or rely on TanStack Query’s built-in memoization by returning the same reference when data is unchanged.
