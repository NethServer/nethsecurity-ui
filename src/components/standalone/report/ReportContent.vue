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
import FormLayout from '@/components/standalone/FormLayout.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const { t } = useI18n()

const loading = ref(true)
const linkPath = ref('')

let errorConfiguration = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})

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
    errorConfiguration.value.notificationTitle = t('error.cannot_retrieve_netdata_configuration')
    errorConfiguration.value.notificationDescription = t(getAxiosErrorMessage(exception))
    errorConfiguration.value.notificationDetails = exception.toString()
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
    <NeSkeleton v-if="loading" :lines="5" />
    <NeInlineNotification
      v-if="!loading && errorConfiguration.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorConfiguration.notificationTitle"
      :description="errorConfiguration.notificationDescription"
    >
      <template v-if="errorConfiguration.notificationDetails" #details>
        {{ errorConfiguration.notificationDetails }}
      </template>
    </NeInlineNotification>
    <template v-if="!loading && !errorConfiguration.notificationTitle">
      <FormLayout
        :description="t('standalone.report.real_time_report.description')"
        class="max-w-12xl"
      >
        <div class="mr-auto self-start">
          <NeButton class="mr-2" kind="secondary" size="lg" @click="goToReport()">
            <template #prefix>
              <FontAwesomeIcon :icon="['fa', 'arrow-up-right-from-square']" />
            </template>
            {{ t('standalone.report.real_time_report.open_report') }}
          </NeButton>
        </div>
      </FormLayout>
    </template>
  </div>
</template>
