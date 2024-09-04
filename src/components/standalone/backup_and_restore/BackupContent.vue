<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage,
  NeEmptyState,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  byteFormat1024,
  formatDateLoc,
  NeDropdown,
  NeBadge
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import DownloadBackupModal from '@/components/standalone/backup_and_restore/DownloadBackupModal.vue'
import RunBackupModal from '@/components/standalone/backup_and_restore/RunBackupModal.vue'
import SetPassphraseDrawer from '@/components/standalone/backup_and_restore/SetPassphraseDrawer.vue'
import FormLayout from '@/components/standalone/FormLayout.vue'
import DeleteBackupModal from '@/components/standalone/backup_and_restore/DeleteBackupModal.vue'

const { t } = useI18n()

interface Backup {
  id: string
  name: string
  created: BigInteger
  size: BigInteger
  mimetype: string
}

const loading = ref(true)
const loadingPassphrase = ref(true)
const isValidSubscription = ref(false)
const isSetPassphrase = ref(false)
const showDownloadModal = ref(false)
const showDeleteModal = ref(false)
const showPassphraseDrawer = ref(false)
const showRunBackupModal = ref(false)
const successNotificationRunBackup = ref(false)
const unitName = ref('')
const selectedBackup = ref('')
const selectedBackupType = ref('')
const selectedBackupId = ref('')
const selectedBackupLabel = ref('')
const selectedBackupTime = ref('')
const listBackups = ref<Backup[]>([])

let errorPage = ref({
  notificationTitle: '',
  notificationDescription: ''
})

onMounted(() => {
  getSubscription()
  getHostname()
  getIsPassphrase()
})

async function getSubscription() {
  try {
    let res = await ubusCall('ns.subscription', 'info', {})
    if (res?.data?.active) {
      isValidSubscription.value = res?.data?.active
      await getBackups()
    }
  } catch (exception: any) {
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
    errorPage.value.notificationTitle = t('error.cannot_retrieve_passphrase')
    errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loadingPassphrase.value = false
  }
}

async function getBackups() {
  if (isValidSubscription.value) {
    try {
      let res = await ubusCall('ns.backup', 'registered-list-backups')
      if (res?.data?.values?.backups?.length) {
        listBackups.value = res.data.values.backups
        // sort by created date in unix timestamp
        listBackups.value.sort((a, b) => Number(b.created) - Number(a.created))
      }
    } catch (exception: any) {
      errorPage.value.notificationTitle = t('error.cannot_retrieve_backup')
      errorPage.value.notificationDescription = t(getAxiosErrorMessage(exception))
    }
  }
}

function openDownloadEnterprise(file: string, type: string, time: string) {
  showDownloadModal.value = true
  selectedBackup.value = file
  selectedBackupType.value = type
  selectedBackupTime.value = time
}

function openDeleteBackup(id: string, label: string) {
  showDeleteModal.value = true
  selectedBackupId.value = id
  selectedBackupLabel.value = label
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

function getMimetypeDescription(mimetype: string) {
  // mimetype: remove application/ prefix
  return mimetype.replace('application/', '')
}

function getMimetypeIcon(mimetype: string) {
  if (mimetype == 'application/pgp-encrypted' || mimetype == 'application/octet-stream') {
    return ['fa', 'lock']
  } else {
    return ['fa', 'unlock']
  }
}

function getDropdownItems(item: Backup) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        openDeleteBackup(
          item.id,
          formatDateLoc(new Date(Number(item.created) * 1000), 'PPpp') +
            ' (' +
            byteFormat1024(item.size) +
            ')'
        )
      }
    }
  ]
}

function successDeleteBackup() {
  showDeleteModal.value = false
  getBackups()
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading || loadingPassphrase" :lines="7" size="lg" />
    <NeInlineNotification
      v-if="!loading && !loadingPassphrase && errorPage.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorPage.notificationTitle"
      :description="errorPage.notificationDescription"
    />
    <NeInlineNotification
      v-if="!loading && !loadingPassphrase && successNotificationRunBackup"
      class="my-4"
      kind="success"
      :title="t('standalone.backup_and_restore.backup.success_run_backup')"
    />
    <template v-if="!loading && !loadingPassphrase && !errorPage.notificationTitle">
      <div
        v-if="isValidSubscription"
        class="flex flex-col items-start justify-between gap-4 xl:flex-row"
      >
        <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.backup_and_restore.backup.description_subscription') }}
        </p>
        <div v-if="listBackups.length" class="flex shrink-0 flex-row-reverse gap-4 xl:flex-row">
          <NeButton kind="tertiary" @click="showPassphraseDrawer = true">
            {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
          </NeButton>
          <NeButton kind="secondary" @click="showRunBackupModal = true">
            <template #prefix>
              <FontAwesomeIcon :icon="['fa', 'play']" aria-hidden="true" />
            </template>
            {{ t('standalone.backup_and_restore.backup.run_backup') }}
          </NeButton>
        </div>
      </div>
      <FormLayout
        v-else
        :description="t('standalone.backup_and_restore.backup.description')"
        class="max-w-12xl"
      >
        <div class="flex gap-4">
          <NeButton kind="secondary" size="lg" type="submit" @click="showDownloadModal = true">
            <template #prefix>
              <FontAwesomeIcon :icon="['fa', 'circle-arrow-down']" />
            </template>
            {{ t('standalone.backup_and_restore.backup.download_backup') }}
          </NeButton>
          <NeButton kind="tertiary" size="lg" @click="showPassphraseDrawer = true">
            {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
          </NeButton>
        </div>
      </FormLayout>
      <NeBadge
        v-if="isSetPassphrase"
        :icon="['fas', 'check']"
        :text="t('standalone.backup_and_restore.backup.passphrase_is_set')"
        kind="success"
      />
    </template>
    <div
      v-if="!loading && !loadingPassphrase && isValidSubscription && !errorPage.notificationTitle"
      class="mt-5"
    >
      <NeEmptyState
        v-if="!listBackups.length"
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
        cardBreakpoint="xl"
        :ariaLabel="t('standalone.backup_and_restore.backup.backups')"
      >
        <NeTableHead>
          <NeTableHeadCell>{{ t('standalone.backup_and_restore.backup.date') }}</NeTableHeadCell>
          <NeTableHeadCell>{{
            t('standalone.backup_and_restore.backup.mimetype')
          }}</NeTableHeadCell>
          <NeTableHeadCell>{{ t('standalone.backup_and_restore.backup.size') }}</NeTableHeadCell>
          <NeTableHeadCell>
            <!-- no header for actions -->
          </NeTableHeadCell>
        </NeTableHead>
        <NeTableBody>
          <NeTableRow v-for="item in listBackups" :key="item.name">
            <NeTableCell :data-label="t('standalone.backup_and_restore.backup.date')">
              <div>
                <FontAwesomeIcon :icon="['fa', 'clock']" class="mr-2" />
                {{ formatDateLoc(new Date(Number(item.created) * 1000), 'PPpp') }}
              </div>
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.backup_and_restore.backup.mimetype')">
              <div>
                <FontAwesomeIcon :icon="getMimetypeIcon(item.mimetype)" class="mr-2" />
                {{
                  t('standalone.backup_and_restore.backup.' + getMimetypeDescription(item.mimetype))
                }}
              </div>
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.backup_and_restore.backup.size')">
              <div>
                {{ byteFormat1024(item.size) }}
              </div>
            </NeTableCell>
            <NeTableCell :data-label="t('common.actions')">
              <div class="-ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
                <NeButton
                  :kind="'tertiary'"
                  @click="openDownloadEnterprise(item.id, item.mimetype, item.created.toString())"
                >
                  <template #prefix>
                    <FontAwesomeIcon :icon="['fas', 'arrow-circle-down']" />
                  </template>
                  {{ t('standalone.backup_and_restore.backup.download') }}
                </NeButton>
                <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
              </div>
            </NeTableCell>
          </NeTableRow>
        </NeTableBody>
      </NeTable>
    </div>
  </div>
  <DownloadBackupModal
    :showDownloadModal="showDownloadModal"
    :isSetPassphrase="isSetPassphrase"
    :isValidSubscription="isValidSubscription"
    :selectedBackupType="selectedBackupType"
    :selectedBackup="selectedBackup"
    :selectedBackupTime="selectedBackupTime"
    :unitName="unitName"
    @close="showDownloadModal = false"
  />
  <RunBackupModal
    :showRunBackupModal="showRunBackupModal"
    :unitName="unitName"
    @success="successRunBackup()"
    @close="showRunBackupModal = false"
  />
  <SetPassphraseDrawer
    :showPassphraseDrawer="showPassphraseDrawer"
    :isSetPassphrase="isSetPassphrase"
    @success="successSetPassphrase()"
    @close="showPassphraseDrawer = false"
  />
  <DeleteBackupModal
    :showDeleteModal="showDeleteModal"
    :selectedBackupId="selectedBackupId"
    :selectedBackupLabel="selectedBackupLabel"
    @close="successDeleteBackup()"
  />
</template>
