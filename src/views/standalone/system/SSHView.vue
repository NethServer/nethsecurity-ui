<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { computed, ref, useTemplateRef, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import {
  focusElement,
  getAxiosErrorMessage,
  NeButton,
  NeCheckbox,
  NeEmptyState,
  NeHeading,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTextInput
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faFloppyDisk, faKey, faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useAccountInfo } from '@/composables/useAccountInfo.ts'
import { isManagedByController } from '@/lib/deployment.ts'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import { MessageBag } from '@/lib/validation.ts'
import { useNotificationsStore } from '@/stores/notifications'
import { UnauthorizedAction } from '@/stores/standalone/sudo.ts'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges.ts'

type SshKey = {
  type: string
  key: string
  comment: string
}

type SshConfiguration = {
  Port: string
  RootPasswordAuth: 'on' | 'off'
  GatewayPorts: 'on' | 'off'
}

type GetConfigurationResponse = {
  data: {
    configuration: SshConfiguration
    keys: SshKey[]
  }
}

const { t } = useI18n()
const queryClient = useQueryClient()
const uci = useUciPendingChangesStore()
const notifications = useNotificationsStore()
const { data: accountInfo } = useAccountInfo()

const { data, isPending, isError, error } = useQuery({
  queryKey: ['ssh', 'configuration'],
  queryFn: () => ubusCall<GetConfigurationResponse>('ns.ssh', 'get-configuration'),
  select: (res) => res.data
})

// SSH is managed on the unit, the page is read-only from the controller
const canEdit = computed(() => accountInfo.value?.is_superuser === true && !isManagedByController())

// SSH access

const port = ref('')
const rootPasswordAuth = ref(false)
const gatewayPorts = ref(false)
const configurationValidationBag = ref(new MessageBag())

// watching only the configuration keeps unsaved edits when keys change
watch(
  () => data.value?.configuration,
  (configuration) => {
    if (configuration) {
      port.value = configuration.Port
      rootPasswordAuth.value = configuration.RootPasswordAuth == 'on'
      gatewayPorts.value = configuration.GatewayPorts == 'on'
      configurationValidationBag.value.clear()
    }
  },
  { immediate: true }
)

const {
  mutate: saveConfiguration,
  isPending: isSaving,
  error: saveError
} = useMutation({
  mutationFn: (payload: SshConfiguration) => ubusCall('ns.ssh', 'set-configuration', payload),
  onMutate: () => configurationValidationBag.value.clear(),
  onSuccess: async () => {
    await Promise.all([
      uci.getChanges(),
      queryClient.invalidateQueries({ queryKey: ['ssh', 'configuration'] })
    ])
  },
  onError: (e: Error) => {
    if (e instanceof ValidationError) {
      configurationValidationBag.value = e.errorBag
    }
  }
})

function submitConfiguration() {
  saveConfiguration({
    Port: String(port.value),
    RootPasswordAuth: rootPasswordAuth.value ? 'on' : 'off',
    GatewayPorts: gatewayPorts.value ? 'on' : 'off'
  })
}

// SSH keys

const newKey = ref('')
const keyToDelete = ref<SshKey>()
const keyValidationBag = ref(new MessageBag())
const newKeyInput = useTemplateRef('newKeyInput')

// key changes need sudo mode, a cancelled sudo prompt isn't an error
function isShownKeyError(e: Error | null): e is Error {
  return e != null && !(e instanceof ValidationError) && !(e instanceof UnauthorizedAction)
}

const {
  mutate: addKey,
  isPending: isAdding,
  error: addError
} = useMutation({
  mutationFn: (key: string) => ubusCall('ns.ssh', 'add-key', { key }),
  onMutate: () => keyValidationBag.value.clear(),
  onSuccess: async () => {
    newKey.value = ''
    await queryClient.invalidateQueries({ queryKey: ['ssh', 'configuration'] })
    notifications.addNotification({
      kind: 'success',
      id: 'added-ssh-key',
      title: t('standalone.ssh.ssh_keys.key_added_notification')
    })
  },
  onError: (e: Error) => {
    if (e instanceof ValidationError) {
      keyValidationBag.value = e.errorBag
      focusElement(newKeyInput)
    }
  }
})

const {
  mutate: deleteKey,
  isPending: isDeleting,
  error: deleteError,
  reset: resetDelete
} = useMutation({
  mutationFn: (key: string) => ubusCall('ns.ssh', 'delete-key', { key }),
  onSuccess: async () => {
    keyToDelete.value = undefined
    await queryClient.invalidateQueries({ queryKey: ['ssh', 'configuration'] })
    notifications.addNotification({
      kind: 'success',
      id: 'deleted-ssh-key',
      title: t('standalone.ssh.ssh_keys.key_deleted_notification')
    })
  }
})

function openDeleteModal(key: SshKey) {
  resetDelete()
  keyToDelete.value = key
}

function closeDeleteModal() {
  if (!isDeleting.value) {
    keyToDelete.value = undefined
  }
}
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.ssh.title') }}</NeHeading>
  <NeModal
    :close-aria-label="t('common.close')"
    :primary-button-disabled="isDeleting"
    :primary-button-loading="isDeleting"
    :primary-label="t('standalone.ssh.ssh_keys.delete_key_modal.button')"
    :title="t('standalone.ssh.ssh_keys.delete_key_modal.title')"
    :visible="keyToDelete != undefined"
    primary-button-kind="danger"
    @close="closeDeleteModal()"
    @primary-click="keyToDelete && deleteKey(keyToDelete.key)"
  >
    <div class="space-y-4">
      <NeInlineNotification
        v-if="isShownKeyError(deleteError)"
        :description="t(getAxiosErrorMessage(deleteError))"
        :title="t('standalone.ssh.ssh_keys.cannot_delete_key')"
        kind="error"
      />
      <p>{{ t('standalone.ssh.ssh_keys.delete_key_modal.body') }}</p>
      <code class="block break-all">
        {{ keyToDelete?.type }} {{ keyToDelete?.key }} {{ keyToDelete?.comment }}
      </code>
    </div>
  </NeModal>
  <div class="flex max-w-3xl flex-col gap-y-8">
    <NeInlineNotification
      v-if="isManagedByController()"
      :description="t('standalone.ssh.read_only_controller')"
      kind="info"
    />
    <NeInlineNotification
      v-else-if="accountInfo?.is_superuser === false"
      :description="t('standalone.ssh.read_only_admin')"
      kind="info"
    />
    <NeSkeleton v-if="isPending" :lines="10" />
    <NeInlineNotification
      v-else-if="isError"
      :description="t(getAxiosErrorMessage(error))"
      :title="t('standalone.ssh.cannot_load_configuration')"
      kind="error"
    />
    <template v-else>
      <FormLayout
        :description="t('standalone.ssh.ssh_access.description')"
        :title="t('standalone.ssh.ssh_access.title')"
      >
        <form class="flex flex-col gap-y-6" @submit.prevent="submitConfiguration">
          <NeInlineNotification
            v-if="saveError && !(saveError instanceof ValidationError)"
            :description="t(getAxiosErrorMessage(saveError))"
            :title="t('standalone.ssh.cannot_save_configuration')"
            kind="error"
          />
          <NeTextInput
            v-model="port"
            :disabled="!canEdit || isSaving"
            :invalid-message="t(configurationValidationBag.getFirstI18nKeyFor('Port'))"
            :label="t('standalone.ssh.ssh_access.tcp_port_label')"
            max="65535"
            min="1"
            type="number"
          />
          <NeCheckbox
            v-model="rootPasswordAuth"
            :disabled="!canEdit || isSaving"
            :label="t('standalone.ssh.ssh_access.allow_root_login_with_password')"
          />
          <NeCheckbox
            v-model="gatewayPorts"
            :disabled="!canEdit || isSaving"
            :label="t('standalone.ssh.ssh_access.allow_remote_host_connection')"
          />
          <NeButton
            v-if="canEdit"
            :disabled="isSaving"
            :loading="isSaving"
            class="self-start"
            kind="primary"
            size="lg"
            type="submit"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faFloppyDisk" aria-hidden="true" />
            </template>
            {{ t('common.save') }}
          </NeButton>
        </form>
      </FormLayout>
      <hr />
      <FormLayout
        :description="t('standalone.ssh.ssh_keys.description')"
        :title="t('standalone.ssh.ssh_keys.title')"
      >
        <div class="space-y-6">
          <NeEmptyState
            v-if="data?.keys.length == 0"
            :icon="faKey"
            :title="t('standalone.ssh.ssh_keys.no_keys')"
          />
          <ul v-else class="space-y-2">
            <li v-for="key in data?.keys" :key="key.key" class="flex items-center gap-2">
              <div
                class="min-w-0 grow rounded border border-gray-200 p-3 text-xs dark:border-gray-700"
              >
                <p class="mb-1 font-bold">
                  {{ key.comment || t('standalone.ssh.ssh_keys.unnamed_key') }}
                </p>
                <p class="mb-1">{{ key.type }}</p>
                <code class="block truncate">{{ key.key }}</code>
              </div>
              <NeButton
                v-if="canEdit"
                :aria-label="t('standalone.ssh.ssh_keys.delete_key_modal.button')"
                kind="tertiary"
                size="lg"
                @click="openDeleteModal(key)"
              >
                <FontAwesomeIcon :icon="faTrash" aria-hidden="true" class="h-4 w-4" />
              </NeButton>
            </li>
          </ul>
          <form v-if="canEdit" class="flex flex-col gap-y-4" @submit.prevent="addKey(newKey)">
            <NeInlineNotification
              v-if="isShownKeyError(addError)"
              :description="t(getAxiosErrorMessage(addError))"
              :title="t('standalone.ssh.ssh_keys.cannot_add_key')"
              kind="error"
            />
            <NeTextInput
              ref="newKeyInput"
              v-model="newKey"
              :disabled="isAdding"
              :invalid-message="t(keyValidationBag.getFirstI18nKeyFor('key'))"
              :label="t('standalone.ssh.ssh_keys.add_new_ssh_key.label')"
              :placeholder="t('standalone.ssh.ssh_keys.add_new_ssh_key.placeholder')"
            />
            <NeButton
              :disabled="isAdding"
              :loading="isAdding"
              class="self-start"
              size="lg"
              type="submit"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="faPlus" aria-hidden="true" />
              </template>
              {{ t('standalone.ssh.ssh_keys.add_key_button') }}
            </NeButton>
          </form>
        </div>
      </FormLayout>
    </template>
  </div>
</template>
