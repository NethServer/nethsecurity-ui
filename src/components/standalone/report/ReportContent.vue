<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeSkeleton
} from '@nethserver/vue-tailwind-lib'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const { t } = useI18n()

let loading = ref(true)
let linkPath = ref('')
let objNotification = {
  notificationTitle: '',
  notificationDescription: ''
}
let error = ref(false)
let errorConfiguration = ref({ ...objNotification })

onMounted(() => {
  getConfiguration()
})

async function getConfiguration() {
  try {
    let res = await ubusCall('ns.netdata', 'get-configuration', {})
    if (res?.data?.path) {
      linkPath.value = res.data.path
    }
  } catch (exception: any) {
    error.value = true
    errorConfiguration.value.notificationTitle = t('error.cannot_retrieve_netdata_configuration')
    errorConfiguration.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    loading.value = false
  }
}

function goToReport() {
  window.open(
    window.location.protocol +
      '//' +
      window.location.hostname +
      (window.location.port ? ':' + window.location.port : '') +
      linkPath.value
  )
}
</script>

<template>
  <div>
    <NeSkeleton v-if="loading" :lines="15" />
    <NeInlineNotification
      v-if="!loading && errorConfiguration.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorConfiguration.notificationTitle"
      :description="errorConfiguration.notificationDescription"
    />
    <template v-if="!loading && !error">
      <div class="flex">
        <div>
          <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
            {{ t('standalone.report.real_time_report.description') }}
          </p>
        </div>
        <div class="mr-auto self-start">
          <NeButton class="mr-2" kind="secondary" size="lg" @click="goToReport()">
            <template #prefix>
              <FontAwesomeIcon :icon="['fa', 'arrow-up-right-from-square']" />
            </template>
            {{ t('standalone.report.real_time_report.open_report') }}
          </NeButton>
        </div>
      </div>
    </template>
  </div>
</template>
