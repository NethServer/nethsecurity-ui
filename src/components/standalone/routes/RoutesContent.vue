<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { onMounted, ref } from 'vue'
import {
  NeDropdown,
  NeHeading,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage,
  NeEmptyState,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeModal,
  NeTableCell,
  NePaginator,
  useItemPagination
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faCirclePlus,
  faEarthAmerica,
  faLocationDot,
  faCircleCheck,
  faCircleXmark
} from '@fortawesome/free-solid-svg-icons'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import CreateOrEditRouteDrawer from '@/components/standalone/routes/CreateOrEditRouteDrawer.vue'
import { AxiosError } from 'axios'

/**
 * Props parent component
 */
const props = defineProps({
  protocol: {
    type: String,
    required: true
  }
})

const { t } = useI18n()
const uciPendingChangesStore = useUciPendingChangesStore()

let createEditRoute = ref(false)
let routes: any = ref([])
let table: any = ref([])
let loading = ref(true)
let selectedRoute = ref({})
let deleting = ref(false)
let deleteError = ref<Error>()
let deleteRouteId = ref(undefined)
let deleteRouteName = ref(undefined)
let error = ref({
  notificationTitle: '',
  notificationDescription: ''
})

const pageSizeRoutes = ref(10)
const pageSizeTable = ref(10)
const { currentPage: currentPageRoutes, paginatedItems: paginatedItemsRoutes } = useItemPagination(
  routes,
  {
    itemsPerPage: pageSizeRoutes
  }
)
const { currentPage: currentPageTable, paginatedItems: paginatedItemsTable } = useItemPagination(
  table,
  {
    itemsPerPage: pageSizeTable
  }
)

onMounted(async () => {
  await loadRoutes()
  await loadMainTable()
  loading.value = false
})

/*
 * get all routes
 */
async function loadRoutes() {
  loading.value = true
  try {
    const res = await ubusCall('ns.routes', 'list-routes', {
      protocol: props.protocol
    })

    const items: any = []
    for (let item in res.data.routes) {
      let obj = {
        id: item
      }
      obj = Object.assign(obj, res.data.routes[item])
      items.push(obj)
    }

    routes.value = items
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_load_routes')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value = false
  }
}

/*
 * get main table
 */
async function loadMainTable() {
  try {
    const res = await ubusCall('ns.routes', 'main-table', {
      protocol: props.protocol
    })

    if (res.data) {
      table.value = res.data.table
    }
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_load_routes')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
}

/**
 * Handler for routeCreatedEdited event.
 */
function routeCreatedEditedHandler() {
  createEditRoute.value = false
  reloadConfig()
}

function reloadConfig() {
  uciPendingChangesStore.getChanges()
  loadRoutes()
  loadMainTable()
}

function openCreateRoute() {
  createEditRoute.value = true
  selectedRoute.value = {}
}

function openEditRoute({ item }: { item: any }) {
  createEditRoute.value = true
  selectedRoute.value = item
}

function deleteRouteHandler() {
  if (deleteRouteId.value) {
    deleting.value = true
    ubusCall('ns.routes', 'delete-route', { id: deleteRouteId.value })
      .then(() => {
        reloadConfig()
      })
      .catch((error: AxiosError) => (deleteError.value = error))
      .finally(() => {
        deleting.value = false
        deleteRouteId.value = undefined
        deleteRouteName.value = undefined
      })
  }
}

function scrollToMainTable() {
  let element = document.getElementById('divMainTable')
  if (element) {
    element.scrollIntoView({
      behavior: 'smooth',
      block: 'start'
    })
  }
}
</script>

<template>
  <NeSkeleton v-if="loading" :lines="8" size="lg" />
  <NeEmptyState
    v-if="!loading && !error.notificationTitle && !routes.length"
    :title="t('standalone.routes.no_route_found')"
    :icon="['fas', 'circle-info']"
  >
    <NeButton kind="primary" size="lg" @click="openCreateRoute()">
      <template #prefix>
        <FontAwesomeIcon :icon="['fas', 'circle-plus']" aria-hidden="true" />
      </template>
      {{ t('standalone.routes.create_route') }}</NeButton
    >
  </NeEmptyState>
  <div v-if="!loading && routes.length">
    <div class="space-y-8">
      <div class="flex">
        <div>
          <p class="max-w-2xl text-sm text-gray-500 dark:text-gray-400">
            {{ t('standalone.routes.route_description') }}
          </p>
        </div>
        <NeButton
          v-if="routes.length >= 1"
          kind="primary"
          class="ml-auto self-start"
          @click="openCreateRoute()"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faCirclePlus" />
          </template>
          {{ t('standalone.routes.create_route') }}
        </NeButton>
      </div>
    </div>
  </div>
  <NeInlineNotification
    v-if="error.notificationTitle"
    class="my-4"
    kind="error"
    :title="error.notificationTitle"
    :description="error.notificationDescription"
  />
  <div v-if="!loading && routes.length">
    <div class="my-4">
      <NeButton
        v-if="routes && routes.length && routes.length > 10"
        kind="tertiary"
        size="sm"
        class="-ml-2"
        @click="scrollToMainTable()"
      >
        {{ t('standalone.routes.main_table') }}
      </NeButton>
    </div>
    <div class="space-y-6">
      <NeSkeleton v-if="loading" :lines="3" :size="'sm'" />
      <template v-if="!loading && routes.length > 0">
        <NeTable
          :ariaLabel="t('standalone.routes.title')"
          cardBreakpoint="xl"
          :loading="loading"
          :skeletonColumns="7"
          :skeletonRows="5"
        >
          <NeTableHead>
            <NeTableHeadCell>{{ t('standalone.routes.route_name') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.routes.route_interface') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.routes.route_network_address') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.routes.route_gateway') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.routes.route_metric') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.routes.route_status_table') }}</NeTableHeadCell>
            <NeTableHeadCell>
              <!-- no header for actions -->
            </NeTableHeadCell>
          </NeTableHead>
          <NeTableBody>
            <NeTableRow v-if="!paginatedItemsRoutes.length">
              <NeTableCell colspan="7">
                <NeEmptyState
                  :title="t('ne_table.no_items')"
                  :icon="['fas', 'table']"
                  class="bg-white dark:bg-gray-950"
                />
              </NeTableCell>
            </NeTableRow>
            <NeTableRow v-else v-for="item in paginatedItemsRoutes" :key="item.id">
              <NeTableCell :data-label="t('standalone.routes.route_name')">
                <div :class="{ 'opacity-30': item.disabled !== '0' }">
                  <span v-if="item.ns_description">{{ item.ns_description }}</span>
                  <span v-else>-</span>
                </div>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.routes.route_interface')">
                <div :class="{ 'opacity-30': item.disabled !== '0' }">
                  <span>
                    <FontAwesomeIcon
                      v-if="item.interface && item.interface === 'wan'"
                      :icon="faEarthAmerica"
                    />
                    <FontAwesomeIcon
                      v-if="
                        item.interface &&
                        (item.interface === 'lan' || item.interface === 'loopback')
                      "
                      :icon="faLocationDot"
                    />
                    {{ item.interface ? item.interface : t('common.any') }}
                  </span>
                </div>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.routes.route_network_address')">
                <div :class="{ 'opacity-30': item.disabled !== '0' }">
                  {{ item.target }}
                </div>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.routes.route_gateway')">
                <div :class="{ 'opacity-30': item.disabled !== '0' }">
                  {{ item.gateway || '-' }}
                </div>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.routes.route_metric')">
                <div :class="{ 'opacity-30': item.disabled !== '0' }">
                  {{ item.metric }}
                </div>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.routes.route_status_table')">
                <div :class="{ 'opacity-30': item.disabled !== '0' }">
                  <span v-if="item.disabled === '0'">
                    <FontAwesomeIcon :icon="faCircleCheck" />
                    {{ t('standalone.routes.route_status_enabled') }}
                  </span>
                  <span v-else>
                    <FontAwesomeIcon :icon="faCircleXmark" />
                    {{ t('standalone.routes.route_status_disabled') }}
                  </span>
                </div>
              </NeTableCell>
              <NeTableCell :data-label="t('common.actions')">
                <div class="-ml-2.5 flex gap-2 xl:ml-0 xl:justify-end">
                  <NeButton
                    kind="tertiary"
                    size="lg"
                    :disabled="item.readonly"
                    @click="openEditRoute({ item: { item: item } })"
                  >
                    <template #prefix>
                      <font-awesome-icon
                        :icon="['fas', 'pen-to-square']"
                        class="h-4 w-4"
                        aria-hidden="true"
                      />
                    </template>
                    {{ t('common.edit') }}
                  </NeButton>
                  <NeDropdown
                    :items="[
                      {
                        id: 'delete',
                        danger: true,
                        label: t('common.delete'),
                        disabled: item.readonly,
                        icon: 'trash',
                        action: () => {
                          deleteRouteId = item.id
                          deleteRouteName = item.ns_description || item.target
                        }
                      }
                    ]"
                    align-to-right
                  />
                </div>
              </NeTableCell>
            </NeTableRow>
          </NeTableBody>
          <template #paginator>
            <NePaginator
              :current-page="currentPageRoutes"
              :total-rows="routes.length"
              :page-size="pageSizeRoutes"
              :nav-pagination-label="t('ne_table.pagination')"
              :next-label="t('ne_table.go_to_next_page')"
              :previous-label="t('ne_table.go_to_previous_page')"
              :range-of-total-label="t('ne_table.of')"
              :page-size-label="t('ne_table.show')"
              @select-page="
                (page: number) => {
                  currentPageRoutes = page
                }"
              @selectPageSize="
                (size: number) => {
                  pageSizeRoutes = size
                }"
            />
          </template>
        </NeTable>
      </template>
      <div id="divMainTable">
        <NeHeading tag="h5" class="mb-2">{{ t('standalone.routes.main_table') }}</NeHeading>
        <template v-if="!loading">
          <NeTable
            :ariaLabel="t('standalone.routes.main_table')"
            cardBreakpoint="xl"
            :loading="loading"
            :skeletonColumns="5"
            :skeletonRows="5"
          >
            <NeTableHead>
              <NeTableHeadCell>{{ t('standalone.routes.route_interface') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.routes.route_network_address') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.routes.route_gateway') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.routes.route_metric') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.routes.route_protocol') }}</NeTableHeadCell>
            </NeTableHead>
            <NeTableBody>
              <NeTableRow v-if="!paginatedItemsTable.length">
                <NeTableCell colspan="5">
                  <NeEmptyState
                    :title="t('ne_table.no_items')"
                    :icon="['fas', 'table']"
                    class="bg-white dark:bg-gray-950"
                  />
                </NeTableCell>
              </NeTableRow>
              <NeTableRow v-else v-for="item in paginatedItemsTable" :key="item.id">
                <NeTableCell :data-label="t('standalone.routes.route_interface')">
                  <div>
                    {{ item.interface }}
                  </div>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.routes.route_network_address')">
                  <div>
                    {{ item.network }}
                  </div>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.routes.route_gateway')">
                  <div>
                    <span v-if="item.gateway">{{ item.gateway }}</span>
                    <span v-else>-</span>
                  </div>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.routes.route_metric')">
                  <div>
                    <span v-if="item.metric">{{ item.metric }}</span>
                    <span v-else>-</span>
                  </div>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.routes.route_protocol')">
                  <div>
                    <span v-if="item.protocol">{{ item.protocol }}</span>
                    <span v-else>-</span>
                  </div>
                </NeTableCell>
              </NeTableRow>
            </NeTableBody>
            <template #paginator>
              <NePaginator
                :current-page="currentPageTable"
                :total-rows="table.length"
                :page-size="pageSizeTable"
                :nav-pagination-label="t('ne_table.pagination')"
                :next-label="t('ne_table.go_to_next_page')"
                :previous-label="t('ne_table.go_to_previous_page')"
                :range-of-total-label="t('ne_table.of')"
                :page-size-label="t('ne_table.show')"
                @select-page="
                  (page: number) => {
                    currentPageTable = page
                  }"
                @selectPageSize="
                  (size: number) => {
                    pageSizeTable = size
                  }"
              />
            </template>
          </NeTable>
        </template>
      </div>
    </div>
  </div>
  <CreateOrEditRouteDrawer
    :protocol="props.protocol"
    :create-default="routes.length < 1"
    :is-shown="createEditRoute"
    :edit-route="selectedRoute"
    @abort-creation="createEditRoute = false"
    @route-created="routeCreatedEditedHandler()"
    @route-edited="routeCreatedEditedHandler()"
  />
  <!-- delete route modal -->
  <NeModal
    :primary-button-disabled="deleting"
    :primary-button-loading="deleting"
    :primary-label="t('common.delete')"
    :cancelLabel="t('common.cancel')"
    :title="t('standalone.routes.delete_route')"
    :visible="deleteRouteId !== undefined"
    kind="warning"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @close="deleteRouteId = undefined"
    @primary-click="deleteRouteHandler()"
  >
    <div>
      {{ t('standalone.routes.delete_route_name', { name: deleteRouteName }) }}
    </div>
    <NeInlineNotification
      v-if="deleteError"
      :title="t(getAxiosErrorMessage(deleteError.message))"
      kind="error"
    />
  </NeModal>
</template>
