<script lang="ts" setup>
import type { Ref } from 'vue'
import { onMounted, ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import InputLayout from '@/components/standalone/InputLayout.vue'
import { MessageBag, ValidationError } from '@/lib/validation'

type SshKeyError = {
  code: number
  data: string
  message: string
}

type SshKeysResponse = {
  data: {
    data: string
  }
}

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
const validationErrors = ref(new MessageBag())
const error: Ref<Error | undefined> = ref(undefined)

const keyToDelete: Ref<SshKey | undefined> = ref(undefined)

onMounted(() => {
  load()
})

function load() {
  error.value = undefined
  ubusCall('file', 'read', { path: '/etc/dropbear/authorized_keys' })
    .then((response: SshKeysResponse) => {
      sshKeys.value = new Array<SshKey>()
      // parse the response
      response.data.data.split('\n').forEach((line) => {
        if (line.length == 0) {
          return
        }
        try {
          sshKeys.value.push(new SshKey(line))
        } catch (exception: any) {
          console.log("There's an issue with the SSH key: " + exception.message)
        }
      })
    })
    .catch((exception: AxiosError<SshKeyError>) => {
      // if file is empty or not present, the response is exit status 4, so we ignore it
      if (exception.response?.data.data != 'exit status 4') {
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
    writeKeys(keys).then(() => {
      uploadSshKey.value = ''
    })
  } else {
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

  writeKeys(mappedKeys).finally(() => {
    keyToDelete.value = undefined
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
  >
    <div>{{ t('standalone.ssh.ssh_keys.delete_key_modal.body') }}</div>
    <code class="break-all my-1">
      {{ keyToDelete?.type }} {{ keyToDelete?.key }} {{ keyToDelete?.comment }}
    </code>
  </NeModal>
  <NeInlineNotification v-if="error != undefined" :title="t(error.message)" kind="error" />
  <NeSkeleton v-if="loading" :lines="10" />
  <InputLayout
    v-else
    :description="t('standalone.ssh.ssh_keys.description')"
    :title="t('standalone.ssh.ssh_keys.title')"
  >
    <div class="mb-4">
      <!-- Key Element -->
      <div v-for="key in sshKeys" :key="key.key" class="flex gap-x-2 mb-2 last:mb-0">
        <div class="w-10/12 border border-gray-200 dark:border-gray-700 rounded p-3 text-xs">
          <p class="font-bold mb-1">
            {{ key.comment ?? t('standalone.ssh.ssh_keys.unnamed_key') }}
          </p>
          <p class="mb-1">{{ key.type }}</p>
          <code class="truncate">
            {{ key.key }}
          </code>
        </div>
        <div class="w-2/12 grid place-content-center">
          <NeButton kind="tertiary" @click.prevent="keyToDelete = key">
            <font-awesome-icon :icon="['fas', 'trash']" aria-hidden="true" class="w-4 h-4" />
          </NeButton>
        </div>
      </div>
    </div>
    <!-- Add Key form -->
    <form class="flex flex-col gap-y-4">
      <NeTextInput
        v-model="uploadSshKey"
        :invalid-message="validationErrors.get('uploadSshKey')?.shift()"
        :label="t('standalone.ssh.ssh_keys.add_new_ssh_key.label')"
        :placeholder="t('standalone.ssh.ssh_keys.add_new_ssh_key.placeholder')"
      ></NeTextInput>
      <NeButton :size="'lg'" class="self-start" @click.prevent="addKey()">
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'plus']" aria-hidden="true" />
        </template>
        Add Key
      </NeButton>
    </form>
  </InputLayout>
</template>
