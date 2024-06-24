<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ubusCall } from '@/lib/standalone/ubus'
import { NeInlineNotification, NeSkeleton, getAxiosErrorMessage } from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

type ObjectInfo = {
  id: string
  name: string
  type: string
  database: string
}

const props = defineProps({
  usageIds: {
    type: Array<String>,
    required: true
  }
})

const { t } = useI18n()

const usages = ref<Record<string, ObjectInfo[]>>({})

const loading = ref({
  getInfo: false
})

const error = ref({
  getInfo: '',
  getInfoDetails: ''
})

onMounted(() => {
  getInfo()
})

async function getInfo() {
  loading.value.getInfo = true
  usages.value = {}
  error.value.getInfo = ''
  error.value.getInfoDetails = ''

  try {
    const res = await ubusCall('ns.objects', 'get-info', { ids: props.usageIds })

    // categorize usages by database

    for (const objectInfo of Object.values(res.data.info) as ObjectInfo[]) {
      const categoryName = objectInfo.database
      const category = usages.value[categoryName] || []
      category.push(objectInfo)
      usages.value[categoryName] = category
    }
  } catch (err: any) {
    console.error(err)
    error.value.getInfo = t(getAxiosErrorMessage(err))
    error.value.getInfoDetails = err.toString()
  } finally {
    loading.value.getInfo = false
  }
}
</script>

<template>
  <div>
    <NeInlineNotification
      v-if="error.getInfo"
      kind="error"
      :title="t('error.cannot_retrieve_usages')"
      :description="error.getInfo"
      class="mt-4"
    >
      <template #details v-if="error.getInfoDetails">
        {{ error.getInfoDetails }}
      </template>
    </NeInlineNotification>
    <NeSkeleton v-else-if="loading.getInfo" :lines="3" size="lg" />
    <div v-else class="space-y-4">
      <div v-for="categoryName in Object.keys(usages)" :key="categoryName">
        <div class="font-medium">
          {{ t(`standalone.objects.database_${categoryName}`) }}
        </div>
        <ul>
          <li
            v-for="objectInfo in usages[categoryName]"
            :key="objectInfo.id"
            class="list-inside list-disc"
          >
            <span>
              {{ objectInfo.name }}
            </span>
            <span v-if="objectInfo.type" class="ml-2 text-gray-500 dark:text-gray-400">
              {{ t(`standalone.objects.type_${objectInfo.type}`) }}
            </span>
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
