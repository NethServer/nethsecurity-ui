<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeTitle,
  NeButton,
  NeTooltip,
  NeCombobox,
  NeSkeleton,
  NeTextInput,
  NeSideDrawer,
  NeRadioSelection,
  NeInlineNotification,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { t } = useI18n()

const formRestore = ref({
  passphrase: '',
  file: '',
  backup: ''
})

let loading = ref(true)
let loadingRestore = ref(false)
let isEnterprise = ref(false)
let isSetPassphrase = ref(false)
let showRestoreDrawer = ref(false)
let typeRestore = ref('upload_file')
let listBackups: any = ref([])
let sourceRestoreOptions = [
  {
    id: 'from_backup',
    label: t('standalone.backup_and_restore.restore.from_backup')
  },
  {
    id: 'upload_file',
    label: t('standalone.backup_and_restore.restore.from_file')
  }
]

let objNotification = {
  notificationTitle: '',
  notificationDescription: '',
  passphrase: ''
}

let error = ref(false)
let errorSubscription = ref({ ...objNotification })
let errorIsPassphrase = ref({ ...objNotification })
let errorRestore = ref({ ...objNotification })
let errorGetBackup = ref({ ...objNotification })

onMounted(() => {
  getSubscription()
  getIsPassphrase()
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
    errorSubscription.value.notificationTitle = t('error.cannot_retrieve_subscription_info')
    errorSubscription.value.notificationDescription = t(getAxiosErrorMessage(exception))
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
    errorIsPassphrase.value.notificationTitle = t('error.cannot_retrieve_passphrase')
    errorIsPassphrase.value.notificationDescription = t(getAxiosErrorMessage(exception))
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
      errorGetBackup.value.notificationTitle = t('error.cannot_retrieve_backup')
      errorGetBackup.value.notificationDescription = t(getAxiosErrorMessage(exception))
    }
  }
}

function restoreBackup() {
  // TODO restoreBackup
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
      v-if="!loading && errorIsPassphrase.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorIsPassphrase.notificationTitle"
      :description="errorIsPassphrase.notificationDescription"
    />
    <NeInlineNotification
      v-if="!loading && errorGetBackup.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorGetBackup.notificationTitle"
      :description="errorGetBackup.notificationDescription"
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
              class="grow"
            />
          </template>
        </template>
        <template v-if="typeRestore === 'upload_file'">
          <!-- TODO UPLOAD FILE -->
          <div>UPLOD FILE</div>
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
            {{ t('standalone.backup_and_restore.restore.restore_button') }}
          </NeButton>
        </div>
      </div>
    </NeSideDrawer>
  </div>
</template>
