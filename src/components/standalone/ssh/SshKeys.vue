<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import type { Ref } from 'vue'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import { NeInlineNotification, NeButton, NeSkeleton } from '@nethesis/vue-components'
import {
  focusElement,
  getAxiosErrorMessage,
  NeModal,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { MessageBag, ValidationError } from '@/lib/validation'

type SshKeyError = {
  code: number
  data: string
  message: string
}

type SshKeysResponse = {
  data: {
    keys: string
  }
}

/**
 * Helper class to parse SSH keys
 */
class SshKey {
  type: string
  key: string
  comment?: string

  constructor(source: string) {
    const splitKey = source.split(' ')
    if (splitKey.length < 2) {
      throw new Error(`Invalid SSH key given. (${source})`)
    }
    // parse multiple cases of key types
    switch (splitKey[0]) {
      case 'ssh-rsa':
      case 'ssh-dss':
      case 'ssh-ed25519':
      case 'ecdsa-sha2':
      case 'ecdsa-sha2-nistp256':
      case 'sk-ecdsa-sha2-nistp256@openssh.com':
      case 'sk-ssh-ed25519@openssh.com':
        this.type = splitKey[0]
        break
      default:
        throw new Error('Invalid SSH key type.')
    }
    this.key = splitKey[1]
    // if there's a comment, we join the rest of the array
    if (splitKey.length > 2) {
      this.comment = splitKey
        .map((value, index) => {
          if (index > 1) {
            return value
          }
        })
        .join('')
    }
  }
}

const { t } = useI18n()
const uploadSshKey = ref('')
const sshKeys = ref(new Array<SshKey>())

const loading = ref(true)
const submitting = ref(false)
const deleting = ref(false)
const validationErrors = ref(new MessageBag())
const error: Ref<Error | undefined> = ref(undefined)

const keyToDelete: Ref<SshKey | undefined> = ref(undefined)

onMounted(() => {
  load()
})

function load() {
  error.value = undefined
  loading.value = true
  ubusCall('ns.ssh', 'list-keys')
    .then((response: SshKeysResponse) => {
      sshKeys.value = new Array<SshKey>()
      // the response will be a string with all the keys separated by a newline
      response.data.keys.split('\n').forEach((line) => {
        // final end line, skipping
        if (line.length == 0) {
          return
        }
        // If the key retrieved is invalid there's nothing we can do, so we just ignore it
        try {
          sshKeys.value.push(new SshKey(line))
        } catch (exception: any) {
          console.error("There's an issue with the SSH key: " + exception.message)
        }
      })
    })
    .catch((exception: AxiosError<SshKeyError>) => {
      // if file is empty or not present, the response is exit status 4
      if (exception.response?.data.data != 'exit status 4') {
        // otherwise it's a real axios error
        if (error.value instanceof AxiosError) {
          error.value = new Error(getAxiosErrorMessage(exception))
        } else {
          error.value = exception
        }
      }
    })
    .finally(() => {
      loading.value = false
    })
}

function addKey() {
  validate()
  if (validationErrors.value.size == 0) {
    const keys = sshKeys.value
      .map((key) => {
        let string = key.type + ' ' + key.key
        if (key.comment != undefined) {
          string = string + ' ' + key.comment
        }
        return string
      })
      .join('\n')
      .concat('\n')
      .concat(uploadSshKey.value)
      .concat('\n')
    submitting.value = true
    writeKeys(keys)
      .then(() => {
        uploadSshKey.value = ''
      })
      .finally(() => {
        submitting.value = false
      })
  } else {
    focusElement('uploadSshKeyInput')
    error.value = new ValidationError()
  }
}

function validate() {
  validationErrors.value = new MessageBag()
  try {
    const parsedSshKey = new SshKey(uploadSshKey.value)
    if (sshKeys.value.some((key) => key.key == parsedSshKey.key)) {
      validationErrors.value.set('uploadSshKey', [
        t('standalone.ssh.ssh_keys.validation.duplicate')
      ])
    }
  } catch (exception: any) {
    validationErrors.value.set('uploadSshKey', [t('standalone.ssh.ssh_keys.validation.invalid')])
  }
}

/**
 * Method that sends the keys to the server
 * @param mappedKeys string containing all the keys separated by a newline
 */
function writeKeys(mappedKeys: string): Promise<any> {
  error.value = undefined
  return ubusCall('file', 'write', {
    path: '/etc/dropbear/authorized_keys',
    mode: 384, // 0600
    data: mappedKeys
  })
    .then(() => {
      load()
    })
    .catch((exception: AxiosError) => {
      error.value = new Error(getAxiosErrorMessage(exception))
    })
}

function deleteKey() {
  if (keyToDelete.value == undefined) {
    return
  }
  // mapping the keys to a string, excluding the selected one
  const mappedKeys = sshKeys.value
    .filter((key) => key.key != keyToDelete.value?.key)
    .map((key) => {
      let string = key.type + ' ' + key.key
      if (key.comment != undefined) {
        string = string + ' ' + key.comment
      }
      return string
    })
    .join('\n')
    .concat('\n')

  deleting.value = true
  writeKeys(mappedKeys).finally(() => {
    keyToDelete.value = undefined
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
  >
    <div>{{ t('standalone.ssh.ssh_keys.delete_key_modal.body') }}</div>
    <code class="my-1 break-all">
      {{ keyToDelete?.type }} {{ keyToDelete?.key }} {{ keyToDelete?.comment }}
    </code>
  </NeModal>
  <NeInlineNotification
    v-if="error != undefined && !(error instanceof ValidationError)"
    :title="t(error.message)"
    kind="error"
  />
  <NeSkeleton v-if="loading" :lines="10" />
  <FormLayout
    v-else
    :description="t('standalone.ssh.ssh_keys.description')"
    :title="t('standalone.ssh.ssh_keys.title')"
  >
    <div class="mb-4">
      <!-- Key Element -->
      <div v-for="key in sshKeys" :key="key.key" class="mb-2 flex gap-x-2 last:mb-0">
        <div class="w-10/12 rounded border border-gray-200 p-3 text-xs dark:border-gray-700">
          <p class="mb-1 font-bold">
            {{ key.comment ?? t('standalone.ssh.ssh_keys.unnamed_key') }}
          </p>
          <p class="mb-1">{{ key.type }}</p>
          <code class="truncate">
            {{ key.key }}
          </code>
        </div>
        <div class="grid w-2/12 place-content-center">
          <NeButton kind="tertiary" size="lg" @click.prevent="keyToDelete = key">
            <font-awesome-icon :icon="['fas', 'trash']" aria-hidden="true" class="h-4 w-4" />
          </NeButton>
        </div>
      </div>
    </div>
    <!-- Add Key form -->
    <form class="flex flex-col gap-y-4">
      <NeTextInput
        ref="uploadSshKeyInput"
        v-model="uploadSshKey"
        :invalid-message="validationErrors.get('uploadSshKey')?.[0]"
        :label="t('standalone.ssh.ssh_keys.add_new_ssh_key.label')"
        :placeholder="t('standalone.ssh.ssh_keys.add_new_ssh_key.placeholder')"
      ></NeTextInput>
      <NeButton
        :disabled="submitting"
        :loading="submitting"
        size="lg"
        class="self-start"
        @click.prevent="addKey()"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'plus']" aria-hidden="true" />
        </template>
        Add Key
      </NeButton>
    </form>
  </FormLayout>
</template>
