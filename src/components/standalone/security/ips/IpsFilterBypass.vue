<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeBadge,
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NePaginator,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  useItemPagination,
  useSort
} from '@nethesis/vue-components'
import { useIpsStore } from '@/stores/standalone/ips'
import { useI18n } from 'vue-i18n'
import {
  faCheck,
  faCirclePlus,
  faMagnifyingGlass,
  faShield
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, ref } from 'vue'
import { type ByPass, useIps } from '@/composables/useIps'

const ips = useIpsStore()
const { t } = useI18n()

const creatingBypass = ref(false)
const { fetchByPasses, error, loadingByPasses, byPasses } = useIps()

onMounted(() => {
  fetchByPasses()
})

const filter = ref('')
const filteredByPasses = computed((): ByPass[] => {
  return byPasses.value.filter((byPass) => {
    return byPass.ip.includes(filter.value)
  })
})

const sortKey = ref<keyof ByPass>('ip')
const sortDescending = ref(false)
const { sortedItems } = useSort(filteredByPasses, sortKey, sortDescending, {})

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(sortedItems, {
  itemsPerPage: pageSize
})

// FIXME: when types from library are fixed, use proper type
const onSort = (payload: any) => {
  sortKey.value = payload.key
  sortDescending.value = payload.descending
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <p class="max-w-lg">{{ t('standalone.ips.filter_bypass_description') }}</p>
      <NeBadge
        v-if="ips.enabled"
        :icon="faCheck"
        :text="t('standalone.ips.ips_enabled')"
        kind="success"
      />
    </div>

    <NeInlineNotification
      v-if="error"
      :description="t(getAxiosErrorMessage(error))"
      :title="t('standalone.ips.error_loading_bypasses')"
      kind="error"
    />
    <NeSkeleton v-if="loadingByPasses" :lines="10" />
    <div v-else class="space-y-4">
      <div class="flex flex-col flex-wrap justify-between gap-4 md:flex-row">
        <NeTextInput v-model="filter" :placeholder="t('common.filter')">
          <template #prefix>
            <FontAwesomeIcon :icon="faMagnifyingGlass" aria-hidden="true" class="h-4 w-4" />
          </template>
        </NeTextInput>
        <NeButton
          kind="secondary"
          v-if="byPasses.length > 0"
          size="lg"
          @click="creatingBypass = true"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.ips.add_bypass') }}
        </NeButton>
      </div>
      <NeTable
        v-if="byPasses.length > 0"
        :ariaLabel="t('standalone.ips.title')"
        :skeleton-columns="7"
        :skeleton-rows="5"
        :sortDescending="sortDescending"
        :sortKey="sortKey"
        card-breakpoint="xl"
      >
        <NeTableHead>
          <NeTableHeadCell column-key="ip" sortable @sort="onSort">
            {{ t('standalone.ips.bypass_address') }}
          </NeTableHeadCell>
          <NeTableHeadCell column-key="direction" sortable @sort="onSort">
            {{ t('standalone.ips.bypass_direction') }}
          </NeTableHeadCell>
          <NeTableHeadCell>{{ t('standalone.ips.bypass_description') }}</NeTableHeadCell>
          <NeTableHeadCell>
            <!-- no header for actions -->
          </NeTableHeadCell>
        </NeTableHead>
        <NeTableBody>
          <NeTableRow v-for="item in paginatedItems" :key="`${item.ip}-${item.direction}`">
            <NeTableCell :data-label="t('standalone.ips.bypass_address')">
              {{ item.ip }}
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.ips.bypass_direction')">
              <template v-if="item.direction == 'src'">
                {{ t('standalone.ips.source') }}
              </template>
              <template v-else>
                {{ t('standalone.ips.destination') }}
              </template>
            </NeTableCell>
            <NeTableCell :data-label="t('standalone.ips.bypass_description')">
              {{ item.description }}
            </NeTableCell>
            <NeTableCell :data-label="t('common.actions')"></NeTableCell>
          </NeTableRow>
        </NeTableBody>
        <template #paginator>
          <NePaginator
            :current-page="currentPage"
            :nav-pagination-label="t('ne_table.pagination')"
            :next-label="t('ne_table.go_to_next_page')"
            :page-size="pageSize"
            :page-size-label="t('ne_table.show')"
            :previous-label="t('ne_table.go_to_previous_page')"
            :range-of-total-label="t('ne_table.of')"
            :total-rows="byPasses.length"
            @selectPageSize="(size: number) => { pageSize = size }"
            @select-page="(page: number) => { currentPage = page }"
          />
        </template>
      </NeTable>
      <NeEmptyState v-else :icon="faShield" :title="t('standalone.ips.no_filter_bypass')">
        <NeButton kind="primary" size="lg" @click="creatingBypass = true">
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('standalone.ips.add_bypass') }}
        </NeButton>
      </NeEmptyState>
    </div>
  </div>
</template>
