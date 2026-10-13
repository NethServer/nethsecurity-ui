<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, onUnmounted, ref, useTemplateRef } from 'vue'
import { useRoute } from 'vue-router'
import { useResizeObserver } from '@vueuse/core'
import { Terminal } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { useI18n } from 'vue-i18n'
import {
  NeBadge,
  NeButton,
  NeInlineNotification,
  NeHeading,
  NeTextInput,
  NeTooltip
} from '@nethesis/vue-components'
import { faCheck, faWarning, faXmark } from '@fortawesome/free-solid-svg-icons'
import { getControllerUnitTerminalUrl } from '@/lib/config'

type ConnectionStatus = 'pending' | 'active' | 'error' | 'closed'

const { t } = useI18n()
const route = useRoute()
const terminalContainer = useTemplateRef<HTMLElement>('terminalContainer')
const term = new Terminal()
const fitAddon = new FitAddon()
const encoder = new TextEncoder()
let webSocket: WebSocket | undefined

const unitId = route.query.unitId as string
const unitName = route.query.unitName as string
const connectionStatus = ref<ConnectionStatus>('pending')
const askPassphrase = ref(false)
const passphrase = ref('')
const passphraseError = ref('')
const closeReason = ref('')

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

onMounted(() => {
  term.open(terminalContainer.value!)
  fitAddon.fit()
  connect()
})

onUnmounted(() => {
  webSocket?.close()
  term.dispose()
})

function connect() {
  connectionStatus.value = 'pending'
  askPassphrase.value = false
  closeReason.value = ''

  const ws = new WebSocket(getControllerUnitTerminalUrl(unitId))
  ws.binaryType = 'arraybuffer'
  webSocket = ws

  ws.onopen = () => {
    // first frame carries the key passphrase and the initial terminal size
    ws.send(JSON.stringify({ passphrase: passphrase.value, cols: term.cols, rows: term.rows }))
    connectionStatus.value = 'active'
    term.focus()
  }

  ws.onmessage = (event) => {
    term.write(new Uint8Array(event.data))
  }

  ws.onclose = (event) => {
    if (event.code === 1000) {
      connectionStatus.value = 'closed'
      return
    }
    connectionStatus.value = 'error'

    if (event.reason.endsWith('key passphrase required')) {
      askPassphrase.value = true
      passphraseError.value = ''
    } else if (event.reason.endsWith('wrong key passphrase')) {
      askPassphrase.value = true
      passphraseError.value = t('controller.unit_terminal.wrong_passphrase')
    } else {
      closeReason.value = event.reason || t('controller.unit_terminal.connection_failed')
    }
  }
}

function isSshKeyError() {
  return (
    closeReason.value.includes('no ssh key for user') || closeReason.value.includes('ssh handshake')
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
    <NeHeading tag="h3" class="mb-7">{{
      t('controller.unit_terminal.name_unit_terminal', { name: unitName })
    }}</NeHeading>
    <div class="flex flex-col gap-6">
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
      <!-- passphrase prompt -->
      <form v-if="askPassphrase" class="flex max-w-md items-end gap-4" @submit.prevent="connect">
        <NeTextInput
          v-model="passphrase"
          :label="t('controller.units.passphrase')"
          :invalid-message="passphraseError"
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
        <NeButton type="submit" kind="primary">
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
      <!-- padding on a wrapper, fit addon sizes the terminal from its parent's full box -->
      <div class="rounded-md bg-black p-4">
        <div ref="terminalContainer" class="h-[70vh]"></div>
      </div>
    </div>
  </div>
</template>
