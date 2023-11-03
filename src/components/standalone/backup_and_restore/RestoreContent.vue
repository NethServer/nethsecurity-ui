<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeModal,
  NeTitle,
  NeButton,
  NeTooltip,
  NeCombobox,
  NeSkeleton,
  NeTextInput,
  NeFileInput,
  NeSideDrawer,
  NeProgressBar,
  NeRadioSelection,
  NeInlineNotification,
  getAxiosErrorMessage,
  focusElement
} from '@nethserver/vue-tailwind-lib'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { validateRequired } from '@/lib/validation'

const { t } = useI18n()
const RESTORE_WAIT_TIME = 45000

const formRestore = ref({
  passphrase: '',
  file: undefined,
  backup: ''
})

const loading = ref(true)
const loadingRestore = ref(false)
const isEnterprise = ref(false)
const isSetPassphrase = ref(false)
const showRestoreDrawer = ref(false)
const typeRestore = ref('upload_file')
const listBackups: any = ref([])
const isRestoring = ref(false)
const restoreProgress = ref(0)
const restoreIntervalRef = ref<number | undefined>()
const restoreTimeoutRef = ref<number | undefined>()
const sourceRestoreOptions = [
  {
    id: 'from_backup',
    label: t('standalone.backup_and_restore.restore.from_backup')
  },
  {
    id: 'upload_file',
    label: t('standalone.backup_and_restore.restore.from_file')
  }
]
const passphraseRef = ref()
const fileRef = ref()
const backupRef = ref()

let error = ref(false)
let errorPage = ref({
  notificationTitle: '',
  notificationDescription: ''
})
let errorRestoreBackup = ref({
  notificationTitle: '',
  notificationDescription: ''
})
let errorRestore = ref({
  passphrase: '',
  file: '',
  backup: ''
})

onMounted(() => {
  Promise.all([getSubscription(), getIsPassphrase()])
})

async function getSubscription() {
  try {
    let res = await ubusCall('ns.subscription', 'info', {})
    if (res?.data?.systemd_id && res?.data?.active) {
      isEnterprise.value = true
      typeRestore.value = 'from_backup'
      await getBackups()
    }
  } catch (exception: any) {
    error.value = true
    errorPage.value.notificationTitle = t('error.cannot_retrieve_subscription_info')
    errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

async function getIsPassphrase() {
  try {
    let res = await ubusCall('ns.backup', 'is-passphrase-set', {})
    if (res?.data?.values?.set) {
      isSetPassphrase.value = true
    }
  } catch (exception: any) {
    error.value = true
    errorPage.value.notificationTitle = t('error.cannot_retrieve_passphrase')
    errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

async function getBackups() {
  if (isEnterprise.value) {
    try {
      let res = await ubusCall('ns.backup', 'registered-list-backups')
      if (res?.data?.values?.length) {
        listBackups.value = res.data.values.map((item: any) => ({
          id: item.file,
          label: item.name
        }))
      }
    } catch (exception: any) {
      errorPage.value.notificationTitle = t('error.cannot_retrieve_backup')
      errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
    }
  }
}

function validateRestore(): boolean {
  let isValidationOk = true
  let isFocusInput = false

  if (isSetPassphrase.value) {
    let { valid, errMessage } = validateRequired(formRestore.value.passphrase)
    if (!valid) {
      errorRestore.value.passphrase = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk) {
    focusElement(passphraseRef)
    isFocusInput = true
  }

  if (typeRestore.value === 'upload_file') {
    let { valid, errMessage } = validateRequired(
      formRestore?.value?.file ? formRestore.value.file : ''
    )
    if (!valid) {
      errorRestore.value.file = t(errMessage as string)
      isValidationOk = false
    }
  } else if (isEnterprise.value && typeRestore.value === 'from_backup') {
    let { valid, errMessage } = validateRequired(formRestore.value.backup)
    if (!valid) {
      errorRestore.value.backup = t(errMessage as string)
      isValidationOk = false
    }

    if (!isValidationOk && !isFocusInput) {
      focusElement(backupRef)
    }
  }

  return isValidationOk
}

function clearErrors() {
  errorRestore.value = {
    passphrase: '',
    file: '',
    backup: ''
  }
}

async function restoreBackup() {
  clearErrors()
  if (validateRestore()) {
    loadingRestore.value = true
    let error = false
    try {
      let payload = {}
      let methodCall = 'restore'

      if (isSetPassphrase.value)
        Object.assign(payload, { passphrase: formRestore.value.passphrase })

      if (isEnterprise.value && typeRestore.value === 'from_backup') {
        methodCall = 'registered-restore'
        Object.assign(payload, { file: formRestore.value.backup })
      } else {
        await new Promise((resolve: any) => {
          let reader = new FileReader()
          reader.onload = function (event) {
            if (event?.target?.result) {
              Object.assign(payload, { backup: String(event.target.result).split(',')[1] })
            } else {
              error = true
            }
            resolve()
          }
          if (formRestore.value.file) {
            reader.readAsDataURL(formRestore.value.file)
          }
        })
      }

      if (!error && methodCall) {
        let res = await ubusCall('ns.backup', methodCall, payload)
        if (res?.data?.message && res?.data?.message === 'success') {
          isRestoring.value = true
          showRestoreDrawer.value = false
          setRestoreTimer()
        }
      } else {
        errorRestoreBackup.value.notificationTitle = t('error.cannot_restore_backup')
      }
    } catch (exception: any) {
      errorRestoreBackup.value.notificationTitle = t('error.cannot_restore_backup')
      errorRestoreBackup.value.notificationDescription = t(getAxiosErrorMessage(exception))
    } finally {
      loadingRestore.value = false
    }
  }
}

function setRestoreTimer() {
  restoreTimeoutRef.value = setTimeout(() => {
    location.reload()
  }, RESTORE_WAIT_TIME)

  restoreIntervalRef.value = setInterval(() => {
    restoreProgress.value += 0.5
  }, RESTORE_WAIT_TIME / 200)
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading" :lines="15" />
    <NeInlineNotification
      v-if="!loading && errorPage.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorPage.notificationTitle"
      :description="errorPage.notificationDescription"
    />
    <template v-if="!loading && !error">
      <div class="flex">
        <div>
          <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.backup_and_restore.restore.description') }}
          </p>
        </div>
        <div class="mr-auto self-start">
          <NeButton
            class="ml-6"
            kind="secondary"
            size="lg"
            type="submit"
            @click="showRestoreDrawer = true"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="['fa', 'rotate']" />
            </template>
            {{ t('standalone.backup_and_restore.restore.restore_backup') }}
          </NeButton>
        </div>
      </div>
    </template>
    <NeSideDrawer :is-shown="showRestoreDrawer" title="" @close="showRestoreDrawer = false">
      <div class="space-y-8">
        <NeTitle>{{ t('standalone.backup_and_restore.restore.restore_backup') }}</NeTitle>
        <hr />
        <template v-if="isEnterprise">
          <NeRadioSelection
            v-model="typeRestore"
            :label="t('standalone.backup_and_restore.restore.source')"
            :options="sourceRestoreOptions"
          />
          <template v-if="typeRestore === 'from_backup'">
            <NeCombobox
              v-model="formRestore.backup"
              :options="listBackups"
              :label="t('standalone.backup_and_restore.restore.backup')"
              :invalid-message="errorRestore.backup"
              class="grow"
              ref="backupRef"
            />
          </template>
        </template>
        <template v-if="typeRestore === 'upload_file'">
          <NeFileInput
            :label="t('standalone.backup_and_restore.restore.upload_file')"
            :dropzoneLabel="t('standalone.backup_and_restore.restore.upload_file_description')"
            :invalid-message="errorRestore.file"
            v-model="formRestore.file"
            ref="fileRef"
          />
        </template>
        <template v-if="isSetPassphrase">
          <NeTextInput
            v-model="formRestore.passphrase"
            :invalid-message="errorRestore.passphrase"
            :label="t('standalone.backup_and_restore.restore.passphrase')"
            isPassword
            ref="passphraseRef"
          >
            <template #tooltip>
              <NeTooltip>
                <template #content>
                  {{ t('standalone.backup_and_restore.restore.passphrase_helper') }}
                </template>
              </NeTooltip>
            </template>
          </NeTextInput>
        </template>
        <hr />
        <NeInlineNotification
          v-if="errorRestoreBackup.notificationTitle"
          class="my-4"
          kind="error"
          :title="errorRestoreBackup.notificationTitle"
          :description="errorRestoreBackup.notificationDescription"
        />
        <div class="flex justify-end gap-4">
          <NeButton
            :disabled="loadingRestore"
            :kind="'tertiary'"
            @click="showRestoreDrawer = false"
          >
            {{ t('common.cancel') }}
          </NeButton>
          <NeButton
            :disabled="loadingRestore"
            :kind="'primary'"
            :loading="loadingRestore"
            @click="restoreBackup()"
          >
            {{ t('standalone.backup_and_restore.restore.restore') }}
          </NeButton>
        </div>
      </div>
    </NeSideDrawer>
    <NeModal
      :primary-label="t('standalone.backup_and_restore.restore.restore_now')"
      :primary-button-loading="isRestoring"
      :primary-button-disabled="isRestoring"
      :title="t('standalone.backup_and_restore.restore.restore')"
      :cancel-label="!isRestoring ? t('common.cancel') : ''"
      :visible="isRestoring"
      kind="warning"
      primary-button-kind="danger"
      @close="isRestoring = false"
    >
      {{ t('standalone.backup_and_restore.restore.restore_in_progress') }}
      <NeProgressBar class="my-4" :progress="restoreProgress" />
    </NeModal>
  </div>
</template>
