<script lang="ts" setup>
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeTitle,
  getAxiosErrorMessage,
  NeInlineNotification,
  NeRadioSelection,
  NeModal,
  NeButton,
  NeSkeleton
} from '@nethserver/vue-tailwind-lib'
import { computed, onMounted } from 'vue'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

type Storage = {
  name: string | null
  size: string | null
  path: string | null
  model: string | null
  vendor: string | null
}

const loading = ref(true)
const isConfiguringOrRemovingStorage = ref(false)
const error = ref({
  fetchError: '',
  modalError: ''
})
const availableStorages = ref<Storage[]>([])
const selectedStorage = ref<string>('')
const currentStorageConfiguration = ref<Storage | null>(null)
const showDeleteModal = ref(false)
const showConfigureModal = ref(false)

const storageOptions = computed(() =>
  availableStorages.value.map((storage) => ({
    id: storage.path!,
    label: storage.name!,
    description: `${storage.path} | ${storage.size} ${storage.model ? `| ${storage.model}` : ''}`,
    icon: 'hard-drive'
  }))
)

async function fetchStorageConfig() {
  try {
    loading.value = true
    availableStorages.value = (await ubusCall('ns.storage', 'list-devices')).data.devices
    currentStorageConfiguration.value = (await ubusCall('ns.storage', 'get-configuration')).data
    loading.value = false
  } catch (err: any) {
    error.value.fetchError = t(getAxiosErrorMessage(err))
  }
}

function closeModal() {
  showDeleteModal.value = false
  showConfigureModal.value = false
  error.value.modalError = ''
}

async function addStorage() {
  try {
    await ubusCall('ns.storage', 'add-storage', { device: selectedStorage.value })
    await fetchStorageConfig()
    closeModal()
  } catch (err: any) {
    error.value.modalError = t(getAxiosErrorMessage(err))
  }
}

async function removeStorage() {
  try {
    await ubusCall('ns.storage', 'remove-storage')
    await fetchStorageConfig()
    closeModal()
  } catch (err: any) {
    error.value.modalError = t(getAxiosErrorMessage(err))
  }
}

onMounted(() => {
  fetchStorageConfig()
})
</script>

<template>
  <NeTitle>{{ t('standalone.storage.title') }}</NeTitle>
  <div class="flex flex-col gap-y-6">
    <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
      {{ t('standalone.storage.description') }}
    </p>
    <NeInlineNotification
      kind="error"
      :title="t('error.cannot_retrieve_storage_configuration')"
      :description="error.fetchError"
      v-if="error.fetchError"
    />
    <NeSkeleton :lines="10" v-if="loading" />
    <template v-else-if="currentStorageConfiguration?.name">
      <NeTitle level="h3">{{ t('standalone.storage.current_configuration') }}</NeTitle>
      <div
        class="flex max-w-3xl flex-row items-center justify-between gap-8 rounded-md bg-white p-6 transition-colors duration-200 dark:bg-gray-800 sm:shadow"
      >
        <div class="mr-6 flex h-full flex-row items-center">
          <div class="flex h-full flex-col items-center justify-center border-r pr-6 md:flex-row">
            <font-awesome-icon
              :icon="['fas', 'hard-drive']"
              aria-hidden="true"
              :class="`mb-2 h-5 w-5 rounded-full bg-gray-100 p-4 text-gray-500 dark:bg-gray-500 dark:text-gray-50 md:mb-0 md:mr-5`"
            />
            <div class="h-full text-center">
              <p class="text-md md:text-lg">{{ currentStorageConfiguration.name }}</p>
              <p class="md:text-md text-sm">{{ currentStorageConfiguration.path }}</p>
            </div>
          </div>
          <div class="ml-6 text-sm">
            <p>
              <strong>{{ t('standalone.storage.size') }}:</strong>
              {{ currentStorageConfiguration.size ?? t('standalone.storage.unknown') }}
            </p>
            <p>
              <strong>{{ t('standalone.storage.model') }}:</strong>
              {{ currentStorageConfiguration.model ?? t('standalone.storage.unknown') }}
            </p>
            <p>
              <strong>{{ t('standalone.storage.vendor') }}:</strong>
              {{ currentStorageConfiguration.vendor ?? t('standalone.storage.unknown') }}
            </p>
          </div>
        </div>
        <div>
          <NeButton kind="danger" @click="showDeleteModal = true">
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'trash']"
                class="h-4 w-4"
                aria-hidden="true"
              /> </template
            >{{ t('standalone.storage.remove_storage') }}</NeButton
          >
        </div>
      </div>
    </template>
    <template v-else>
      <div>
        <NeTitle level="h2">{{ t('standalone.storage.available_devices') }}</NeTitle>
        <NeRadioSelection
          :options="storageOptions"
          :grid-style="'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3'"
          v-model="selectedStorage"
          :card="true"
          :label="''"
        />
      </div>
      <div>
        <NeButton
          kind="primary"
          size="lg"
          :disabled="selectedStorage === ''"
          @click="showConfigureModal = true"
          >{{ t('standalone.storage.format_configure_storage') }}</NeButton
        >
      </div>
    </template>
  </div>
  <NeModal
    :primary-label="t('standalone.storage.configure_storage')"
    :title="t('standalone.storage.format_configure_storage')"
    :primary-button-loading="isConfiguringOrRemovingStorage"
    :primary-button-disabled="isConfiguringOrRemovingStorage"
    :cancel-label="t('common.cancel')"
    :visible="showConfigureModal"
    kind="warning"
    primary-button-kind="danger"
    @close="closeModal()"
    @primary-click="addStorage()"
  >
    {{ t('standalone.storage.format_configure_storage_warning', { device: selectedStorage }) }}
    <NeInlineNotification
      v-if="error.modalError"
      :title="t('error.cannot_configure_storage')"
      :description="error.modalError"
      kind="error"
      class="my-6"
    />
  </NeModal>
  <NeModal
    :primary-label="t('standalone.storage.configure_storage')"
    :primary-button-loading="isConfiguringOrRemovingStorage"
    :primary-button-disabled="isConfiguringOrRemovingStorage"
    :title="t('standalone.storage.remove_storage')"
    :visible="showDeleteModal"
    kind="warning"
    primary-button-kind="danger"
    @close="closeModal()"
    @primary-click="removeStorage()"
  >
    {{
      t('standalone.storage.remove_storage_warning', { storage: currentStorageConfiguration?.path })
    }}
    <NeInlineNotification
      v-if="error.modalError"
      :title="t('error.generic_error')"
      :description="error.modalError"
      kind="error"
      class="my-6"
    />
  </NeModal>
</template>
