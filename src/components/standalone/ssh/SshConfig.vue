<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import type { Ref } from 'vue'
import { onMounted, ref } from 'vue'
import {
  NeCheckbox,
  NeInlineNotification,
  NeSkeleton,
  getAxiosErrorMessage,
  NeTextInput,
  NeButton
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { getUciConfig, ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { MessageBag, ValidationError } from '@/lib/validation'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

type SshConfigResponse = {
  dropbear: [
    {
      Port: string
      PasswordAuth: string
      RootPasswordAuth: string
      GatewayPorts: string
    }
  ]
}

const port = ref('22')
const passwordAuth = ref(false)
const rootPasswordAuth = ref(false)
const gatewayPorts = ref(false)
const loading = ref(true)
const submitting = ref(false)
const validationErrors = ref(new MessageBag())
const error: Ref<Error | undefined> = ref(undefined)

onMounted(() => {
  load()
})

function submit() {
  error.value = undefined
  validate()
  if (validationErrors.value.size > 0) {
    error.value = new ValidationError()
  } else {
    submitting.value = true
    ubusCall('uci', 'set', {
      config: 'dropbear',
      section: '@dropbear[0]',
      values: {
        Port: port.value,
        PasswordAuth: passwordAuth.value ? 'on' : 'off',
        RootPasswordAuth: rootPasswordAuth.value ? 'on' : 'off',
        GatewayPorts: gatewayPorts.value ? 'on' : 'off'
      }
    })
      .then(() => {
        uciChangesStore.getChanges()
      })
      .catch((exception: AxiosError) => {
        error.value = new Error(getAxiosErrorMessage(exception))
      })
      .finally(() => {
        submitting.value = false
      })
  }
}

function validate() {
  validationErrors.value = new MessageBag()
  if (Number.isNaN(Number(port.value))) {
    validationErrors.value.set('port', [t('standalone.ssh.ssh_access.tcp_port_invalid')])
  }
  if (Number(port.value) < 1) {
    validationErrors.value.set('port', [t('standalone.ssh.ssh_access.tcp_port_too_low')])
  }
  if (Number(port.value) > 65535) {
    validationErrors.value.set('port', [t('standalone.ssh.ssh_access.tcp_port_too_high')])
  }
}

function load() {
  error.value = undefined
  loading.value = true
  getUciConfig('dropbear')
    .then((response: SshConfigResponse) => {
      port.value = response.dropbear[0].Port
      passwordAuth.value = response.dropbear[0].PasswordAuth == 'on'
      rootPasswordAuth.value = response.dropbear[0].RootPasswordAuth == 'on'
      gatewayPorts.value = response.dropbear[0].GatewayPorts == 'on'
    })
    .catch((exception: AxiosError) => {
      error.value = new Error(getAxiosErrorMessage(exception))
    })
    .finally(() => {
      loading.value = false
    })
}
</script>

<template>
  <NeInlineNotification
    v-if="error != undefined && !(error instanceof ValidationError)"
    :title="t(error!.message)"
    kind="error"
  />
  <NeSkeleton v-if="loading" :lines="10"></NeSkeleton>
  <FormLayout
    v-else
    :description="t('standalone.ssh.ssh_access.description')"
    :title="t('standalone.ssh.ssh_access.title')"
  >
    <form>
      <!-- Form -->
      <div class="mb-8 flex flex-col gap-y-4">
        <NeTextInput
          v-model.number="port"
          :invalid-message="validationErrors.get('port')?.[0]"
          :label="t('standalone.ssh.ssh_access.tcp_port_label')"
          max="65535"
          min="1"
          type="number"
        />
        <h3 class="font-medium">Options</h3>
        <NeCheckbox
          v-model="passwordAuth"
          :label="t('standalone.ssh.ssh_access.allow_ssh_password_auth')"
        />
        <NeCheckbox
          v-model="rootPasswordAuth"
          :label="t('standalone.ssh.ssh_access.allow_root_login_with_password')"
        />
        <NeCheckbox
          v-model="gatewayPorts"
          :label="t('standalone.ssh.ssh_access.allow_remote_host_connection')"
        />
      </div>
    </form>
    <!-- Save Button -->
    <div class="flex justify-end">
      <NeButton
        :disabled="submitting"
        :loading="submitting"
        kind="primary"
        size="lg"
        @click.prevent="submit()"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'floppy-disk']" aria-hidden="true" />
        </template>
        {{ t('common.save') }}
      </NeButton>
    </div>
  </FormLayout>
</template>
