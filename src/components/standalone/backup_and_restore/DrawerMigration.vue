<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeModal,
  NeTitle,
  NeButton,
  NeFileInput,
  NeSideDrawer,
  NeProgressBar,
  NeInlineNotification,
  getAxiosErrorMessage,
  NeFormItemLabel,
  NeSkeleton,
  NeCombobox
} from '@nethserver/vue-tailwind-lib'
import { validateRequired } from '@/lib/validation'
const { t } = useI18n()

defineProps({
  showMigrationDrawer: {
    type: Boolean,
    required: true
  }
})

defineEmits(['success', 'close'])

//const MIGRATION_WAIT_TIME = 45000

const formMigration = ref({
  file: undefined,
  devices: []
})

let loading = ref(false)
let loadingFile = ref(false)
let loadingMigration = ref(false)
let isMigrating = ref(false)
let migrationProgress = ref(0)
let listDevices = ref([])
let listDevicesMigration = ref([])
//let migrationIntervalRef = ref<number | undefined>()
//let migrationTimeoutRef = ref<number | undefined>()
let fileRef = ref()

let objNotification = {
  notificationTitle: '',
  notificationDescription: '',
  file: ''
}

let error = ref(false)
let errorMigration = ref({ ...objNotification })
let errorMigrationFile = ref({ ...objNotification })
let errorMigrationBackup = ref({ ...objNotification })
let errorLoadDevices = ref({ ...objNotification })

onMounted(() => {
  getListDevices()
})

watch(
  () => formMigration.value.file,
  async () => {
    errorMigrationFile.value = {
      notificationTitle: '',
      notificationDescription: '',
      file: ''
    }
    if (formMigration.value.file) {
      loadingFile.value = true
      await new Promise((resolve: any) => {
        let reader = new FileReader()
        reader.onload = async function (event) {
          if (event?.target?.result) {
            try {
              let payload = {
                archive: String(event.target.result).split(',')[1]
              }

              let res = await ubusCall('ns.migration', 'upload', payload)
              console.log(1, res.data)
              if (res?.data?.devices?.length) {
                listDevicesMigration.value = res.data.devices
              }
            } catch (exception: any) {
              errorMigrationFile.value.notificationTitle = t('error.upload_file_migration')
              errorMigrationFile.value.notificationDescription = t(getAxiosErrorMessage(exception))
            } finally {
              loadingFile.value = false
            }
          }
          resolve()
        }
        if (formMigration.value.file) {
          reader.readAsDataURL(formMigration.value.file)
        }
      })
    }
  }
)

async function getListDevices() {
  loading.value = true
  try {
    let res = await ubusCall('ns.migration', 'list-devices', {})
    console.log(res.data)
    if (res?.data?.devices?.length) {
      listDevices.value = res.data.devices.map((item: any) => ({
        id: item.name,
        label:
          item.name +
          (item.ipaddr ? ' - ' + item.ipaddr : '') +
          (item.role ? ' - ' + item.role : ''),
        role: item.role,
        hwaddr: item.hwaddr
      }))
    }
  } catch (exception: any) {
    error.value = true
    errorLoadDevices.value.notificationTitle = t('error.cannot_retrieve_subscription_info')
    errorLoadDevices.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

function validateRestore(): boolean {
  let isValidationOk = true

  let { valid, errMessage } = validateRequired(
    formMigration?.value?.file ? formMigration.value.file : ''
  )
  if (!valid) {
    errorMigration.value.file = t(errMessage as string)
    isValidationOk = false
  }

  return isValidationOk
}

function clearErrors() {
  errorMigration.value = {
    notificationTitle: '',
    notificationDescription: '',
    file: ''
  }
}

async function startMigration() {
  clearErrors()
  if (validateRestore()) {
    loadingMigration.value = true
    let error = false
    try {
      let payload = {}

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
        if (formMigration.value.file) {
          reader.readAsDataURL(formMigration.value.file)
        }
      })

      if (!error) {
        /*let res = await ubusCall('ns.backup', methodCall, payload)
				if (res?.data?.message && res?.data?.message === 'success') {
					isMigrating.value = true
					showMigrationDrawer.value = false
					setMigrationTimer()
				} */
      } else {
        errorMigrationBackup.value.notificationTitle = t('error.cannot_restore_backup')
      }
    } catch (exception: any) {
      errorMigrationBackup.value.notificationTitle = t('error.cannot_restore_backup')
      errorMigrationBackup.value.notificationDescription = t(getAxiosErrorMessage(exception))
    } finally {
      loadingMigration.value = false
    }
  }
}

/* function setMigrationTimer() {
	migrationTimeoutRef.value = setTimeout(() => {
		location.reload()
	}, MIGRATION_WAIT_TIME)

	migrationIntervalRef.value = setInterval(() => {
		migrationProgress.value += 0.5
	}, MIGRATION_WAIT_TIME / 200)
} */
</script>

<template>
  <div>
    <NeSideDrawer :is-shown="showMigrationDrawer" title="" @close="$emit('close')">
      <NeSkeleton v-if="loading" :lines="5" />
      <NeInlineNotification
        v-if="!loading && errorLoadDevices.notificationTitle"
        class="my-4"
        kind="error"
        :title="errorLoadDevices.notificationTitle"
        :description="errorLoadDevices.notificationDescription"
      />
      <div v-if="!loading && !error" class="space-y-8">
        <NeTitle>{{ t('standalone.backup_and_restore.migration.drawer_title') }}</NeTitle>
        <hr />
        <NeSkeleton v-if="loadingFile" :lines="5" />
        <NeFileInput
          v-if="!loadingFile"
          :label="t('standalone.backup_and_restore.migration.input_upload_file')"
          :dropzoneLabel="
            t('standalone.backup_and_restore.migration.input_upload_file_description')
          "
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
        />
        <template v-if="formMigration.file && !loadingFile && listDevicesMigration.length">
          <div class="space-y-0">
            <NeFormItemLabel>
              {{ t('standalone.backup_and_restore.migration.remap_interfaces') }}
            </NeFormItemLabel>
            <NeInlineNotification
              kind="info"
              :title="t('standalone.backup_and_restore.migration.remap_interfaces_description')"
            />
          </div>
          <div v-for="(deviceMigration, index) in listDevicesMigration" :key="index">
            <NeCombobox
              v-model="formMigration.devices"
              :options="listDevices"
              :label="deviceMigration.name"
              class="grow"
            />
          </div>
        </template>
        <hr />
        <NeInlineNotification
          v-if="errorMigrationBackup.notificationTitle"
          class="my-4"
          kind="error"
          :title="errorMigrationBackup.notificationTitle"
          :description="errorMigrationBackup.notificationDescription"
        />
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
      :primary-label="t('standalone.backup_and_restore.restore.restore_now')"
      :primary-button-loading="isMigrating"
      :primary-button-disabled="isMigrating"
      :title="t('standalone.backup_and_restore.restore.restore')"
      :cancel-label="!isMigrating ? t('common.cancel') : ''"
      :visible="isMigrating"
      kind="warning"
      primary-button-kind="danger"
      @close="isMigrating = false"
    >
      {{ t('standalone.backup_and_restore.restore.restore_in_progress') }}
      <NeProgressBar class="my-4" :progress="migrationProgress" />
    </NeModal>
  </div>
</template>
