<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, onUnmounted, ref, useTemplateRef, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useResizeObserver } from '@vueuse/core'
import { useQuery } from '@tanstack/vue-query'
import axios from 'axios'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useI18n } from 'vue-i18n'
import {
  NeBadge,
  NeButton,
  NeInlineNotification,
  NeHeading,
  NeSkeleton,
  NeTextInput,
  NeTooltip,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { faCheck, faWarning, faXmark } from '@fortawesome/free-solid-svg-icons'
import { getControllerApiEndpoint, getControllerUnitTerminalUrl } from '@/lib/config'
import { ubusCallFromController } from '@/lib/standalone/ubus'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import type { Unit } from '@/stores/controller/units'

type ConnectionStatus = 'pending' | 'active' | 'error' | 'closed'
type UnitSshKey = { type: string; key: string; comment: string }

const { t } = useI18n()
const route = useRoute()
const loginStore = useLoginStore()
const terminalContainer = useTemplateRef<HTMLElement>('terminalContainer')
const term = new Terminal()
const fitAddon = new FitAddon()
const encoder = new TextEncoder()
let webSocket: WebSocket | undefined

const unitId = route.query.unitId as string
const connectionStatus = ref<ConnectionStatus>('pending')
const hasOutput = ref(false)
const connecting = ref(false)
const passphrase = ref('')
const passphraseError = ref('')
const password = ref('')
const passwordError = ref('')
const closeReason = ref('')

const {
  data: unit,
  isPending: unitPending,
  error: unitError
} = useQuery({
  queryKey: ['controller', 'units', unitId],
  queryFn: ({ signal }) =>
    axios.get<{ data: Unit }>(`${getControllerApiEndpoint()}/units/${unitId}`, {
      headers: { Authorization: `Bearer ${loginStore.token}` },
      signal
    }),
  select: (res) => res.data.data,
  // checked once before connecting, a refetch must not unmount an open terminal
  staleTime: Infinity
})

const {
  data: accountPubKey,
  isPending: sshKeyPending,
  error: sshKeyError
} = useQuery({
  queryKey: ['controller', 'accounts', 'ssh-keys'],
  queryFn: ({ signal }) =>
    axios.get<{ data: { key_pub: string } }>(`${getControllerApiEndpoint()}/accounts/ssh-keys`, {
      headers: { Authorization: `Bearer ${loginStore.token}` },
      signal
    }),
  select: (res) => res.data.data.key_pub,
  staleTime: Infinity
})

const unitConnected = computed(() => unit.value?.vpn.connected_since !== 0)
const sshEnabled = computed(() => !!unit.value?.info.ssh_port)
const unitReachable = computed(() => !!unit.value && unitConnected.value && sshEnabled.value)

const {
  data: unitKeys,
  isPending: unitKeysPending,
  error: unitKeysError
} = useQuery({
  queryKey: ['controller', 'units', unitId, 'ssh-keys'],
  queryFn: () => ubusCallFromController('ns.ssh', 'list-keys', {}, unitId),
  select: (res): UnitSshKey[] => res.data.keys,
  enabled: unitReachable,
  staleTime: Infinity
})

// the key comment plays no part in authentication
const keyOnUnit = computed(() => {
  const [type, key] = (accountPubKey.value ?? '').split(' ')
  return !!key && !!unitKeys.value?.some((unitKey) => unitKey.type === type && unitKey.key === key)
})
const needsRootPassword = computed(() => !!unitKeys.value && !keyOnUnit.value)

// dropbear options read as booleans, unset means on
const dropbearOff = ['0', 'off', 'false', 'no', 'disabled']
const {
  data: rootPasswordLogin,
  isPending: dropbearPending,
  error: dropbearError
} = useQuery({
  queryKey: ['controller', 'units', unitId, 'dropbear'],
  queryFn: () =>
    ubusCallFromController('uci', 'get', { config: 'dropbear', section: 'main' }, unitId),
  // root login with password needs both options on
  select: (res): boolean =>
    !dropbearOff.includes(res.data.values.PasswordAuth) &&
    !dropbearOff.includes(res.data.values.RootPasswordAuth),
  enabled: needsRootPassword,
  staleTime: Infinity
})

const loading = computed(
  () =>
    unitPending.value ||
    sshKeyPending.value ||
    (unitReachable.value && unitKeysPending.value) ||
    (needsRootPassword.value && dropbearPending.value)
)
const canConnect = computed(
  () =>
    unitReachable.value && !!unitKeys.value && (keyOnUnit.value || rootPasswordLogin.value === true)
)

term.loadAddon(fitAddon)

term.onData((data) => {
  if (webSocket?.readyState === WebSocket.OPEN) {
    webSocket.send(encoder.encode(data))
  }
})

term.onResize(({ cols, rows }) => {
  if (webSocket?.readyState === WebSocket.OPEN) {
    webSocket.send(JSON.stringify({ type: 'resize', cols, rows }))
  }
})

useResizeObserver(terminalContainer, () => fitAddon.fit())

// post flush: the terminal container is rendered only once the unit can be reached
watch(
  canConnect,
  (ok) => {
    if (ok && !term.element) {
      term.open(terminalContainer.value!)
      fitAddon.fit()
      // root password access waits for the user to fill in the password
      if (keyOnUnit.value) {
        connect()
      }
    }
  },
  { flush: 'post' }
)

onUnmounted(() => {
  webSocket?.close()
  term.dispose()
})

function connect() {
  passphraseError.value = ''
  passwordError.value = ''
  closeReason.value = ''
  if (!keyOnUnit.value && !password.value) {
    passwordError.value = t('error.required')
    return
  }
  connectionStatus.value = 'pending'
  connecting.value = true

  const ws = new WebSocket(getControllerUnitTerminalUrl(unitId))
  ws.binaryType = 'arraybuffer'
  webSocket = ws

  ws.onopen = () => {
    // first frame carries the credentials and the initial terminal size
    ws.send(
      JSON.stringify({
        passphrase: keyOnUnit.value ? passphrase.value : '',
        password: keyOnUnit.value ? '' : password.value,
        cols: term.cols,
        rows: term.rows
      })
    )
  }

  ws.onmessage = (event) => {
    // active only once the shell answers, the server may still refuse the key before that
    if (!hasOutput.value) {
      hasOutput.value = true
      connecting.value = false
      connectionStatus.value = 'active'
      term.focus()
    }
    term.write(new Uint8Array(event.data))
  }

  ws.onclose = (event) => {
    connecting.value = false
    if (event.code === 1000) {
      connectionStatus.value = 'closed'
      return
    }

    // a missing passphrase just leaves the form enabled for the user to fill in
    if (event.reason.endsWith('wrong key passphrase')) {
      passphraseError.value = t('controller.unit_terminal.wrong_passphrase')
    } else if (event.reason.endsWith('wrong root password')) {
      passwordError.value = t('controller.unit_terminal.wrong_root_password')
    } else if (!event.reason.endsWith('key passphrase required')) {
      connectionStatus.value = 'error'
      closeReason.value = event.reason || t('controller.unit_terminal.connection_failed')
    }
  }
}

function isSshKeyError() {
  return (
    keyOnUnit.value &&
    (closeReason.value.includes('no ssh key for user') ||
      closeReason.value.includes('ssh handshake'))
  )
}

function getBadgeKind() {
  switch (connectionStatus.value) {
    case 'pending':
      return 'warning'
    case 'active':
      return 'success'
    default:
      return 'error'
  }
}

function getBadgeIcon() {
  switch (connectionStatus.value) {
    case 'pending':
      return faWarning
    case 'active':
      return faCheck
    default:
      return faXmark
  }
}
</script>

<template>
  <div class="p-6">
    <NeSkeleton v-if="unitPending" size="lg" class="mb-7 max-w-md" />
    <NeHeading v-else tag="h3" class="mb-7">{{
      t('controller.unit_terminal.name_unit_terminal', {
        name: unit?.info.unit_name || unitId
      })
    }}</NeHeading>
    <div class="flex flex-col gap-6">
      <NeSkeleton v-if="loading" :lines="2" size="lg" />
      <!-- unit or account key couldn't be loaded -->
      <NeInlineNotification
        v-else-if="unitError"
        kind="error"
        :title="t('error.cannot_retrieve_unit')"
        :description="t(getAxiosErrorMessage(unitError))"
      />
      <NeInlineNotification
        v-else-if="sshKeyError"
        kind="error"
        :title="t('error.cannot_retrieve_ssh_keys')"
        :description="t(getAxiosErrorMessage(sshKeyError))"
      />
      <!-- unit can't be reached -->
      <NeInlineNotification
        v-else-if="!unitConnected"
        kind="warning"
        :title="t('controller.unit_terminal.cannot_open_terminal')"
        :description="t('controller.unit_terminal.unit_not_connected')"
      />
      <NeInlineNotification
        v-else-if="!sshEnabled"
        kind="warning"
        :title="t('controller.unit_terminal.cannot_open_terminal')"
        :description="t('controller.unit_terminal.ssh_disabled')"
      />
      <NeInlineNotification
        v-else-if="unitKeysError"
        kind="error"
        :title="t('error.cannot_retrieve_unit_ssh_keys')"
        :description="t(getAxiosErrorMessage(unitKeysError))"
      />
      <NeInlineNotification
        v-else-if="dropbearError"
        kind="error"
        :title="t('error.cannot_retrieve_unit_ssh_configuration')"
        :description="t(getAxiosErrorMessage(dropbearError))"
      />
      <!-- account key isn't on the unit and the unit refuses root password login -->
      <NeInlineNotification
        v-else-if="needsRootPassword && !rootPasswordLogin"
        kind="warning"
        :title="t('controller.unit_terminal.cannot_open_terminal')"
        :description="t('controller.unit_terminal.root_password_login_disabled')"
      />
      <template v-else>
        <!-- account key isn't on the unit, root password access -->
        <NeInlineNotification
          v-if="!keyOnUnit"
          kind="warning"
          :title="t('controller.unit_terminal.root_password_access')"
          :description="t('controller.unit_terminal.root_password_access_description')"
        />
        <div class="flex items-center gap-4">
          <span>{{ t('controller.unit_terminal.connection') }}</span>
          <NeBadge
            :kind="getBadgeKind()"
            :text="t(`controller.unit_terminal.connection_status_${connectionStatus}`)"
            :icon="getBadgeIcon()"
          />
        </div>
        <div>
          {{ t('controller.unit_terminal.exit_terminal_description') }}
        </div>
        <!-- passphrase or root password prompt -->
        <form v-if="!hasOutput" class="flex max-w-md items-end gap-4" @submit.prevent="connect">
          <NeTextInput
            v-if="!keyOnUnit"
            v-model="password"
            :label="t('controller.unit_terminal.root_password')"
            :invalid-message="passwordError"
            :disabled="connecting"
            is-password
            :show-password-label="t('ne_text_input.show_password')"
            :hide-password-label="t('ne_text_input.hide_password')"
            autocomplete="current-password"
            class="grow"
          />
          <NeTextInput
            v-else
            v-model="passphrase"
            :label="t('controller.units.passphrase')"
            :invalid-message="passphraseError"
            :disabled="connecting"
            is-password
            :show-password-label="t('ne_text_input.show_password')"
            :hide-password-label="t('ne_text_input.hide_password')"
            class="grow"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('controller.units.passphrase_tooltip') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
          <NeButton type="submit" kind="primary" :loading="connecting" :disabled="connecting">
            {{ t('controller.unit_terminal.connect') }}
          </NeButton>
        </form>
        <!-- connection error notification -->
        <NeInlineNotification
          v-if="closeReason"
          kind="error"
          :title="t('controller.unit_terminal.cannot_open_terminal')"
          :description="isSshKeyError() ? t('controller.unit_terminal.ssh_key_hint') : closeReason"
        >
          <template v-if="isSshKeyError()" #details>
            {{ closeReason }}
          </template>
        </NeInlineNotification>
        <!-- shell exited notification -->
        <NeInlineNotification
          v-if="connectionStatus === 'closed'"
          kind="warning"
          :title="t('controller.unit_terminal.connection_closed')"
          :description="t('controller.unit_terminal.connection_closed_description')"
        />
        <!-- invisible until the shell answers, but still laid out so the fit addon can measure it -->
        <div class="rounded-md bg-black p-4" :class="{ invisible: !hasOutput }">
          <div ref="terminalContainer" class="h-[70vh]"></div>
        </div>
      </template>
    </div>
  </div>
</template>
