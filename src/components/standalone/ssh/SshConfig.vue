<script lang="ts" setup>
import type { Ref } from 'vue'
import { onMounted, ref } from 'vue'
import {
  getAxiosErrorMessage,
  NeButton,
  NeCheckbox,
  NeInlineNotification,
  NeSkeleton,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import InputLayout from '@/components/standalone/InputLayout.vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { MessageBag, ValidationError } from '@/lib/validation'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

type SshConfigResponse = {
  data: {
    values: {
      cfg014dd4: {
        Port: string
        PasswordAuth: string
        RootPasswordAuth: string
        GatewayPorts: string
      }
    }
  }
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
      section: 'cfg014dd4',
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
  ubusCall('uci', 'get', { config: 'dropbear' })
    .then((response: SshConfigResponse) => {
      port.value = response.data.values.cfg014dd4.Port
      passwordAuth.value = response.data.values.cfg014dd4.PasswordAuth == 'on'
      rootPasswordAuth.value = response.data.values.cfg014dd4.RootPasswordAuth == 'on'
      gatewayPorts.value = response.data.values.cfg014dd4.GatewayPorts == 'on'
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
  <InputLayout
    v-else
    :description="t('standalone.ssh.ssh_access.description')"
    :title="t('standalone.ssh.ssh_access.title')"
  >
    <form>
      <!-- Form -->
      <div class="flex flex-col gap-y-4 mb-8">
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
        @click.prevent="submit()"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'floppy-disk']" aria-hidden="true" />
        </template>
        {{ t('common.save') }}
      </NeButton>
    </div>
  </InputLayout>
</template>
