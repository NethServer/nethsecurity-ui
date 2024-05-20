<script lang="ts" setup>
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeHeading,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  NeRadioSelection,
  getAxiosErrorMessage,
  NeEmptyState,
  byteFormat1024
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
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
  type: string | null
}

const loading = ref(true)
const isConfiguringOrRemovingStorage = ref(false)
const error = ref({
  fetchError: '',
  modalError: ''
})
const availableDevices = ref<Storage[]>([])
const selectedDevicePath = ref<string>('')
const currentStorageConfiguration = ref<Storage | null>(null)
const showDeleteModal = ref(false)
const showConfigureModal = ref(false)

const deviceOptions = computed(() =>
  availableDevices.value.map((storage) => ({
    id: storage.path!,
    label: storage.name!,
    icon: storage.type == 'disk' ? 'database' : 'hard-drive',
    type: storage.type!
  }))
)

const selectedDeviceType = computed(
  () => availableDevices.value.find((device) => device.path === selectedDevicePath.value)?.type
)

async function fetchStorageConfig() {
  try {
    loading.value = true
    availableDevices.value = (await ubusCall('ns.storage', 'list-devices')).data.devices
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

async function configureStorage() {
  try {
    isConfiguringOrRemovingStorage.value = true
    await ubusCall('ns.storage', 'add-storage', {
      device: selectedDevicePath.value,
      type: selectedDeviceType.value
    })
    closeModal()
    await fetchStorageConfig()
  } catch (err: any) {
    error.value.modalError = t(getAxiosErrorMessage(err))
  } finally {
    isConfiguringOrRemovingStorage.value = false
  }
}

async function removeStorage() {
  try {
    isConfiguringOrRemovingStorage.value = true
    await ubusCall('ns.storage', 'remove-storage')
    closeModal()
    await fetchStorageConfig()
  } catch (err: any) {
    error.value.modalError = t(getAxiosErrorMessage(err))
  } finally {
    isConfiguringOrRemovingStorage.value = false
  }
}

onMounted(() => {
  fetchStorageConfig()
})
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.storage.title') }}</NeHeading>
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
      <div>
        <NeHeading tag="h6" class="mb-1.5">{{
          t('standalone.storage.storage_configuration')
        }}</NeHeading>
        <div
          class="flex max-w-3xl flex-row items-center rounded-md bg-white p-6 transition-colors duration-200 dark:bg-gray-800 sm:shadow"
        >
          <!-- Card icon + device name and path -->
          <div
            class="flex flex-col items-center justify-center self-stretch border-r pr-6 md:flex-row"
          >
            <font-awesome-icon
              :icon="
                currentStorageConfiguration.type == 'disk'
                  ? ['fas', 'database']
                  : ['fas', 'hard-drive']
              "
              aria-hidden="true"
              :class="`mb-2 h-5 w-5 rounded-full bg-gray-100 p-4 text-gray-500 dark:bg-gray-500 dark:text-gray-50 md:mb-0 md:mr-5`"
            />
            <div class="text-center text-sm md:text-start">
              <p class="font-semibold">
                {{ t('standalone.storage.' + currentStorageConfiguration.type) }}
              </p>
              <p>{{ currentStorageConfiguration.path }}</p>
            </div>
          </div>

          <!-- device size, model and vendor -->
          <div class="ml-6 flex grow flex-col justify-between sm:flex-row sm:items-center">
            <div class="text-sm">
              <p>
                <strong>{{ t('standalone.storage.size') }}:</strong>
                {{
                  byteFormat1024(parseInt(currentStorageConfiguration.size ?? '0')) ??
                  t('standalone.storage.unknown')
                }}
              </p>
              <p v-if="currentStorageConfiguration.type == 'disk'">
                <strong>{{ t('standalone.storage.model') }}:</strong>
                {{ currentStorageConfiguration.model ?? t('standalone.storage.unknown') }}
              </p>
              <p v-if="currentStorageConfiguration.type == 'disk'">
                <strong>{{ t('standalone.storage.vendor') }}:</strong>
                {{ currentStorageConfiguration.vendor ?? t('standalone.storage.unknown') }}
              </p>
            </div>

            <!-- Remove storage button -->
            <div>
              <NeButton kind="danger" @click="showDeleteModal = true" class="mt-2 sm:mt-0">
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
        </div>
      </div>
    </template>
    <template v-else-if="deviceOptions.length > 0">
      <div class="max-w-5xl">
        <NeHeading tag="h6" class="mb-1.5">{{ t('standalone.storage.select_device') }}</NeHeading>
        <NeRadioSelection
          :options="deviceOptions"
          :grid-style="'grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3'"
          v-model="selectedDevicePath"
          :card="true"
          :label="''"
          card-size="lg"
        >
          <template #option="{ option }">
            <div class="flex flex-col text-left text-sm">
              <div class="mb-1 flex flex-row">
                <p class="font-semibold">{{ t('standalone.storage.' + option.type) }}</p>
                <p class="ml-2 text-gray-500 dark:text-gray-400">
                  {{ option.id }}
                </p>
              </div>
              <p>
                <span class="font-semibold">{{ t('standalone.storage.size') }}:</span>
                {{
                  byteFormat1024(
                    parseInt(
                      availableDevices.find((device) => device.name == option.label)?.size ?? '0'
                    )
                  ) ?? t('standalone.storage.unknown')
                }}
              </p>
              <p v-if="option.type == 'disk'">
                <span class="font-semibold">{{ t('standalone.storage.model') }}:</span>
                {{
                  availableDevices.find((device) => device.name == option.label)?.model ??
                  t('standalone.storage.unknown')
                }}
              </p>
              <p v-if="option.type == 'disk'">
                <span class="font-semibold">{{ t('standalone.storage.vendor') }}:</span>
                {{
                  availableDevices.find((device) => device.name == option.label)?.vendor ??
                  t('standalone.storage.unknown')
                }}
              </p>
            </div>
          </template>
        </NeRadioSelection>
      </div>
      <div>
        <NeButton
          kind="primary"
          size="lg"
          :disabled="selectedDevicePath === ''"
          @click="showConfigureModal = true"
          >{{
            selectedDeviceType == 'disk'
              ? t('standalone.storage.format_configure_storage')
              : t('standalone.storage.configure_storage')
          }}</NeButton
        >
      </div>
    </template>
    <template v-else>
      <NeEmptyState :icon="['fas', 'database']" :title="t('standalone.storage.no_device_found')" />
    </template>
  </div>
  <NeModal
    :primary-label="t('standalone.storage.format_and_configure')"
    :title="t('standalone.storage.format_configure_storage')"
    :primary-button-loading="isConfiguringOrRemovingStorage"
    :primary-button-disabled="isConfiguringOrRemovingStorage"
    :cancel-label="t('common.cancel')"
    :visible="showConfigureModal"
    kind="warning"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @close="!isConfiguringOrRemovingStorage ? closeModal() : undefined"
    @primary-click="configureStorage()"
  >
    <ul class="list-disc">
      <li v-if="selectedDeviceType === 'disk'">
        {{
          t('standalone.storage.format_storage_warning', {
            device: availableDevices.find((storage) => storage.path === selectedDevicePath)?.name
          })
        }}
      </li>
      <li v-if="selectedDeviceType === 'partition'">
        {{
          t('standalone.storage.new_partition', {
            device: availableDevices.find((storage) => storage.path === selectedDevicePath)?.name
          })
        }}
      </li>
      <li>
        {{ t('standalone.storage.configure_storage_logs_description') }}
        <code class="inline">/mnt/data/logs/messages</code>
      </li>
      <li>
        {{ t('standalone.storage.configure_storage_extra_data_description') }}
      </li>
    </ul>

    <NeInlineNotification
      v-if="error.modalError"
      :title="t('error.cannot_configure_storage')"
      :description="error.modalError"
      kind="error"
      class="my-6"
    />
  </NeModal>
  <NeModal
    :primary-label="t('standalone.storage.remove_storage')"
    :primary-button-loading="isConfiguringOrRemovingStorage"
    :primary-button-disabled="isConfiguringOrRemovingStorage"
    :title="t('standalone.storage.remove_storage')"
    :visible="showDeleteModal"
    kind="warning"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @close="!isConfiguringOrRemovingStorage ? closeModal() : undefined"
    @primary-click="removeStorage()"
  >
    {{
      t('standalone.storage.remove_storage_warning', { storage: currentStorageConfiguration?.name })
    }}
    <NeInlineNotification
      v-if="error.modalError"
      :title="t('error.cannot_remove_storage')"
      :description="error.modalError"
      kind="error"
      class="my-6"
    />
  </NeModal>
</template>
