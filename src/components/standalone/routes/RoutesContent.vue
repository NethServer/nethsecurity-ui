<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { onMounted, ref } from 'vue'

import {
  getAxiosErrorMessage,
  NeButton,
  NeSkeleton,
  NeDropdown,
  NeTitle,
  NeModal,
  NeEmptyState,
  NeInlineNotification
} from '@nethserver/vue-tailwind-lib'
import NeTable from '@/components/standalone/NeTable.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  faCirclePlus,
  faEarthAmerica,
  faLocationDot,
  faCircleCheck,
  faCircleXmark
} from '@fortawesome/free-solid-svg-icons'
import { faEmptySet } from '@nethesis/nethesis-solid-svg-icons'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
const { t } = useI18n()
import CreateOrEditRouteDrawer from '@/components/standalone/routes/CreateOrEditRouteDrawer.vue'
import { AxiosError } from 'axios'
const uciPendingChangesStore = useUciPendingChangesStore()

/**
 * Props parent component
 */
const props = defineProps({
  protocol: {
    type: String,
    required: true
  }
})

let createEditRoute = ref(false)
let routes: any = ref({})
let table: any = ref({})
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

    if (res.data) table.value = res.data.table
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
  <NeSkeleton v-if="loading" :lines="15" />
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
          <p class="text-sm text-gray-500 dark:text-gray-400">
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
          :data="routes"
          :headers="[
            {
              key: 'ns_description',
              label: t('standalone.routes.route_name')
            },
            {
              key: 'interface',
              label: t('standalone.routes.route_interface')
            },
            {
              key: 'target',
              label: t('standalone.routes.route_network_address')
            },
            {
              key: 'gateway',
              label: t('standalone.routes.route_gateway')
            },
            {
              key: 'metric',
              label: t('standalone.routes.route_metric')
            },
            {
              key: 'status',
              label: t('standalone.routes.route_status_table')
            },
            {
              key: 'actions'
            }
          ]"
          :loading="loading"
        >
          <template #tbody>
            <tbody>
              <template v-for="item in routes" :key="item.id">
                <tr>
                  <td :class="{ 'opacity-30': item.disabled !== '0' }">
                    <span v-if="item.ns_description">{{ item.ns_description }}</span>
                    <span v-else>-</span>
                  </td>
                  <td :class="{ 'opacity-30': item.disabled !== '0' }">
                    <span>
                      <FontAwesomeIcon v-if="!item.interface" :icon="faEmptySet" />
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
                      {{
                        item.interface
                          ? item.interface
                          : t('standalone.routes.interface_unspecified')
                      }}
                    </span>
                  </td>
                  <td :class="{ 'opacity-30': item.disabled !== '0' }">
                    {{ item.target }}
                  </td>
                  <td :class="{ 'opacity-30': item.disabled !== '0' }">
                    {{ item.gateway }}
                  </td>
                  <td :class="{ 'opacity-30': item.disabled !== '0' }">
                    {{ item.metric }}
                  </td>
                  <td :class="{ 'opacity-30': item.disabled !== '0' }">
                    <span v-if="item.disabled === '0'">
                      <FontAwesomeIcon :icon="faCircleCheck" />
                      {{ t('standalone.routes.route_status_enabled') }}
                    </span>
                    <span v-else>
                      <FontAwesomeIcon :icon="faCircleXmark" />
                      {{ t('standalone.routes.route_status_disabled') }}
                    </span>
                  </td>
                  <td class="flex justify-end">
                    <NeButton
                      kind="tertiary"
                      size="lg"
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
                          action: () => {
                            deleteRouteId = item.id
                            deleteRouteName = item.ns_description
                          }
                        }
                      ]"
                      align-to-right
                    />
                  </td>
                </tr>
              </template>
            </tbody>
          </template>
        </NeTable>
      </template>
      <div id="divMainTable">
        <NeTitle level="h3">{{ t('standalone.routes.main_table') }}</NeTitle>
        <template v-if="!loading && table.length > 0">
          <NeTable
            :data="table"
            :readonly="true"
            :headers="[
              {
                key: 'interface',
                label: t('standalone.routes.route_interface')
              },
              {
                key: 'network',
                label: t('standalone.routes.route_network_address')
              },
              {
                key: 'gateway',
                label: t('standalone.routes.route_gateway')
              },
              {
                key: 'metric',
                label: t('standalone.routes.route_metric')
              },
              {
                key: 'protocol',
                label: t('standalone.routes.route_protocol')
              }
            ]"
            :loading="loading"
          >
            <template #tbody>
              <tbody>
                <template v-for="item in table" :key="item.id">
                  <tr>
                    <td>
                      {{ item.interface }}
                    </td>
                    <td>
                      {{ item.network }}
                    </td>
                    <td>
                      <span v-if="item.gateway">{{ item.gateway }}</span>
                      <span v-else>-</span>
                    </td>
                    <td>
                      <span v-if="item.metric">{{ item.metric }}</span>
                      <span v-else>-</span>
                    </td>
                    <td>
                      {{ item.protocol }}
                    </td>
                  </tr>
                </template>
              </tbody>
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
  <NeModal
    :primary-button-disabled="deleting"
    :primary-button-loading="deleting"
    :primary-label="t('common.delete')"
    :secondary-button-disabled="deleting"
    :title="t('standalone.routes.delete_route_ipv4')"
    :visible="deleteRouteId !== undefined"
    kind="warning"
    primary-button-kind="danger"
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
