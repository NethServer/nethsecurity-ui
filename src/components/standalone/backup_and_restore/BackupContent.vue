<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  byteFormat1024,
  formatDateLoc,
  getAxiosErrorMessage,
  NeBadge,
  NeButton,
  NeDropdown,
  NeEmptyState,
  NeInlineNotification,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import DownloadBackupModal from '@/components/standalone/backup_and_restore/DownloadBackupModal.vue'
import RunBackupModal from '@/components/standalone/backup_and_restore/RunBackupModal.vue'
import SetPassphraseDrawer from '@/components/standalone/backup_and_restore/SetPassphraseDrawer.vue'
import FormLayout from '@/components/standalone/FormLayout.vue'
import DeleteBackupModal from '@/components/standalone/backup_and_restore/DeleteBackupModal.vue'
import {
  faArrowCircleDown,
  faBoxArchive,
  faCheck,
  faChevronDown,
  faCircleMinus,
  faClock,
  faCog,
  faEdit,
  faLock,
  faPlay,
  faTrash,
  faUnlock,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import { useBackupsStore } from '@/stores/standalone/backups.ts'
import { useSubscriptionStore } from '@/stores/standalone/subscription.ts'
import DeletePassphraseModal from '@/components/standalone/backup_and_restore/DeletePassphraseModal.vue'

const { t } = useI18n()
const backups = useBackupsStore()
const subscription = useSubscriptionStore()

interface Backup {
  id: string
  name: string
  created: BigInteger
  size: number
  mimetype: string
}

const loading = computed((): boolean => {
  return [subscription.loading, backups.loading, loadingHostname.value, loadingBackups.value].some(
    (loading) => loading
  )
})

const error = computed((): Error | undefined => {
  return [
    subscription.error,
    backups.error,
    errorFetchBackups.value,
    errorFetchHostname.value
  ].find((error) => error != undefined)
})

const loadingBackups = ref(false)
const errorFetchBackups = ref<Error>()
const loadingHostname = ref(false)
const errorFetchHostname = ref<Error>()

const showDownloadModal = ref(false)
const downloadUnencrypted = ref(false)
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
const showPassphraseModal = ref(false)

onMounted(() => {
  getHostname()
})

watch(
  () => subscription.isActive,
  function (value) {
    if (value) {
      getBackups()
    }
  },
  { immediate: true }
)

async function getHostname() {
  try {
    loadingHostname.value = true
    const systemInfo = await ubusCall('system', 'board')
    unitName.value = systemInfo.data.hostname
  } catch (exception: unknown) {
    if (exception instanceof Error) {
      errorFetchHostname.value = exception
    }
  } finally {
    loadingHostname.value = false
  }
}

async function getBackups() {
  if (subscription.isActive) {
    loadingBackups.value = true
    try {
      const res = await ubusCall('ns.backup', 'registered-list-backups')
      if (res?.data?.values?.backups?.length) {
        listBackups.value = res.data.values.backups
        // sort by created date in unix timestamp
        listBackups.value.sort((a, b) => Number(b.created) - Number(a.created))
      }
    } catch (exception: unknown) {
      if (exception instanceof Error) {
        errorFetchBackups.value = exception
      }
    } finally {
      loadingBackups.value = false
    }
  }
}

function closeDownloadModal() {
  showDownloadModal.value = false
  downloadUnencrypted.value = false
}

function openDownloadEnterprise(file: string, type: string, time: string) {
  showDownloadModal.value = true
  selectedBackup.value = file
  selectedBackupType.value = type
  selectedBackupTime.value = time
}

function openDownloadUnencryptedModal() {
  downloadUnencrypted.value = true
  showDownloadModal.value = true
  selectedBackup.value = ''
  selectedBackupType.value = ''
  selectedBackupTime.value = ''
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
}

function getMimetypeDescription(mimetype: string) {
  // mimetype: remove application/ prefix
  return mimetype.replace('application/', '')
}

function getMimetypeIcon(mimetype: string) {
  if (mimetype == 'application/pgp-encrypted' || mimetype == 'application/octet-stream') {
    return faLock
  } else {
    return faUnlock
  }
}

function getDropdownItems(item: Backup) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      icon: faTrash,
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
    <NeInlineNotification
      v-if="successNotificationRunBackup"
      :title="t('standalone.backup_and_restore.backup.success_run_backup')"
      class="my-4"
      kind="success"
    />
    <NeSkeleton v-if="loading" :lines="7" size="lg" />
    <NeInlineNotification
      v-else-if="error != undefined"
      :description="t(getAxiosErrorMessage(error))"
      class="my-4"
      kind="error"
    >
      <template #title>
        <template v-if="subscription.error != undefined">
          {{ t('error.cannot_retrieve_subscription_info') }}
        </template>
        <template v-else-if="backups.error != undefined">
          {{ t('error.cannot_retrieve_backup_info') }}
        </template>
        <template v-else-if="errorFetchBackups != undefined">
          {{ t('error.cannot_retrieve_backup') }}
        </template>
        <template v-else-if="errorFetchHostname != undefined">
          {{ t('error.cannot_retrieve_system_board') }}
        </template>
        <template v-else>
          {{ t('error.generic_error') }}
        </template>
      </template>
    </NeInlineNotification>
    <template v-else>
      <div v-if="subscription.isActive" class="flex flex-col flex-wrap gap-4 xl:flex-row">
        <div class="mr-auto max-w-2xl space-y-4">
          <p class="text-sm font-normal text-secondary-neutral">
            {{ t('standalone.backup_and_restore.backup.description_subscription') }}
          </p>
          <template v-if="!backups.isPassPhraseSet">
            <NeInlineNotification
              v-if="listBackups.length > 0"
              :description="t('standalone.backup_and_restore.backup.backups_require_a_passphrase')"
              :title="t('standalone.backup_and_restore.backup.passphrase_not_configured')"
              kind="warning"
              :primary-button-label="t('standalone.backup_and_restore.backup.configure_passphrase')"
              @primary-click="showPassphraseDrawer = true"
            />
            <NeInlineNotification
              v-else
              :description="t('standalone.backup_and_restore.backup.backups_require_a_passphrase')"
              :title="t('standalone.backup_and_restore.backup.passphrase_not_configured')"
              kind="warning"
            />
          </template>
          <NeBadge
            v-if="backups.isPassPhraseSet"
            :icon="faCheck"
            :text="t('standalone.backup_and_restore.backup.passphrase_is_set')"
            kind="success"
          />
        </div>
        <div class="flex flex-col items-start gap-4 xl:items-end">
          <div
            v-if="listBackups.length > 0 || backups.isPassPhraseSet"
            class="flex flex-wrap gap-4"
          >
            <NeButton
              v-if="!backups.isPassPhraseSet"
              kind="tertiary"
              size="lg"
              @click="showPassphraseDrawer = true"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="faCog" aria-hidden="true" />
              </template>
              {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
            </NeButton>
            <NeDropdown
              v-if="backups.isPassPhraseSet"
              :items="[
                {
                  id: 'edit',
                  label: t('standalone.backup_and_restore.backup.edit_passphrase'),
                  icon: faEdit,
                  action: () => (showPassphraseDrawer = true)
                },
                {
                  id: 'delete',
                  label: t('standalone.backup_and_restore.backup.remove_passphrase'),
                  icon: faCircleMinus,
                  action: () => (showPassphraseModal = true)
                }
              ]"
              align-to-right
            >
              <template #button>
                <NeButton size="lg">
                  <template #suffix>
                    <FontAwesomeIcon :icon="faChevronDown" class="h-4 w-4" aria-hidden="true" />
                  </template>
                  {{ t('standalone.backup_and_restore.backup.manage_passphrase') }}
                </NeButton>
              </template>
            </NeDropdown>
            <NeButton kind="secondary" size="lg" @click="openDownloadUnencryptedModal">
              <template #prefix>
                <FontAwesomeIcon :icon="faArrowCircleDown" />
              </template>
              {{ t('standalone.backup_and_restore.backup.download_unencrypted') }}
            </NeButton>
            <NeButton
              v-if="listBackups.length > 0"
              :disabled="!backups.isPassPhraseSet"
              kind="primary"
              size="lg"
              @click="showRunBackupModal = true"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="faPlay" aria-hidden="true" />
              </template>
              {{ t('standalone.backup_and_restore.backup.run_cloud_backup') }}
            </NeButton>
          </div>
        </div>
      </div>
      <div v-else class="max-w-3xl space-y-6">
        <FormLayout
          :title="t('standalone.backup_and_restore.backup.title')"
          :description="t('standalone.backup_and_restore.backup.description')"
        >
          <div class="flex flex-wrap gap-4">
            <NeButton kind="secondary" size="lg" @click="openDownloadUnencryptedModal">
              <template #prefix>
                <FontAwesomeIcon :icon="faUnlock" />
              </template>
              {{ t('standalone.backup_and_restore.backup.download_unencrypted') }}
            </NeButton>
            <NeButton
              kind="primary"
              size="lg"
              :disabled="!backups.isPassPhraseSet"
              @click="showDownloadModal = true"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="faLock" />
              </template>
              {{ t('standalone.backup_and_restore.backup.download_encrypted') }}
            </NeButton>
          </div>
        </FormLayout>
        <hr />
        <FormLayout
          :title="t('standalone.backup_and_restore.passphrase.title')"
          :description="t('standalone.backup_and_restore.passphrase.description')"
        >
          <div class="space-y-4">
            <NeBadge
              v-if="backups.isPassPhraseSet"
              :icon="faCheck"
              :text="t('standalone.backup_and_restore.backup.passphrase_is_set')"
              kind="success"
              size="xs"
            />
            <NeBadge
              v-else
              :icon="faXmark"
              :text="t('standalone.backup_and_restore.backup.passphrase_not_configured')"
              kind="secondary"
              size="xs"
            />
            <div class="flex flex-wrap gap-4">
              <NeButton kind="secondary" size="lg" @click="showPassphraseDrawer = true">
                <template #prefix>
                  <FontAwesomeIcon v-if="backups.isPassPhraseSet" :icon="faEdit" />
                  <FontAwesomeIcon v-else :icon="faCog" />
                </template>
                <template v-if="backups.isPassPhraseSet">
                  {{ t('standalone.backup_and_restore.backup.edit_passphrase') }}
                </template>
                <template v-else>
                  {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
                </template>
              </NeButton>
              <NeButton
                v-if="backups.isPassPhraseSet"
                kind="tertiary"
                size="lg"
                @click="showPassphraseModal = true"
              >
                {{ t('standalone.backup_and_restore.backup.remove_passphrase') }}
              </NeButton>
            </div>
          </div>
        </FormLayout>
      </div>
    </template>
    <!-- No clue why this double check, however table formats bad if merged with the above template -->
    <div v-if="!loading && subscription.isActive" class="mt-4">
      <NeEmptyState
        v-if="!listBackups.length"
        :description="
          backups.isPassPhraseSet
            ? t('standalone.backup_and_restore.backup.the_system_will_automatically_create_backups')
            : t('standalone.backup_and_restore.backup.configure_passphrase_to_run')
        "
        :icon="faBoxArchive"
        :title="t('standalone.backup_and_restore.backup.no_backups')"
      >
        <div class="flex justify-center">
          <NeButton
            v-if="!backups.isPassPhraseSet"
            kind="primary"
            size="lg"
            @click="showPassphraseDrawer = true"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faCog" aria-hidden="true" />
            </template>
            {{ t('standalone.backup_and_restore.backup.configure_passphrase') }}
          </NeButton>
          <NeButton v-else kind="secondary" size="lg" @click="showRunBackupModal = true">
            <template #prefix>
              <FontAwesomeIcon :icon="faPlay" aria-hidden="true" />
            </template>
            {{ t('standalone.backup_and_restore.backup.run_backup') }}
          </NeButton>
        </div>
      </NeEmptyState>
      <NeTable
        v-if="listBackups.length"
        card-breakpoint="xl"
        :aria-label="t('standalone.backup_and_restore.backup.backups')"
      >
        <NeTableHead>
          <NeTableHeadCell>{{ t('standalone.backup_and_restore.backup.date') }}</NeTableHeadCell>
          <NeTableHeadCell>
            {{ t('standalone.backup_and_restore.backup.mimetype') }}
          </NeTableHeadCell>
          <NeTableHeadCell>{{ t('standalone.backup_and_restore.backup.size') }}</NeTableHeadCell>
          <NeTableHeadCell>
            <!-- no header for actions -->
          </NeTableHeadCell>
        </NeTableHead>
        <NeTableBody>
          <NeTableRow v-for="item in listBackups" :key="item.name">
            <NeTableCell :data-label="t('standalone.backup_and_restore.backup.date')">
              <div>
                <FontAwesomeIcon :icon="faClock" class="mr-2" />
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
                    <FontAwesomeIcon :icon="faArrowCircleDown" />
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
    :show-download-modal="showDownloadModal"
    :is-set-passphrase="backups.isPassPhraseSet"
    :is-valid-subscription="subscription.isActive"
    :selected-backup-type="selectedBackupType"
    :selected-backup="selectedBackup"
    :selected-backup-time="selectedBackupTime"
    :unit-name="unitName"
    :unencrypted="downloadUnencrypted"
    @close="closeDownloadModal()"
  />
  <RunBackupModal
    :show-run-backup-modal="showRunBackupModal"
    :unit-name="unitName"
    @success="successRunBackup()"
    @close="showRunBackupModal = false"
  />
  <SetPassphraseDrawer
    :show-passphrase-drawer="showPassphraseDrawer"
    @success="successSetPassphrase()"
    @close="showPassphraseDrawer = false"
  />
  <DeleteBackupModal
    :show-delete-modal="showDeleteModal"
    :selected-backup-id="selectedBackupId"
    :selected-backup-label="selectedBackupLabel"
    @close="successDeleteBackup()"
  />
  <DeletePassphraseModal
    v-if="backups.isPassPhraseSet"
    :visible="showPassphraseModal"
    @success="
      () => {
        backups.loadData()
        showPassphraseModal = false
      }
    "
    @close="showPassphraseModal = false"
  />
</template>
