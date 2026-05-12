---
name: typescript
description: Write TypeScript in this project correctly. Use when defining types for API responses, avoiding any, typing props/emits/refs, using generics with ubusCall, or fixing ESLint TypeScript warnings. Covers clean ESLint-compliant patterns without suppression comments.
metadata:
  project: nethsecurity-ui
  eslint-config: eslint.config.js
---

# TypeScript — Clean, ESLint-Compliant Code

The ESLint config (`eslint.config.js`) enforces `@typescript-eslint/recommended` and warns on `no-explicit-any`. Write code that satisfies the linter because it is well-typed, not because it suppresses warnings.

## The `any` Problem

`ubusCall` has a legacy `any`-heavy signature for backward compatibility. That is known debt. **Do not follow it** in new code — always pass a generic type:

```ts
// ❌ Leaves result typed as any
const res = await ubusCall('ns.users', 'list-users')

// ✅ Explicit generic keeps the whole chain typed
type ListUsersResponse = { data: { values: User[] } }
const res = await ubusCall<ListUsersResponse>('ns.users', 'list-users')
const users = res.data.values  // User[]
```

For `catch` blocks, use `unknown` and narrow:

```ts
} catch (err: unknown) {
  if (err instanceof ValidationError) {
    validationBag.value = err.errorBag
  } else if (err instanceof Error) {
    console.error(err.message)
  }
}
```

Never add `// eslint-disable-next-line @typescript-eslint/no-explicit-any` — fix the type instead.

## Define Response Types Explicitly

Always define the shape before using the response:

```ts
type User = {
  id: string
  username: string
  role: 'admin' | 'user'
}

type ListUsersResponse = {
  data: {
    values: User[]
  }
}
```

Use the generic wrapper pattern when many endpoints share the same envelope:

```ts
type ApiResponse<T> = { data: { values: T } }

const { data } = useQuery({
  queryKey: ['users'],
  queryFn: () => ubusCall<ApiResponse<User[]>>('ns.users', 'list'),
  select: (res) => res.data.values,
})
```

## Typing Refs and Reactive State

Always annotate when the initial value does not infer the full type:

```ts
const items = ref<Item[]>([])          // not ref([]) — that gives never[]
const selected = ref<Item>()           // Item | undefined
const error = ref<string | undefined>()
```

## Typing Props and Emits

Always use the type-based macro syntax:

```ts
// ✅ Correct
const { name, count = 0 } = defineProps<{
  name: string
  count?: number
}>()

const emit = defineEmits<{
  close: []
  save: [item: Item]
}>()
```

Never use the runtime form `defineProps({ name: String })`.

## Union Types

Prefer union types over TypeScript `enum` — enums compile to runtime code and don't tree-shake:

```ts
type RuleAction = 'accept' | 'drop' | 'reject'
```

## ESLint Rules in Effect

From `eslint.config.js`:

- `@typescript-eslint/no-explicit-any`: **warn** — fix it, don't silence it
- `eslint-plugin-vue` flat/recommended — enforces Vue SFC ordering and patterns
- `@vitest/eslint-plugin` — catches test anti-patterns in `src/**/__tests__/*`
- `skipFormatting` — Prettier handles formatting; ESLint does not check it

## Gotchas

- **Never add `eslint-disable` suppression comments** for `no-explicit-any`. The legacy `ubusCall` signature has `any` parameters for backward compatibility — that is a known exception in `ubus.ts`, not a pattern to follow. In all new code, pass a concrete generic type.
- **`ubusCall` payload parameter accepts `any`** — you don't need to type the payload argument explicitly when calling it; just type the return generic: `ubusCall<ResponseType>('path', 'method', payload)`.
- **`useQuery` `error` is `Error | null`**, not `unknown`. Don't add unnecessary type guards — `getAxiosErrorMessage(error)` from `@nethesis/vue-components` handles `null` already.
- **`import type` for type-only imports** — always use `import type { Foo }` for interfaces/types to keep the compiler output clean. ESLint may enforce this if `consistent-type-imports` is added later.
- **`issue.path?.[0]?.key` in valibot** can be a `number` for array field paths, not just `string`. Cast carefully: only use it as a `MessageBag` key when the form fields are plain object keys.
