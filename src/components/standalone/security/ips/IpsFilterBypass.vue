<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeDropdown,
  type NeDropdownItem,
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
import { useI18n } from 'vue-i18n'
import { faCirclePlus, faMagnifyingGlass, faShield } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed, onMounted, ref } from 'vue'
import { type ByPass } from '@/composables/useIps'
import IpsCreateBypassDrawer from '@/components/standalone/security/ips/IpsCreateBypassDrawer.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import IpsEnabledBadge from '@/components/standalone/security/ips/IpsEnabledBadge.vue'
import IpsDeleteBypassModal from '@/components/standalone/security/ips/IpsDeleteBypassModal.vue'

type ByPassResponse = {
  bypasses: ByPass[]
}

const changes = useUciPendingChangesStore()
const { t } = useI18n()

const creatingBypass = ref(false)

const byPasses = ref<ByPass[]>([])
const loadingByPasses = ref(true)
const error = ref<Error>()

function listBypasses() {
  ubusCall('ns.snort', 'list-bypasses', {})
    .then((response: AxiosResponse<ByPassResponse>) => {
      byPasses.value = response.data.bypasses
    })
    .catch((e: Error) => {
      error.value = e
    })
    .finally(() => {
      loadingByPasses.value = false
    })
}

onMounted(() => {
  listBypasses()
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

function savedBypass(bypass: ByPass) {
  byPasses.value.push(bypass)
  creatingBypass.value = false
  changes.getChanges()
}

function dropDownActions(bypass: ByPass): NeDropdownItem[] {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      icon: 'trash',
      iconStyle: 'fas',
      danger: true,
      action: () => {
        byPassToDelete.value = bypass
      }
    }
  ]
}

const byPassToDelete = ref<ByPass>()

function handleDeleted() {
  // Being unable to give an ID to the bypasses, we just fetch again the list
  listBypasses()
  byPassToDelete.value = undefined
  changes.getChanges()
}
</script>

<template>
  <div class="space-y-8">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <p class="max-w-lg">{{ t('standalone.ips.filter_bypass_description') }}</p>
      <IpsEnabledBadge />
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
            <NeTableCell :data-label="t('common.actions')">
              <div class="flex justify-end">
                <NeDropdown :items="dropDownActions(item)" :align-to-right="true" />
              </div>
            </NeTableCell>
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
      <IpsCreateBypassDrawer
        :visible="creatingBypass"
        @close="creatingBypass = false"
        @saved="savedBypass($event)"
      />
      <IpsDeleteBypassModal
        @close="byPassToDelete = undefined"
        :bypass="byPassToDelete"
        @deleted="handleDeleted()"
      />
    </div>
  </div>
</template>
