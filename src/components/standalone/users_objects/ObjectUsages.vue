<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getStandaloneRoutePrefix } from '@/lib/router'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeButton,
  NeInlineNotification,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'

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
  },
  showGoToObjectsButton: {
    type: Boolean,
    required: true
  }
})

const { t } = useI18n()
const router = useRouter()
const route = useRoute()

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

function getManagementPageLabel(category: string) {
  switch (category) {
    case 'firewall':
      return t('common.go_to_page', { page: t('standalone.firewall_rules.title') })
    case 'objects':
      return t('common.go_to_page', { page: t('standalone.objects.title') })
    case 'mwan3':
      return t('common.go_to_page', { page: t('standalone.multi_wan.title') })
  }
}

function goToManagementPage(subtype: string) {
  let path = ''

  switch (subtype) {
    case 'firewall':
      path = 'firewall/rules'
      break
    case 'objects':
      path = 'users-objects/objects'
      break
    case 'mwan3':
      path = 'network/multi-wan'
  }
  router.push(`${getStandaloneRoutePrefix(route)}/${path}`)
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
    <div v-else class="space-y-5">
      <div v-for="categoryName in Object.keys(usages)" :key="categoryName">
        <div class="flex items-center justify-between">
          <div class="font-medium">
            {{ t(`standalone.objects.database_${categoryName}`) }}
          </div>
          <NeButton
            v-if="showGoToObjectsButton"
            size="sm"
            kind="tertiary"
            @click="goToManagementPage(categoryName)"
            class="shrink-0"
          >
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'arrow-right']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ getManagementPageLabel(categoryName) }}
          </NeButton>
        </div>
        <hr class="mb-2 mt-1" />
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
