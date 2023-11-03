<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeSkeleton
} from '@nethserver/vue-tailwind-lib'
import NeTable from '@/components/standalone/NeTable.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ModalDownloadBackup from '@/components/standalone/backup_and_restore/ModalDownloadBackup.vue'
import ModalRunBackup from '@/components/standalone/backup_and_restore/ModalRunBackup.vue'
import DrawerSetPassphrase from '@/components/standalone/backup_and_restore/DrawerSetPassphrase.vue'

const { t } = useI18n()

interface Backup {
  file: string
  name: string
}

const loading = ref(true)
const loadingPassphrase = ref(true)
const isEnterprise = ref(false)
const isSetPassphrase = ref(false)
const showDownloadModal = ref(false)
const showPassphraseDrawer = ref(false)
const showRunBackupModal = ref(false)
const successNotificationRunBackup = ref(false)
const unitName = ref()
const seletedBackup = ref('')
const listBackups = ref<Backup[]>([])

let error = ref(false)
let errorPage = ref({
  notificationTitle: '',
  notificationDescription: ''
})

onMounted(() => {
  Promise.all([getSubscription(), getHostname(), getIsPassphrase()])
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
    errorPage.value.notificationTitle = t('error.cannot_retrieve_subscription_info')
    errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

async function getHostname() {
  try {
    let systemInfo = await ubusCall('system', 'board')
    unitName.value = systemInfo.data.hostname
  } catch (exception: any) {
    error.value = true
    errorPage.value.notificationTitle = t('error.cannot_retrieve_system_board')
    errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
  }
}

async function getIsPassphrase() {
  isSetPassphrase.value = false
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
    loadingPassphrase.value = false
  }
}

async function getBackups() {
  if (isEnterprise.value) {
    try {
      let res = await ubusCall('ns.backup', 'registered-list-backups')
      console.log(res)
      if (res?.data?.values?.length) listBackups.value = res.data.values
    } catch (exception: any) {
      errorPage.value.notificationTitle = t('error.cannot_retrieve_backup')
      errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
    }
  }
}

function openDownloadEnterprise(file: string) {
  showDownloadModal.value = true
  seletedBackup.value = file
}

function successRunBackup() {
  showRunBackupModal.value = false
  getBackups()
  successNotificationRunBackup.value = true
  setTimeout(function () {
    successNotificationRunBackup.value = false
  }, 5000)
}

function successSetPassphrase() {
  showPassphraseDrawer.value = false
  getIsPassphrase()
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading || loadingPassphrase" :lines="15" />
    <NeInlineNotification
      v-if="!loading && !loadingPassphrase && errorPage.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorPage.notificationTitle"
      :description="errorPage.notificationDescription"
    />
    <template v-if="!loading && !loadingPassphrase && !error">
      <div class="flex">
        <div>
          <p
            v-if="isEnterprise"
            class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400"
          >
            {{ t('standalone.backup_and_restore.backup.description_entrprise') }}
          </p>
          <p v-else class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.backup_and_restore.backup.description') }}
          </p>
        </div>
        <template v-if="isEnterprise">
          <div v-if="listBackups.length" class="ml-auto self-start">
            <NeButton class="mr-2" kind="tertiary" @click="showPassphraseDrawer = true">
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
            <NeButton
              class="mr-2"
              kind="secondary"
              size="lg"
              type="submit"
              @click="showDownloadModal = true"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="['fa', 'circle-arrow-down']" />
              </template>
              {{ t('standalone.backup_and_restore.backup.download_backup') }}
            </NeButton>
            <NeButton kind="tertiary" size="lg" @click="showPassphraseDrawer = true">
              {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
            </NeButton>
          </div>
        </template>
      </div>
    </template>
    <NeInlineNotification
      v-if="!loading && !loadingPassphrase && successNotificationRunBackup"
      class="my-4"
      kind="success"
      :title="t('standalone.backup_and_restore.backup.success_run_backup')"
    />
    <div v-if="!loading && isEnterprise && !error" class="mt-5">
      <NeEmptyState
        v-if="!listBackups.length && !errorPage.notificationTitle"
        :title="t('standalone.backup_and_restore.backup.no_backups_found')"
        :icon="['fa', 'box-archive']"
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
          <NeButton kind="tertiary" size="lg" @click="showPassphraseDrawer = true">
            {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
          </NeButton>
        </div>
      </NeEmptyState>
      <NeTable
        v-if="listBackups.length"
        :data="listBackups"
        :headers="[
          {
            key: 'name',
            label: 'Date'
          },
          {
            key: 'actions'
          }
        ]"
      >
        <template #name="{ item }">
          <div>
            <FontAwesomeIcon :icon="['fa', 'clock']" class="mr-2" />
            {{ item.name }}
          </div>
        </template>
        <template #actions="{ item }">
          <div class="flex items-center justify-end">
            <NeButton :kind="'tertiary'" @click="openDownloadEnterprise(item.file)">
              <template #prefix>
                <FontAwesomeIcon :icon="['fas', 'arrow-circle-down']" />
              </template>
              {{ t('standalone.backup_and_restore.backup.download') }}
            </NeButton>
          </div>
        </template>
      </NeTable>
    </div>
  </div>
  <ModalDownloadBackup
    :showDownloadModal="showDownloadModal"
    :isSetPassphrase="isSetPassphrase"
    :seletedBackup="seletedBackup"
    :unitName="unitName"
    @close="showDownloadModal = false"
  />
  <ModalRunBackup
    :showRunBackupModal="showRunBackupModal"
    :unitName="unitName"
    @success="successRunBackup()"
    @close="showRunBackupModal = false"
  />
  <DrawerSetPassphrase
    :showPassphraseDrawer="showPassphraseDrawer"
    @success="successSetPassphrase()"
    @close="showPassphraseDrawer = false"
  />
</template>
