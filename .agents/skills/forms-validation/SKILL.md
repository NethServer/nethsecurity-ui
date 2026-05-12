---
name: forms-validation
description: Build forms, validate user input, handle submit actions, or display field errors. Use when writing valibot schemas, wiring up MessageBag, handling ValidationError from ubusCall, or building a form submit flow with useMutation. Covers all project validation helpers (IP, hostname, MAC, CIDR, etc.) and the correct pattern for resetting state.
metadata:
  project: nethsecurity-ui
---

# Forms & Validation

**Always use `valibot` for form validation.** The existing validators in `@/lib/validation.ts` (IP, hostname, MAC, etc.) wrap them. The `MessageBag` class maps field names to error messages for both client and server errors.

## Validation Stack

| Layer             | Tool                                              | Purpose                                             |
| ----------------- | ------------------------------------------------- | --------------------------------------------------- |
| Schema validation | `valibot`                                         | Declare rules for the whole form                    |
| Field error map   | `MessageBag` from `@/lib/validation.ts`           | `fieldName → i18n error key`                        |
| Server validation | `ValidationError` from `@/lib/standalone/ubus.ts` | Carries a `MessageBag` from the backend             |
| Domain validators | `@/lib/validation.ts` helpers                     | IP, hostname, CIDR, MAC — reuse, don't re-implement |

## Defining a Schema

```ts
import * as v from 'valibot'
import { MessageBag } from '@/lib/validation.ts'
import { validateIpAddress, validateHostname } from '@/lib/validation.ts'

const schema = v.object({
  name: v.pipe(
    v.string(),
    v.minLength(1, 'error.required')
  ),
  address: v.pipe(
    v.string(),
    v.check((val) => validateIpAddress(val).valid, 'error.invalid_ip_address')
  ),
  port: v.pipe(
    v.string(),
    v.check((val) => /^\d+$/.test(val) && +val >= 1 && +val <= 65535, 'error.invalid_port')
  ),
})
```

## Running Validation

```ts
const validationBag = ref(new MessageBag())

function validate(): boolean {
  validationBag.value.clear()
  const result = v.safeParse(schema, {
    name: name.value,
    address: address.value,
    port: port.value,
  })
  if (!result.success) {
    for (const issue of result.issues) {
      const field = issue.path?.[0]?.key as string
      if (field) validationBag.value.set(field, issue.message)
    }
  }
  return result.success
}
```

## `MessageBag` API

```ts
validationBag.value.set('fieldName', 'error.i18n_key')  // add error
validationBag.value.get('fieldName')                     // string | undefined
validationBag.value.clear()                              // reset all
validationBag.value.size                                 // number of entries
```

Pass to `Ne` input components:

```vue
<NeTextInput
  v-model="name"
  :label="t('common.name')"
  :invalid-message="t(validationBag.get('name') ?? '')"
/>
```

## Full Form + `useMutation` Flow

```vue
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useMutation, useQueryClient } from '@tanstack/vue-query'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import { MessageBag } from '@/lib/validation.ts'
import * as v from 'valibot'

const queryClient = useQueryClient()
const validationBag = ref(new MessageBag())

const name = ref('')

const schema = v.object({
  name: v.pipe(v.string(), v.minLength(1, 'error.required'))
})

function validate(): boolean {
  validationBag.value.clear()
  const result = v.safeParse(schema, { name: name.value })
  if (!result.success) {
    for (const issue of result.issues) {
      const field = issue.path?.[0]?.key as string
      if (field) validationBag.value.set(field, issue.message)
    }
  }
  return result.success
}

const { mutate, isPending } = useMutation({
  mutationFn: () => ubusCall('ns.module', 'save', { name: name.value }),
  onMutate: () => validationBag.value.clear(),
  onSuccess: async () => {
    await queryClient.invalidateQueries({ queryKey: ['module', 'list'] })
    emit('close')
  },
  onError: (e: Error) => {
    if (e instanceof ValidationError) {
      validationBag.value = e.errorBag
    }
  }
})

function submit() {
  if (!validate()) return
  mutate()
}
</script>
```

## Reset on Open/Close

```ts
watch(
  () => props.isShown,
  (isShown) => {
    if (isShown) {
      name.value = props.item?.name ?? ''
      validationBag.value.clear()
    }
  }
)
```

## Existing Validators (Do Not Re-Implement)

From `@/lib/validation.ts`:

| Function                            | Validates                      |
| ----------------------------------- | ------------------------------ |
| `validateRequired(v)`               | Non-empty string               |
| `validateHostname(v)`               | RFC-compliant hostname         |
| `validateDomainName(v)`             | FQDN                           |
| `validateIpAddress(v)`              | IPv4 or IPv6                   |
| `validateIp4Address(v)`             | IPv4 only                      |
| `validateIp6Address(v)`             | IPv6 only                      |
| `validateIpOrCidr(v)`               | IP or CIDR                     |
| `validateMacAddress(v)`             | MAC address                    |
| `validateHost(v)`                   | Hostname or IP                 |
| `validateFQDN(v, allowStar)`        | FQDN with optional wildcard    |
| `validateIpAddressRange(v)`         | IPv4 or IPv6 range (`a-b`)     |
| `validateAnyOf(validators, v, err)` | Passes if any validator passes |

Each returns `{ valid: boolean, errMessage?: string }` — use `.valid` in a `v.check()` callback.

## i18n Error Keys

`errMessage` values are i18n keys — always pass through `t()`:

```vue
<span>{{ t(validationBag.get('field') ?? '') }}</span>
```

## Gotchas

- **`issue.path?.[0]?.key` is `string | number | symbol | undefined`** — for array fields it's a number, not a string. Always guard before using as a `MessageBag` key: `const field = issue.path?.[0]?.key; if (typeof field === 'string') validationBag.value.set(field, issue.message)`.
- **`validationBag.get()` returns `string | undefined`** — always provide a fallback in templates: `t(validationBag.get('name') ?? '')`, not `t(validationBag.get('name'))`.
- **`validationBag.value = e.errorBag` replaces all client errors** — this is intentional (server errors override client errors). Do not call `validate()` again inside `onError`.
- **`onMutate` runs before `mutationFn`** — it's the right place to call `validationBag.value.clear()`, not inside `mutationFn` itself.
- **`validateRequired` checks truthiness, not just empty string** — `'0'` is valid, `0` (number) is not. Since all form fields are strings, this is fine, but don't call it on non-string values.

