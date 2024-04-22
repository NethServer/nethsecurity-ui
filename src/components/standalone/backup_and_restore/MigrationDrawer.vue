<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeCombobox,
  NeFileInput,
  NeProgressBar,
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeSkeleton,
  NeFormItemLabel,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { validateFile, validateRequired } from '@/lib/validation'
import { useTimer } from '@/composables/useTimer'
import { uploadFile } from '@/lib/standalone/fileUpload'
const { t } = useI18n()

const props = defineProps({
  showMigrationDrawer: {
    type: Boolean,
    required: true
  }
})

const MIGRATION_WAIT_TIME = 25000
const emit = defineEmits(['success', 'close'])
const formMigration = ref<{ file?: File; devices: any[] }>({
  file: undefined,
  devices: []
})

const loading = ref(false)
const loadingMigration = ref(false)
const isMigrating = ref(false)
const listDevices = ref<{ id: string; label: string; role: string; hwaddr: string }[]>([])
const listDevicesMigration = ref([
  {
    id: '',
    label: '',
    selected: '',
    ipaddr: ''
  }
])
const migrationIntervalRef = ref<number | undefined>()
const fileRef = ref()

const uploadProgress = ref(0)
const isUploadingMigrationFile = ref(false)
const uploadedMigrationFileName = ref('')

const { startTimer, currentProgress, clearTimer } = useTimer({
  duration: MIGRATION_WAIT_TIME,
  progressStep: 0.5,
  onTimerFinish: () => {
    isMigrating.value = false
  }
})

let errorMigration = ref({
  file: '',
  devices: ['']
})
let errorMigrationFile = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
let errorMigrationBackup = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
let errorLoadDevices = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

async function handleFileUpload() {
  errorMigration.value.file = ''
  isUploadingMigrationFile.value = false

  if (!formMigration.value.file) {
    return
  }
  const fileValidation = validateFile(formMigration.value.file as File | null, 'tar.gz')
  if (!fileValidation.valid) {
    errorMigration.value.file = t(fileValidation.errMessage as string)
    return
  }

  try {
    uploadProgress.value = 0.1
    isUploadingMigrationFile.value = true
    const uploadResult = await uploadFile(formMigration.value.file as File, (e) => {
      uploadProgress.value = (e.progress as number) * 100
    })
    uploadedMigrationFileName.value = uploadResult.data.data

    let res = await ubusCall('ns.migration', 'list-source-devices', {
      archive: uploadedMigrationFileName.value
    })
    if (res?.data?.devices?.length) {
      listDevicesMigration.value = res.data.devices.map((item: any) => ({
        id: item.hwaddr,
        selected: undefined,
        ipaddr: item.ipaddr,
        label:
          item.name +
          (item.ipaddr ? ' - ' + item.ipaddr : '') +
          (item.role ? ' - ' + item.role : '')
      }))
    }
  } catch (err: any) {
    errorMigrationFile.value.notificationTitle = t('error.upload_file_migration')
    errorMigrationFile.value.notificationDescription = t(getAxiosErrorMessage(err))
    errorMigrationFile.value.notificationDetails = err.toString()
  } finally {
    isUploadingMigrationFile.value = false
  }
}

onMounted(() => {
  getListDevices()
})

async function getListDevices() {
  loading.value = true
  try {
    let res = await ubusCall('ns.migration', 'list-target-devices', {})
    if (res?.data?.devices?.length) {
      listDevices.value = res.data.devices.map((item: any) => ({
        id: item.hwaddr,
        label:
          item.name +
          (item.ipaddr ? ' - ' + item.ipaddr : '') +
          (item.role ? ' - ' + item.role : ''),
        role: item.role,
        hwaddr: item.hwaddr
      }))
    }
  } catch (exception: any) {
    errorLoadDevices.value.notificationTitle = t('error.cannot_retrieve_devices')
    errorLoadDevices.value.notificationDescription = t(getAxiosErrorMessage(exception))
    errorLoadDevices.value.notificationDetails = exception.toString()
  } finally {
    loading.value = false
  }
}

function validateMigration(): boolean {
  let isValidationOk = true

  let { valid, errMessage } = validateRequired(
    formMigration?.value?.file ? formMigration.value.file.name : ''
  )
  if (!valid) {
    errorMigration.value.file = t(errMessage as string)
    isValidationOk = false
  }

  if (listDevicesMigration.value.length) {
    for (let [index, item] of listDevicesMigration.value.entries()) {
      if (!item.selected) {
        let { valid, errMessage } = validateRequired(item.selected)
        if (!valid) {
          errorMigration.value.devices[index] = t(errMessage as string)
          isValidationOk = false
        }
      }
    }
  }

  return isValidationOk
}

function clearErrors() {
  migrationIntervalRef.value = undefined
  currentProgress.value = 0
  errorMigration.value = {
    file: '',
    devices: ['']
  }
}

async function startMigration() {
  clearErrors()
  if (validateMigration()) {
    loadingMigration.value = true
    try {
      let devices = []
      if (listDevicesMigration.value.length) {
        for (let item of listDevicesMigration.value) {
          devices.push({
            old: item.id,
            new: item.selected
          })
        }
      }

      let payload = {
        mappings: devices,
        archive: uploadedMigrationFileName.value
      }

      emit('close')
      isMigrating.value = true
      startTimer()

      let res = await ubusCall('ns.migration', 'migrate', payload)
      if (res?.data?.result && res?.data?.result === 'success') {
        isMigrating.value = false
        clearTimer()
        emit('success')
      }
    } catch (exception: any) {
      errorMigrationBackup.value.notificationTitle = t('error.cannot_migrate')
      errorMigrationBackup.value.notificationDescription = t(getAxiosErrorMessage(exception))
      errorMigrationBackup.value.notificationDetails = exception.toString()
    } finally {
      loadingMigration.value = false
    }
  }
}

watch(
  () => props.showMigrationDrawer,
  () => {
    if (props.showMigrationDrawer) {
      clearErrors()
      formMigration.value = {
        file: undefined,
        devices: []
      }
    }
  }
)
</script>

<template>
  <div>
    <NeSideDrawer
      :is-shown="showMigrationDrawer"
      :title="t('standalone.backup_and_restore.migration.drawer_title')"
      @close="$emit('close')"
    >
      <NeSkeleton v-if="loading" :lines="5" />
      <NeInlineNotification
        v-if="!loading && errorLoadDevices.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorLoadDevices.notificationTitle"
        :description="errorLoadDevices.notificationDescription"
      >
        <template v-if="errorLoadDevices.notificationDetails" #details>
          {{ errorLoadDevices.notificationDetails }}
        </template>
      </NeInlineNotification>
      <div v-if="!loading && !errorLoadDevices.notificationTitle" class="space-y-5">
        <NeSkeleton v-if="isUploadingMigrationFile" :lines="5" />
        <NeFileInput
          v-else
          :label="t('standalone.backup_and_restore.migration.input_upload_file')"
          :progress="uploadProgress"
          @select="handleFileUpload"
          :dropzoneLabel="t('ne_file_input.dropzone_label')"
          :invalid-message="errorMigration.file"
          v-model="formMigration.file"
          ref="fileRef"
        />
        <NeInlineNotification
          v-if="errorMigrationFile.notificationTitle"
          class="my-4"
          kind="error"
          :title="errorMigrationFile.notificationTitle"
          :description="errorMigrationFile.notificationDescription"
        >
          <template v-if="errorMigrationFile.notificationDetails" #details>
            {{ errorMigrationFile.notificationDetails }}
          </template>
        </NeInlineNotification>
        <template
          v-if="formMigration.file && !isUploadingMigrationFile && listDevicesMigration.length"
        >
          <div>
            <NeFormItemLabel>
              {{ t('standalone.backup_and_restore.migration.remap_interfaces') }}
            </NeFormItemLabel>
          </div>
          <div v-for="(deviceMigration, index) in listDevicesMigration" :key="index">
            <div class="flex items-center">
              <div class="flex-grow">
                <NeTextInput v-model="deviceMigration.label" disabled />
              </div>
              <div class="px-3 text-center text-sm">
                {{ t('standalone.backup_and_restore.migration.to') }}
              </div>
              <div class="flex-grow">
                <NeCombobox
                  v-model="deviceMigration.selected"
                  class="grow"
                  :options="listDevices"
                  :invalid-message="errorMigration.devices[index]"
                  :ref="'deviceMigration' + index"
                  :noResultsLabel="t('ne_combobox.no_results')"
                  :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
                  :noOptionsLabel="t('ne_combobox.no_options_label')"
                  :selected-label="t('ne_combobox.selected')"
                  :user-input-label="t('ne_combobox.user_input_label')"
                  :optionalLabel="t('common.optional')"
                />
              </div>
            </div>
          </div>
          <NeInlineNotification
            kind="info"
            :title="t('standalone.backup_and_restore.migration.remap_interfaces_description')"
          />
        </template>
        <hr />
        <NeInlineNotification
          v-if="errorMigrationBackup.notificationTitle"
          class="my-4"
          kind="error"
          :title="errorMigrationBackup.notificationTitle"
          :description="errorMigrationBackup.notificationDescription"
        >
          <template v-if="errorMigrationBackup.notificationDetails" #details>
            {{ errorMigrationBackup.notificationDetails }}
          </template>
        </NeInlineNotification>
        <div class="flex justify-end gap-4">
          <NeButton :disabled="loadingMigration" :kind="'tertiary'" @click="$emit('close')">
            {{ t('common.cancel') }}
          </NeButton>
          <NeButton
            :disabled="loadingMigration"
            :kind="'primary'"
            :loading="loadingMigration"
            @click="startMigration()"
          >
            {{ t('standalone.backup_and_restore.migration.migrate') }}
          </NeButton>
        </div>
      </div>
    </NeSideDrawer>
    <NeModal
      :primary-label="t('common.cancel')"
      :primary-button-disabled="true"
      :title="t('standalone.backup_and_restore.migration.migrate')"
      :visible="isMigrating"
      cancel-label=""
      kind="warning"
      primary-button-kind="danger"
    >
      {{ t('standalone.backup_and_restore.migration.migration_in_progress') }}
      {{
        // this list contains all the ip addresses chosen by the user, without duplicates
        [...new Set(listDevicesMigration.map((device) => device.ipaddr).filter(Boolean))].join(', ')
      }}
      <NeProgressBar class="my-4" :progress="currentProgress" />
    </NeModal>
  </div>
</template>
