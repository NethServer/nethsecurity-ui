<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeCard,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  getAxiosErrorMessage,
  NeInlineNotification,
  NeSkeleton
} from '@nethesis/vue-components'
import { onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import type { Wan } from '../ConnectivityMonitor.vue'
import type { QoSInterface } from '@/views/standalone/network/QoSView.vue'
import { ubusCall } from '@/lib/standalone/ubus'

const props = defineProps<{
  wanConnections: Wan[]
}>()

const { t } = useI18n()

const pageSize = ref(5)
const { currentPage, paginatedItems } = useItemPagination(() => props.wanConnections, {
  itemsPerPage: pageSize
})
const qosData = ref<QoSInterface[]>([])

const loading = ref({
  listQos: false
})

const error = ref({
  listQos: '',
  listQosDetails: ''
})

onMounted(() => {
  listQos()
})

async function listQos() {
  loading.value.listQos = true
  error.value.listQos = ''
  error.value.listQosDetails = ''

  try {
    const res = await ubusCall('ns.qos', 'list')
    qosData.value = res.data.rules
  } catch (err: any) {
    error.value.listQos = t(getAxiosErrorMessage(err))
    error.value.listQosDetails = err.toString()
  } finally {
    loading.value.listQos = false
  }
}

function getQosRule(item: Wan) {
  return qosData.value.find((qosRule) => qosRule.interface === item.iface)
}
</script>

<template>
  <NeCard :title="t('standalone.real_time_monitor.wans')">
    <!-- listQos error notification -->
    <NeInlineNotification
      v-if="error.listQos"
      kind="error"
      :title="t('error.cannot_retrieve_qos_interfaces')"
      :description="error.listQos"
      :closeAriaLabel="t('common.close')"
      class="mb-4"
    >
      <template v-if="error.listQosDetails" #details>
        {{ error.listQosDetails }}
      </template>
    </NeInlineNotification>
    <NeTable :ariaLabel="t('standalone.real_time_monitor.wans')" cardBreakpoint="md" class="mt-2">
      <NeTableHead>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.interface') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.device') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('common.status') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.real_time_monitor.public_ip_address') }}</NeTableHeadCell>
        <NeTableHeadCell>{{ t('standalone.qos.title_short') }}</NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="(item, index) in paginatedItems" :key="index">
          <NeTableCell :data-label="t('standalone.real_time_monitor.interface')">
            {{ item.iface }}
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.real_time_monitor.device')">
            {{ item.device }}
          </NeTableCell>
          <NeTableCell :data-label="t('common.status')">
            <div class="flex items-center gap-2">
              <font-awesome-icon
                :icon="['fas', item.status == 'online' ? 'circle-check' : 'circle-xmark']"
                :class="[
                  'h-4 w-4',
                  item.status == 'online'
                    ? 'text-green-600 dark:text-green-400'
                    : 'text-rose-600 dark:text-rose-400'
                ]"
                aria-hidden="true"
              />
              {{
                item.status == 'online'
                  ? t('standalone.real_time_monitor.online')
                  : t('standalone.real_time_monitor.offline')
              }}
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.real_time_monitor.public_ip_address')">
            <span v-if="item.ipAddresses.length">
              {{ item.ipAddresses.join(', ') }}
            </span>
            <span v-else>-</span>
          </NeTableCell>
          <NeTableCell :data-label="t('standalone.qos.title_short')">
            <NeSkeleton v-if="loading.listQos" />
            <!-- qos disabled -->
            <template v-else-if="!getQosRule(item) || getQosRule(item)?.disabled">
              <div class="flex items-center gap-2">
                <font-awesome-icon
                  :icon="['fas', 'circle-xmark']"
                  class="h-4 w-4"
                  aria-hidden="true"
                />
                <span>{{ t('common.disabled') }}</span>
              </div>
            </template>
            <!-- qos enabled -->
            <template v-else-if="getQosRule(item) && !getQosRule(item)?.disabled">
              <div class="flex items-center gap-5">
                <!-- download -->
                <div class="flex items-center gap-2">
                  <font-awesome-icon
                    :icon="['fas', 'arrow-down']"
                    class="h-4 w-4"
                    :aria-label="t('common.download')"
                  />
                  <span>{{ getQosRule(item)?.download }} Mbps</span>
                </div>
                <!-- upload -->
                <div class="flex items-center gap-2">
                  <font-awesome-icon
                    :icon="['fas', 'arrow-up']"
                    class="h-4 w-4"
                    :aria-label="t('common.upload')"
                  />
                  <span>{{ getQosRule(item)?.upload }} Mbps</span>
                </div>
              </div>
            </template>
          </NeTableCell>
        </NeTableRow>
      </NeTableBody>
      <template #paginator>
        <NePaginator
          :current-page="currentPage"
          :total-rows="wanConnections.length"
          :page-size="pageSize"
          :page-sizes="[5, 10]"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :page-size-label="t('ne_table.show')"
          @select-page="
            (page: number) => {
              currentPage = page
            }"
          @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
        />
      </template>
    </NeTable>
  </NeCard>
</template>
