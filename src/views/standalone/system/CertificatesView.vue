<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeTitle,
  NeButton,
  getAxiosErrorMessage,
  NeSkeleton,
  NeInlineNotification
} from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import CertificatesTable from '@/components/standalone/certificates/CertificatesTable.vue'
import DeleteCertificateModal from '@/components/standalone/certificates/DeleteCertificateModal.vue'
import ImportCertificateDrawer from '@/components/standalone/certificates/ImportCertificateDrawer.vue'

export type Certificate = {
  type: string
  path: string
  default: boolean
  domains: string[]
  expired: boolean
  expiration: number
}

const { t } = useI18n()

const certificates = ref<Certificate[]>([
  {
    type: 'acme',
    path: '/etc/nginx/conf.d/test.crt',
    default: true,
    domains: ['a.b.c', 'd.e.f'],
    expired: false,
    expiration: 1705762469
  }
])
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const loading = ref(false)
const fetchError = ref(false)
const selectedCertificate = ref<Certificate>()
const showDeleteCertificateModal = ref(false)
const showCreateOrEditCertificateDrawer = ref(false)
const showImportCertificateDrawer = ref(false)

function openCreateEditCertificateDrawer(itemToEdit?: Certificate) {
  selectedCertificate.value = itemToEdit
  showCreateOrEditCertificateDrawer.value = true
}

function openDeleteCertificateModal(itemToDelete: Certificate) {
  selectedCertificate.value = itemToDelete
  showDeleteCertificateModal.value = true
}

async function fetchCertificates() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''

  try {
    loading.value = true
    certificates.value = (await ubusCall('ns.reverseproxy', 'list-certificates')).data.rules
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_certificates')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
    fetchError.value = true
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <NeTitle>{{ t('standalone.certificates.title') }}</NeTitle>
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
    <NeSkeleton v-if="loading" :lines="15" />
    <template v-else-if="!fetchError">
      <div class="flex flex-row items-center justify-between">
        <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.certificates.description') }}
        </p>
        <div class="flex flex-row">
          <NeButton class="mr-2" kind="tertiary" @click="showImportCertificateDrawer = true"
            ><template #prefix>
              <font-awesome-icon
                :icon="['fas', 'circle-arrow-up']"
                class="h-4 w-4"
                aria-hidden="true"
              /> </template
            >{{ t('standalone.certificates.import_certificate') }}</NeButton
          >
          <NeButton
            kind="secondary"
            @click="
              () => {
                openCreateEditCertificateDrawer()
              }
            "
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
        @show-certificate="(_) => {}"
        @edit="openCreateEditCertificateDrawer"
      />
    </template>
  </div>
  <DeleteCertificateModal
    :visible="showDeleteCertificateModal"
    :item-to-delete="selectedCertificate"
    @certificate-deleted="() => {}"
    @close="showDeleteCertificateModal = false"
  />
  <ImportCertificateDrawer
    :is-shown="showImportCertificateDrawer"
    @close="showImportCertificateDrawer = false"
    @certificate-imported="() => {}"
  />
</template>
