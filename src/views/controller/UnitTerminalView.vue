<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { Terminal } from '@xterm/xterm'
import { AttachAddon } from '@xterm/addon-attach'
import { useI18n } from 'vue-i18n'
import {
  NeBadge,
  NeInlineNotification,
  NeSkeleton,
  NeHeading,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { faCheck, faWarning, faXmark } from '@fortawesome/free-solid-svg-icons'
import { useDefaultsStore } from '@/stores/controller/defaults'

type ConnectionStatus = 'pending' | 'active' | 'error' | 'closed'

const { t } = useI18n()
const route = useRoute()
const defaultsStore = useDefaultsStore()
const term = ref<Terminal>()
const webSocket = ref<WebSocket>()

const unitName = ref('')
const websocketId = ref('')
const connectionStatus = ref<ConnectionStatus>('pending')

let loading = ref({
  getDefaults: false
})

let error = ref({
  getDefaults: ''
})

onMounted(() => {
  unitName.value = route.query.unitName as string
  websocketId.value = route.query.websocketId as string
  getDefaults()
})

async function getDefaults() {
  loading.value.getDefaults = true

  try {
    await defaultsStore.getDefaults()
    connectWebSocket()
  } catch (err: any) {
    error.value.getDefaults = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.getDefaults = false
  }
}

function connectWebSocket() {
  webSocket.value = new WebSocket(
    `wss://${defaultsStore.fqdn}${defaultsStore.websshPath}ws?id=${websocketId.value}`
  )

  webSocket.value.onopen = () => {
    initTerminal()
    connectionStatus.value = 'active'
  }

  webSocket.value.onerror = (error) => {
    console.log('WebSocket error:', error)
    connectionStatus.value = 'error'
  }

  webSocket.value.onclose = (event) => {
    console.log('WebSocket connection closed:', event.code, event)
    connectionStatus.value = 'closed'
  }
}

function initTerminal() {
  term.value = new Terminal()

  const terminalContainer = document.getElementById('terminal-container') as HTMLElement

  if (!webSocket.value) {
    return
  }

  const attachAddon = new AttachAddon(webSocket.value)
  term.value.loadAddon(attachAddon)
  term.value.open(terminalContainer)

  term.value.onData((key) => {
    if (webSocket.value) {
      webSocket.value.send(JSON.stringify({ data: key }))
    }
  })
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
    <!-- 50 rem is an appropriate width for the default number or colums of xterm.js terminal -->
    <div class="flex max-w-[50rem] flex-col gap-6">
      <div class="flex items-center gap-4">
        <span>{{ t('controller.unit_terminal.connection') }}</span>
        <NeBadge
          :kind="getBadgeKind()"
          :text="t(`controller.unit_terminal.connection_status_${connectionStatus}`)"
          :icon="getBadgeIcon()"
        />
      </div>
      <NeSkeleton v-if="loading.getDefaults" :lines="2" size="lg" />
      <div v-else>
        {{ t('controller.unit_terminal.exit_terminal_description') }}
      </div>
      <!-- getDefaults error notification -->
      <NeInlineNotification
        v-if="error.getDefaults"
        kind="error"
        :title="t('error.cannot_retrieve_defaults')"
        :description="error.getDefaults"
      />
      <!-- connection error/closed notification -->
      <NeInlineNotification
        v-if="['error', 'closed'].includes(connectionStatus)"
        kind="warning"
        :title="t('controller.unit_terminal.connection_closed')"
        :description="t('controller.unit_terminal.connection_closed_description')"
      />
      <div id="terminal-container" class="min-h-[14rem] rounded-md bg-black p-4"></div>
    </div>
  </div>
</template>
