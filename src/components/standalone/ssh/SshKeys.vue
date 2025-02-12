<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { AxiosError, type AxiosResponse } from 'axios'
import {
  focusElement,
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTextInput
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { MessageBag } from '@/lib/validation'
import { faPlus, faTrash } from '@fortawesome/free-solid-svg-icons'
import { useNotificationsStore } from '@/stores/notifications'

type SshKey = {
  type: string
  key: string
  comment: string
}

type SshKeysResponse = AxiosResponse<{
  keys: SshKey[]
}>

const notifications = useNotificationsStore()
const { t } = useI18n()
const uploadSshKey = ref('')
const sshKeys = ref<SshKey[]>([])

const loading = ref(true)
const submitting = ref(false)
const deleting = ref(false)
const validationErrors = ref(new MessageBag())
const error = ref<Error>()

const keyToDelete = ref<SshKey>()

onMounted(() => {
  load()
})

function load() {
  error.value = undefined
  loading.value = true
  ubusCall('ns.ssh', 'list-keys')
    .then((response: SshKeysResponse) => {
      sshKeys.value = response.data.keys
    })
    .catch((reason: AxiosError) => {
      error.value = reason
    })
    .finally(() => {
      loading.value = false
    })
}

function addKey() {
  submitting.value = true
  validationErrors.value.clear()
  error.value = undefined
  ubusCall('ns.ssh', 'add-key', {
    key: uploadSshKey.value
  })
    .then(() => {
      uploadSshKey.value = ''
      load()
      notifications.addNotification({
        kind: 'success',
        id: 'added-ssh-key',
        title: t('standalone.ssh.ssh_keys.key_added_notification')
      })
    })
    .catch((reason: Error) => {
      if (reason instanceof ValidationError) {
        validationErrors.value = reason.errorBag
        focusElement('uploadSshKeyInput')
      } else {
        error.value = reason
      }
    })
    .finally(() => {
      submitting.value = false
    })
}

function deleteKey() {
  deleting.value = true
  error.value = undefined
  ubusCall('ns.ssh', 'delete-key', {
    key: keyToDelete.value?.key
  })
    .then(() => {
      keyToDelete.value = undefined
      load()
      notifications.addNotification({
        kind: 'success',
        id: 'deleted-ssh-key',
        title: t('standalone.ssh.ssh_keys.key_deleted_notification')
      })
    })
    .catch((reason) => {
      error.value = reason
    })
    .finally(() => {
      deleting.value = false
    })
}
</script>

<template>
  <NeModal
    :primary-button-kind="'danger'"
    :primary-label="t('standalone.ssh.ssh_keys.delete_key_modal.button')"
    :title="t('standalone.ssh.ssh_keys.delete_key_modal.title')"
    :visible="keyToDelete != undefined"
    @close="keyToDelete = undefined"
    @primary-click="deleteKey()"
    :primary-button-loading="deleting"
    :primary-button-disabled="deleting"
    :close-aria-label="t('common.close')"
  >
    <div>{{ t('standalone.ssh.ssh_keys.delete_key_modal.body') }}</div>
    <code class="my-1 break-all">
      {{ keyToDelete?.type }} {{ keyToDelete?.key }} {{ keyToDelete?.comment }}
    </code>
  </NeModal>
  <NeInlineNotification
    v-if="error != undefined"
    :description="t(getAxiosErrorMessage(error))"
    kind="error"
    :title="t('error.generic_error')"
  />
  <NeSkeleton v-if="loading" :lines="10" />
  <FormLayout
    v-else
    :description="t('standalone.ssh.ssh_keys.description')"
    :title="t('standalone.ssh.ssh_keys.title')"
  >
    <div class="space-y-4">
      <ul class="space-y-2">
        <li v-for="key in sshKeys" :key="key.key" class="flex items-center gap-2">
          <div
            class="min-w-0 flex-grow rounded border border-gray-200 p-3 text-xs dark:border-gray-700"
          >
            <p class="mb-1 font-bold">
              <template v-if="key.comment != ''">
                {{ key.comment }}
              </template>
              <template v-else>
                {{ t('standalone.ssh.ssh_keys.unnamed_key') }}
              </template>
            </p>
            <p class="mb-1">{{ key.type }}</p>
            <code class="truncate">
              {{ key.key }}
            </code>
          </div>
          <NeButton kind="tertiary" size="lg" @click="keyToDelete = key">
            <FontAwesomeIcon :icon="faTrash" class="h-4 w-4" />
          </NeButton>
        </li>
      </ul>
      <!-- Add Key form -->
      <form class="flex flex-col gap-y-4" @submit.prevent="addKey()">
        <NeTextInput
          ref="uploadSshKeyInput"
          v-model="uploadSshKey"
          :disabled="submitting"
          :invalid-message="t(validationErrors.getFirstI18nKeyFor('key'))"
          :label="t('standalone.ssh.ssh_keys.add_new_ssh_key.label')"
          :placeholder="t('standalone.ssh.ssh_keys.add_new_ssh_key.placeholder')"
        />
        <NeButton
          :disabled="submitting"
          :loading="submitting"
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
