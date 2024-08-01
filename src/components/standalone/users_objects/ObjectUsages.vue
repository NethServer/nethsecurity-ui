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

    // categorize usages by database and type

    for (const objectInfo of Object.values(res.data.info) as ObjectInfo[]) {
      const kindName = `${objectInfo.database}_${objectInfo.type}`
      const kind = usages.value[kindName] || []
      kind.push(objectInfo)
      usages.value[kindName] = kind
    }
  } catch (err: any) {
    console.error(err)
    error.value.getInfo = t(getAxiosErrorMessage(err))
    error.value.getInfoDetails = err.toString()
  } finally {
    loading.value.getInfo = false
  }
}

function getManagementPageLabel(kind: string) {
  switch (kind) {
    case 'firewall_rule':
      return t('common.go_to_page', { page: t('standalone.firewall_rules.title') })
    case 'objects_host':
    case 'objects_domain_set':
      return t('common.go_to_page', { page: t('standalone.objects.title') })
    case 'mwan3_rule':
      return t('common.go_to_page', { page: t('standalone.multi_wan.title') })
    case 'firewall_redirect':
      return t('common.go_to_page', { page: t('standalone.port_forward.title') })
  }
}

function goToManagementPage(subtype: string) {
  let path = ''

  switch (subtype) {
    case 'firewall_rule':
      path = 'firewall/rules'
      break
    case 'objects_host':
    case 'objects_domain_set':
      path = 'users-objects/objects'
      break
    case 'mwan3_rule':
      path = 'network/multi-wan'
      break
    case 'firewall_redirect':
      path = 'firewall/port-forward'
      break
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
      <div v-for="kindName in Object.keys(usages)" :key="kindName">
        <div class="flex items-center justify-between">
          <div class="font-medium">
            {{ t(`standalone.objects.type_${kindName}`) }}
          </div>
          <NeButton
            v-if="
              showGoToObjectsButton ||
              (kindName !== 'objects_host' && kindName !== 'objects_domain_set')
            "
            size="sm"
            kindName="tertiary"
            @click="goToManagementPage(kindName)"
            class="shrink-0"
          >
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'arrow-right']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ getManagementPageLabel(kindName) }}
          </NeButton>
        </div>
        <hr class="mb-2 mt-1" />
        <ul>
          <li
            v-for="objectInfo in usages[kindName]"
            :key="objectInfo.id"
            class="list-inside list-disc"
          >
            {{ objectInfo.name }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>
