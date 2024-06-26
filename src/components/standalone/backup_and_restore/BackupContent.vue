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
  NeTableCell
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import ModalDownloadBackup from '@/components/standalone/backup_and_restore/ModalDownloadBackup.vue'
import ModalRunBackup from '@/components/standalone/backup_and_restore/ModalRunBackup.vue'
import SetPassphraseDrawer from '@/components/standalone/backup_and_restore/SetPassphraseDrawer.vue'
import FormLayout from '@/components/standalone/FormLayout.vue'

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
const unitName = ref('')
const seletedBackup = ref('')
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
    if (res?.data?.systemd_id && res?.data?.active) {
      isEnterprise.value = true
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
  if (isEnterprise.value) {
    try {
      let res = await ubusCall('ns.backup', 'registered-list-backups')
      if (res?.data?.values?.length) {
        listBackups.value = res.data.values
      }
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
    <NeSkeleton v-if="loading || loadingPassphrase" :lines="10" />
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
      <FormLayout
        :description="
          isEnterprise
            ? t('standalone.backup_and_restore.backup.description_entrprise')
            : t('standalone.backup_and_restore.backup.description')
        "
        class="max-w-12xl"
      >
        <div class="flex">
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
      </FormLayout>
    </template>
    <div v-if="!loading && isEnterprise && !errorPage.notificationTitle" class="mt-5">
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
        :ariaLabel="t('standalone.backup_and_restore.backup.backups')"
      >
        <NeTableHead>
          <NeTableHeadCell>{{ t('standalone.backup_and_restore.backup.date') }}</NeTableHeadCell>
          <NeTableHeadCell>
            <!-- no header for actions -->
          </NeTableHeadCell>
        </NeTableHead>
        <NeTableBody>
          <NeTableRow v-for="item in listBackups" :key="item.name">
            <NeTableCell :data-label="t('standalone.backup_and_restore.backup.date')">
              <div>
                <FontAwesomeIcon :icon="['fa', 'clock']" class="mr-2" />
                {{ item.name }}
              </div>
            </NeTableCell>
            <NeTableCell :data-label="t('common.actions')">
              <div class="-ml-2.5 flex items-center md:justify-end xl:ml-0">
                <NeButton :kind="'tertiary'" @click="openDownloadEnterprise(item.file)">
                  <template #prefix>
                    <FontAwesomeIcon :icon="['fas', 'arrow-circle-down']" />
                  </template>
                  {{ t('standalone.backup_and_restore.backup.download') }}
                </NeButton>
              </div>
            </NeTableCell>
          </NeTableRow>
        </NeTableBody>
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
  <SetPassphraseDrawer
    :showPassphraseDrawer="showPassphraseDrawer"
    @success="successSetPassphrase()"
    @close="showPassphraseDrawer = false"
  />
</template>
