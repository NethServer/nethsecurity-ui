<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeHeading,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import CertificatesTable from '@/components/standalone/certificates/CertificatesTable.vue'
import DeleteCertificateModal from '@/components/standalone/certificates/DeleteCertificateModal.vue'
import ImportCertificateDrawer from '@/components/standalone/certificates/ImportCertificateDrawer.vue'
import CreateLetsEncryptCertificateDrawer from '@/components/standalone/certificates/CreateLetsEncryptCertificateDrawer.vue'
import { useNotificationsStore } from '@/stores/notifications'
import { onMounted } from 'vue'
import { map } from 'lodash-es'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

export type Certificate = {
  name: string
  type: 'self-signed' | 'custom' | 'acme'
  path: string
  details: string
  default: boolean
  domain: string
  expiration?: string
  requested_domains?: string[]
  pending?: boolean
  servers: string[]
}

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const uciChangesStore = useUciPendingChangesStore()

const certificates = ref<Certificate[]>([])
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const loading = ref(true)
const fetchError = ref(false)
const selectedCertificate = ref<Certificate>()
const showDeleteCertificateModal = ref(false)
const showCreateCertificateDrawer = ref(false)
const showImportCertificateDrawer = ref(false)
const showCertificateDetailsModal = ref(false)

function clearError() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
}

function openDeleteCertificateModal(itemToDelete: Certificate) {
  selectedCertificate.value = itemToDelete
  showDeleteCertificateModal.value = true
}

function openCertificateDetailsModal(item: Certificate) {
  selectedCertificate.value = item
  showCertificateDetailsModal.value = true
}

async function fetchCertificates() {
  clearError()

  try {
    loading.value = true
    const certificatesData: Record<string, any> = (
      await ubusCall('ns.reverseproxy', 'list-certificates')
    ).data.values
    certificates.value = map(certificatesData, (payload: any, certificateName: string) => ({
      ...payload,
      name: certificateName
    }))
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_certificates')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    fetchError.value = true
  } finally {
    loading.value = false
  }
}

async function setDefaultCertificate(item: Certificate) {
  clearError()

  try {
    await ubusCall('ns.reverseproxy', 'set-default-certificate', {
      name: item.name
    })
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_set_default_certificate')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    return
  }

  await uciChangesStore.getChanges()
  await fetchCertificates()
}

onMounted(() => {
  fetchCertificates()
})
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.certificates.title') }}</NeHeading>
  <div class="flex flex-col gap-y-6">
    <NeInlineNotification
      v-if="error.notificationDescription"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >
    <NeSkeleton v-if="loading" size="lg" :lines="8" />
    <template v-else-if="!fetchError">
      <div class="flex flex-col items-start justify-between gap-4 xl:flex-row">
        <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.certificates.description') }}
        </p>
        <div class="flex shrink-0 flex-row-reverse gap-4 xl:flex-row">
          <NeButton kind="tertiary" @click="showImportCertificateDrawer = true"
            ><template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-arrow-up']"
                class="h-4 w-4"
                aria-hidden="true"
              /> </template
            >{{ t('standalone.certificates.import_certificate') }}</NeButton
          >
          <NeButton kind="secondary" @click="showCreateCertificateDrawer = true"
            ><template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-plus']"
                class="h-4 w-4"
                aria-hidden="true"
              /> </template
            >{{ t('standalone.certificates.add_lets_encrypt_certificate') }}</NeButton
          >
        </div>
      </div>
      <CertificatesTable
        :certificates="certificates"
        @delete="openDeleteCertificateModal"
        @set-as-default="setDefaultCertificate"
        @show-certificate="openCertificateDetailsModal"
      />
    </template>
  </div>
  <DeleteCertificateModal
    :visible="showDeleteCertificateModal"
    :item-to-delete="selectedCertificate"
    @certificate-deleted="
      () => {
        notificationsStore.addNotification({
          id: 'delete_certificate',
          kind: 'success',
          title: t('standalone.certificates.certificate_deleted')
        })
        fetchCertificates()
      }
    "
    @close="showDeleteCertificateModal = false"
  />
  <ImportCertificateDrawer
    :is-shown="showImportCertificateDrawer"
    @close="showImportCertificateDrawer = false"
    @certificate-imported="
      () => {
        notificationsStore.addNotification({
          id: 'import_certificate',
          kind: 'success',
          title: t('standalone.certificates.certificate_imported')
        })
        fetchCertificates()
      }
    "
  />
  <CreateLetsEncryptCertificateDrawer
    :is-shown="showCreateCertificateDrawer"
    @add-certificate="
      () => {
        uciChangesStore.getChanges()
        fetchCertificates()
      }
    "
    @close="showCreateCertificateDrawer = false"
  />
  <NeModal
    kind="info"
    :visible="showCertificateDetailsModal"
    @close="showCertificateDetailsModal = false"
    :primary-label="t('common.close')"
    @primary-click="showCertificateDetailsModal = false"
    :close-aria-label="t('common.close')"
    :title="selectedCertificate?.name"
    cancel-label=""
    size="xxl"
  >
    <p class="mb-2 font-semibold">{{ t('standalone.certificates.certificate') }}</p>
    <p
      class="h-80 w-full min-w-0 resize-y overflow-auto whitespace-pre rounded-md border border-gray-700 p-3 font-mono"
    >
      {{ selectedCertificate?.details }}
    </p>
  </NeModal>
</template>
