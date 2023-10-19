<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeModal,
  NeTitle,
  NeButton,
  NeTooltip,
  NeSkeleton,
  NeTextInput,
  NeEmptyState,
  NeSideDrawer,
  NeInlineNotification,
  getAxiosErrorMessage,
  focusElement
} from '@nethserver/vue-tailwind-lib'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { validateRequired } from '@/lib/validation'
import { AxiosError } from 'axios'

const { t } = useI18n()

const formPassphrase = ref({
  passphrase: ''
})

let loading = ref(true)
let isEnterprise = ref(false)
let loadingDownload = ref(false)
let loadingSetPassphrase = ref(false)
let loadingRunBackup = ref(false)
let showDownloadModal = ref(false)
let showPassphraseDrawer = ref(false)
let showRunBackupModal = ref(false)
let unitName = ref(undefined)
let passphraseRef = ref()
let listBackups: any = ref([])

let objError = {
  notificationTitle: '',
  notificationDescription: '',
  passphrase: ''
}

let error = ref(false)
let errorSubscription = ref({ ...objError })
let errorHostname = ref({ ...objError })
let errorDownloadBackup = ref({ ...objError })
let errorSetPassphrase = ref({ ...objError })
let errorRunBackup = ref({ ...objError })

onMounted(() => {
  loading.value = false
  getSubscription()
  getHostname()
})

async function getSubscription() {
  try {
    let res = await ubusCall('ns.subscription', 'info', {})
    if (res?.data?.systemd_id && res?.data?.active) {
      isEnterprise.value = true
      await getBackups()
    }
  } catch (exception: any) {
    error.value = true
    errorSubscription.value.notificationTitle = t('error.cannot_retrieve_subscription_info')
    errorSubscription.value.notificationDescription = t(getAxiosErrorMessage(exception))
  }
}

async function getHostname() {
  try {
    let systemInfo = await ubusCall('system', 'board')
    unitName.value = systemInfo.data.hostname
  } catch (exception: any) {
    error.value = true
    errorHostname.value.notificationTitle = t('error.cannot_retrieve_system_board')
    errorHostname.value.notificationDescription = t(getAxiosErrorMessage(exception))
  }
}

async function getBackups() {
  if (isEnterprise.value) {
    // TODO get list backups
  }
}

async function downloadBackup() {
  // TODO downloadBackup
}

async function runBackup() {
  // TODO runBackup
}

async function openPassphraseDrawer() {
  showPassphraseDrawer.value = true
  errorSetPassphrase.value = { ...objError }
}

function validatePassphrase(): boolean {
  let isValidationOk = true

  if (!formPassphrase.value.passphrase) {
    let { valid, errMessage } = validateRequired(formPassphrase.value.passphrase)
    if (!valid) {
      errorSetPassphrase.value.passphrase = t(errMessage as string)
      isValidationOk = false
      focusElement(passphraseRef)
    }
  }

  return isValidationOk
}

async function setPassphrase() {
  if (validatePassphrase()) {
    loadingSetPassphrase.value = true

    // create payload
    let payload = {
      passphrase: formPassphrase.value.passphrase
    }

    ubusCall('ns.backup', 'set-passphrase', payload)
      .then((response) => {
        if (response?.data?.message && response.data.message == 'success') {
          loadingSetPassphrase.value = false
          showPassphraseDrawer.value = false
        }
      })
      .catch((exception: AxiosError) => {
        errorSetPassphrase.value.notificationTitle = t('error.cannot_set_passphrase')
        errorSetPassphrase.value.notificationDescription = t(getAxiosErrorMessage(exception))
        loadingSetPassphrase.value = false
      })
  }
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading" :lines="15" />
    <NeInlineNotification
      v-if="!loading && errorSubscription.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorSubscription.notificationTitle"
      :description="errorSubscription.notificationDescription"
    />
    <NeInlineNotification
      v-if="!loading && errorHostname.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorHostname.notificationTitle"
      :description="errorHostname.notificationDescription"
    />
    <template v-if="!loading && !error">
      <div class="flex">
        <div>
          <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.backup_and_restore.backup.description') }}
          </p>
        </div>
        <template v-if="isEnterprise">
          <div v-if="listBackups.length" class="ml-auto self-start">
            <NeButton class="mr-2" kind="tertiary" @click="openPassphraseDrawer()">
              {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
            </NeButton>
            <NeButton kind="secondary" @click="showRunBackupModal = true">
              <template #prefix>
                <FontAwesomeIcon :icon="['fa', 'play']" aria-hidden="true" />
              </template>
              {{ t('standalone.backup_and_restore.backup.run_backup') }}
            </NeButton>
          </div>
        </template>
        <template v-else>
          <div class="mr-auto self-start">
            <NeButton kind="secondary" size="lg" type="submit" @click="showDownloadModal = true">
              <template #prefix>
                <FontAwesomeIcon :icon="['fa', 'circle-arrow-down']" />
              </template>
              {{ t('standalone.backup_and_restore.backup.download_backup') }}
            </NeButton>
            <NeButton kind="tertiary" size="lg" @click="openPassphraseDrawer()">
              {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
            </NeButton>
          </div>
        </template>
      </div>
    </template>
    <NeEmptyState
      v-if="
        isEnterprise &&
        !listBackups.length &&
        !errorSubscription.notificationTitle &&
        !errorHostname.notificationTitle
      "
      :title="t('standalone.backup_and_restore.backup.no_backups_found')"
      :icon="['fa', 'box-archive']"
      class="mt-5"
    >
      <div class="flex justify-center">
        <NeButton kind="primary" size="lg" @click="showRunBackupModal = true">
          <template #prefix>
            <FontAwesomeIcon :icon="['fa', 'play']" aria-hidden="true" />
          </template>
          {{ t('standalone.backup_and_restore.backup.run_backup') }}
        </NeButton>
      </div>
      <div class="mt-2 flex justify-center">
        <NeButton kind="tertiary" size="lg" @click="openPassphraseDrawer()">
          {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
        </NeButton>
      </div>
    </NeEmptyState>
  </div>
  <NeModal
    :primary-button-disabled="loadingDownload"
    :primary-button-loading="loadingDownload"
    :primary-label="t('standalone.backup_and_restore.backup.download')"
    :secondary-button-disabled="loadingDownload"
    :title="t('standalone.backup_and_restore.backup.modal_download_title')"
    :visible="showDownloadModal"
    kind="info"
    primary-button-kind="primary"
    @close="showDownloadModal = false"
    @primary-click="downloadBackup()"
  >
    <div>
      {{ t('standalone.backup_and_restore.backup.modal_download_description', { name: unitName }) }}
    </div>
    <NeInlineNotification
      v-if="errorDownloadBackup.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorDownloadBackup.notificationTitle"
      :description="errorDownloadBackup.notificationDescription"
    />
  </NeModal>
  <NeModal
    :primary-button-disabled="loadingRunBackup"
    :primary-button-loading="loadingRunBackup"
    :primary-label="t('standalone.backup_and_restore.backup.run_backup')"
    :secondary-button-disabled="loadingRunBackup"
    :title="t('standalone.backup_and_restore.backup.run_backup')"
    :visible="showRunBackupModal"
    kind="info"
    primary-button-kind="primary"
    @close="showRunBackupModal = false"
    @primary-click="runBackup()"
  >
    <div>
      {{ t('standalone.backup_and_restore.backup.run_backup_description', { name: unitName }) }}
    </div>
    <NeInlineNotification
      v-if="errorRunBackup.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorRunBackup.notificationTitle"
      :description="errorRunBackup.notificationDescription"
    />
  </NeModal>
  <NeSideDrawer :is-shown="showPassphraseDrawer" title="" @close="showPassphraseDrawer = false">
    <div class="space-y-8">
      <NeTitle>{{ t('standalone.backup_and_restore.backup.passphrase_drawer_title') }}</NeTitle>
      <hr />
      <NeTextInput
        v-model="formPassphrase.passphrase"
        :invalid-message="errorSetPassphrase.passphrase"
        :label="t('standalone.backup_and_restore.backup.passphrase')"
        isPassword
        ref="passphraseRef"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.backup_and_restore.backup.passphrase_helper') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeInlineNotification
        v-if="errorSetPassphrase.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorSetPassphrase.notificationTitle"
        :description="errorSetPassphrase.notificationDescription"
      />
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton
          :disabled="loadingSetPassphrase"
          :kind="'tertiary'"
          @click="showPassphraseDrawer = false"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          :disabled="loadingSetPassphrase"
          :kind="'primary'"
          :loading="loadingSetPassphrase"
          @click="setPassphrase()"
        >
          {{ t('common.configure') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
