<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  NeCombobox,
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeSkeleton,
  NeTooltip,
  NeTextInput,
  getAxiosErrorMessage,
  focusElement
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { onMounted, ref, watch } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'
import {
  validateRequired,
  validateIp4Address,
  validateIp6Address,
  validateIp4Cidr,
  validateIp6Cidr,
  validateIpv4Mtu,
  validateIpv6Mtu
} from '@/lib/validation'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
const { t } = useI18n()

/**
 * Props parent component
 */
const props = defineProps({
  protocol: {
    type: String,
    required: true
  },
  isShown: {
    type: Boolean,
    required: true
  },
  editRoute: {
    type: Object,
    required: true
  }
})

/**
 * Reactive state interface.
 */
interface Form {
  id: string
  name: string
  status: boolean
  network_address: string
  gateway: string
  metric: string
  routeInterface: string
  routeType: string
  mtu: string
  onlink: boolean
}

interface RouteInterface {
  id: string
  label: string
}

interface RouteType {
  id: string
  label: string
}

const originalForm = {
  id: '',
  name: '',
  status: true,
  network_address: '',
  gateway: '',
  metric: '0',
  routeInterface: '',
  routeType: 'unicast',
  mtu: '1500',
  onlink: false
}

const form = ref<Form>({ ...originalForm })

let routeInterfaces = ref<Array<RouteInterface>>()
let routeTypes = ref<Array<RouteType>>()
let loading = ref(false)
let saving = ref(false)
let isExpandedAdvancedSettings = ref(false)
let networkAddressRef = ref()
let gatewayRef = ref()
let metricRef = ref()
let mtuRef = ref()

let objError = {
  notificationTitle: '',
  notificationDescription: '',
  networkAddress: '',
  gateway: '',
  metric: '',
  mtu: ''
}
let error = ref({ ...objError })
let errorLoadingData = ref({ ...objError })

const emit = defineEmits(['routeCreated', 'routeEdited', 'abortCreation'])

/**
 * Watch props.editRoute for edit route
 */
watch(
  () => props.editRoute,
  () => {
    error = ref({ ...objError })
    errorLoadingData = ref({ ...objError })

    if (props.editRoute) {
      let selectedRoute = props.editRoute
      if (selectedRoute && selectedRoute.item) {
        if (selectedRoute.item.id) {
          form.value.id = selectedRoute.item.id
        }
        if (selectedRoute.item.disabled) {
          form.value.status = selectedRoute.item.disabled === '0'
        }
        if (selectedRoute.item.ns_description) {
          form.value.name = selectedRoute.item.ns_description
        }
        if (selectedRoute.item.target) {
          form.value.network_address = selectedRoute.item.target
        }
        if (selectedRoute.item.gateway) {
          form.value.gateway = selectedRoute.item.gateway
        }
        if (selectedRoute.item.metric) {
          form.value.metric = selectedRoute.item.metric
        }
        if (selectedRoute.item.interface) {
          form.value.routeInterface = selectedRoute.item.interface
        }
        if (selectedRoute.item.type) {
          form.value.routeType = selectedRoute.item.type
        }
        if (selectedRoute.item.mtu) {
          form.value.mtu = selectedRoute.item.mtu
        }
        if (selectedRoute.item.onlink) {
          form.value.onlink = selectedRoute.item.onlink === '1'
        }
      } else {
        form.value = { ...originalForm }
      }
    } else {
      form.value = { ...originalForm }
    }
  }
)

onMounted(() => {
  getFirewallData()
})

/**
 * Set static string translation IPv4 or IPv6
 */
function getDrawerTitle() {
  let title = ''
  if (props.protocol === 'ipv4') {
    title = t('standalone.routes.create_route_ipv4')
    if (props.editRoute.item) {
      title = t('standalone.routes.edit_route_ipv4')
    }
  } else if (props.protocol === 'ipv6') {
    title = t('standalone.routes.create_route_ipv6')
    if (props.editRoute.item) {
      title = t('standalone.routes.edit_route_ipv6')
    }
  }
  return title
}

/**
 * Get interfaces and route types
 */
async function getFirewallData() {
  loading.value = true
  error = ref({ ...objError })
  errorLoadingData = ref({ ...objError })

  // retrieve list interfaces && route types
  try {
    let getInterfaces = await ubusCall('ns.routes', 'list-interfaces', {})
    if (
      getInterfaces &&
      getInterfaces.data &&
      getInterfaces.data.interfaces &&
      getInterfaces.data.interfaces.length
    ) {
      let responseData = getInterfaces.data.interfaces
      responseData = responseData.filter((item: string) => item !== 'loopback')

      routeInterfaces.value = responseData.map((item: RouteInterface) => ({
        id: item,
        label: item
      }))
      if (routeInterfaces.value) {
        routeInterfaces.value.unshift({
          id: '',
          label: t('common.any')
        })
      }
    }
  } catch (exception: any) {
    errorLoadingData.value.notificationTitle = t('error.cannot_retrieve_interfaces')
    errorLoadingData.value.notificationDescription = t(getAxiosErrorMessage(exception))
  } finally {
    try {
      let getRouteTypes = await ubusCall('ns.routes', 'list-route-types', {})
      if (
        getRouteTypes &&
        getRouteTypes.data &&
        getRouteTypes.data.types &&
        getRouteTypes.data.types.length
      ) {
        routeTypes.value = getRouteTypes.data.types.map((item: RouteType) => ({
          id: item,
          label: item
        }))
      }
    } catch (exception: any) {
      errorLoadingData.value.notificationTitle = t('error.cannot_retrieve_route_types')
      errorLoadingData.value.notificationDescription = t(getAxiosErrorMessage(exception))
    } finally {
      loading.value = false
    }
  }
}

/**
 * Validation form.
 */
function validate(): boolean {
  let isValidationOk = true
  let isFocusInput = false

  // NETWORK ADDRESS
  if (form.value.network_address) {
    if (props.protocol === 'ipv4') {
      let { valid, errMessage } = validateIp4Cidr(form.value.network_address)
      if (!valid) {
        error.value.networkAddress = t(errMessage as string)
        isValidationOk = false
      }
    } else if (props.protocol === 'ipv6') {
      let { valid, errMessage } = validateIp6Cidr(form.value.network_address)
      if (!valid) {
        error.value.networkAddress = t(errMessage as string)
        isValidationOk = false
      }
    }
  } else {
    let { valid, errMessage } = validateRequired(form.value.network_address)
    if (!valid) {
      error.value.networkAddress = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk) {
    focusElement(networkAddressRef)
    isFocusInput = true
  }

  // GATEWAY
  if (form.value.gateway) {
    if (props.protocol === 'ipv4') {
      let { valid, errMessage } = validateIp4Address(form.value.gateway)
      if (!valid) {
        error.value.gateway = t(errMessage as string)
        isValidationOk = false
      }
    } else if (props.protocol === 'ipv6') {
      let { valid, errMessage } = validateIp6Address(form.value.gateway)
      if (!valid) {
        error.value.gateway = t(errMessage as string)
        isValidationOk = false
      }
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(gatewayRef)
    isFocusInput = true
  }

  // METRIC
  if (form.value.metric) {
    let validMetric = false

    if (!isNaN(Number(form.value.metric)) && Number(form.value.metric) >= 0) {
      validMetric = true
    }

    if (!validMetric) {
      error.value.metric = t('error.invalid_metric')
      isValidationOk = false
    }
  } else {
    let { valid, errMessage } = validateRequired(form.value.metric)
    if (!valid) {
      error.value.metric = t(errMessage as string)
      isValidationOk = false
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(metricRef)
    isFocusInput = true
  }

  // MTU
  if (form.value.mtu) {
    if (props.protocol === 'ipv4') {
      let { valid, errMessage } = validateIpv4Mtu(form.value.mtu)
      if (!valid) {
        error.value.mtu = t(errMessage as string)
        isValidationOk = false
        isExpandedAdvancedSettings.value = true
      }
    } else if (props.protocol === 'ipv6') {
      let { valid, errMessage } = validateIpv6Mtu(form.value.mtu)
      if (!valid) {
        error.value.mtu = t(errMessage as string)
        isValidationOk = false
        isExpandedAdvancedSettings.value = true
      }
    }
  } else {
    let { valid, errMessage } = validateRequired(form.value.mtu)
    if (!valid) {
      error.value.mtu = t(errMessage as string)
      isValidationOk = false
      isExpandedAdvancedSettings.value = true
    }
  }

  if (!isValidationOk && !isFocusInput) {
    focusElement(mtuRef)
  }

  return isValidationOk
}

/**
 * Create Route
 */
function createRoute() {
  if (validate()) {
    saving.value = true

    // create payload
    let payload = {
      disabled: form.value.status ? 1 : 0,
      target: form.value.network_address,
      gateway: form.value.gateway,
      metric: form.value.metric,
      interface: form.value.routeInterface,
      type: form.value.routeType,
      mtu: form.value.mtu,
      onlink: form.value.onlink,
      ns_description: form.value.name,
      protocol: props.protocol
    }

    ubusCall('ns.routes', 'add-route', payload)
      .then((response) => {
        if (response.data && response.data.id) {
          let methodUpdateStatus = 'enable-route'
          if (!form.value.status) {
            methodUpdateStatus = 'disable-route'
          }

          ubusCall('ns.routes', methodUpdateStatus, {
            id: response.data.id
          })
            .then(() => {
              emit('routeCreated')
            })
            .catch((exception: AxiosError) => {
              error.value.notificationTitle = t('error.cannot_update_status_route')
              error.value.notificationDescription = t(getAxiosErrorMessage(exception))
            })
            .finally(() => {
              saving.value = false
            })
        }
      })
      .catch((exception: AxiosError) => {
        error.value.notificationTitle = t('error.cannot_create_route')
        error.value.notificationDescription = t(getAxiosErrorMessage(exception))
        saving.value = false
      })
  }
}

function submit() {
  if (validate()) {
    saving.value = true

    // create payload
    let payload = {
      id: form.value.id,
      disabled: form.value.status ? 1 : 0,
      target: form.value.network_address,
      gateway: form.value.gateway,
      metric: form.value.metric,
      interface: form.value.routeInterface,
      type: form.value.routeType,
      mtu: form.value.mtu,
      onlink: form.value.onlink,
      ns_description: form.value.name,
      protocol: props.protocol
    }

    ubusCall('ns.routes', 'edit-route', payload)
      .then((response) => {
        if (response.data && response.data.id) {
          let methodUpdateStatus = 'enable-route'
          if (!form.value.status) {
            methodUpdateStatus = 'disable-route'
          }

          ubusCall('ns.routes', methodUpdateStatus, {
            id: response.data.id
          })
            .then(() => {
              emit('routeEdited')
            })
            .catch((exception: AxiosError) => {
              error.value.notificationTitle = t('error.cannot_update_status_route')
              error.value.notificationDescription = t(getAxiosErrorMessage(exception))
            })
            .finally(() => {
              saving.value = false
            })
        }
      })
      .catch((exception: AxiosError) => {
        error.value.notificationTitle = t('error.cannot_edit_route')
        error.value.notificationDescription = t(getAxiosErrorMessage(exception))
        saving.value = false
      })
  }
}
</script>

<template>
  <NeSideDrawer :is-shown="isShown" :title="getDrawerTitle()" @close="emit('abortCreation')">
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification
      v-if="errorLoadingData.notificationTitle"
      class="my-4"
      kind="error"
      :title="errorLoadingData.notificationTitle"
      :description="errorLoadingData.notificationDescription"
    />
    <div v-else class="space-y-8">
      <NeToggle
        v-model="form.status"
        :topLabel="t('common.status')"
        :label="
          form.status
            ? t('standalone.routes.route_status_enabled')
            : t('standalone.routes.route_status_disabled')
        "
      />
      <NeTextInput
        v-model="form.name"
        invalid-message=""
        :label="t('standalone.routes.route_name')"
        :optional="true"
      />
      <NeTextInput
        v-model="form.network_address"
        :invalid-message="error.networkAddress"
        :label="t('standalone.routes.route_network_address_cidr')"
        ref="networkAddressRef"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{
                props.protocol === 'ipv4'
                  ? t('standalone.routes.network_address_ip4_tooltip')
                  : t('standalone.routes.network_address_ip6_tooltip')
              }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeTextInput
        v-model="form.gateway"
        :invalid-message="error.gateway"
        :label="t('standalone.routes.route_gateway')"
        optional
        :optionalLabel="t('common.optional')"
        ref="gatewayRef"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.routes.route_gateway_helper') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeTextInput
        v-model="form.metric"
        :invalid-message="error.metric"
        placeholder="0"
        :label="t('standalone.routes.route_metric')"
        ref="metricRef"
      />
      <NeCombobox
        v-model="form.routeInterface"
        :options="routeInterfaces"
        :label="t('standalone.routes.route_interface')"
        :placeholder="t('standalone.routes.route_choose_interface')"
        class="grow"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
      />
      <NeButton
        kind="tertiary"
        size="sm"
        @click="isExpandedAdvancedSettings = !isExpandedAdvancedSettings"
        class="-ml-2"
      >
        <template #suffix>
          <FontAwesomeIcon
            :icon="['fas', isExpandedAdvancedSettings ? 'chevron-up' : 'chevron-down']"
            class="h-3 w-3"
            aria-hidden="true"
          />
        </template>
        {{ t('common.advanced_settings') }}
      </NeButton>
      <Transition name="slide-down">
        <div v-show="isExpandedAdvancedSettings" class="space-y-6">
          <NeCombobox
            v-model="form.routeType"
            :options="routeTypes"
            :label="t('standalone.routes.route_type')"
            :placeholder="t('standalone.routes.route_choose_type')"
            class="grow"
            :noResultsLabel="t('ne_combobox.no_results')"
            :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
            :noOptionsLabel="t('ne_combobox.no_options_label')"
            :selected-label="t('ne_combobox.selected')"
            :user-input-label="t('ne_combobox.user_input_label')"
            :optionalLabel="t('common.optional')"
          />
          <NeTextInput
            v-model="form.mtu"
            :invalid-message="error.mtu"
            placeholder="1500"
            :label="t('standalone.routes.route_mtu')"
            ref="mtuRef"
          />
          <NeToggle v-model="form.onlink" :label="t('standalone.routes.route_onlink')" />
          <NeInlineNotification
            kind="info"
            :description="t('standalone.routes.route_onlink_description')"
          />
        </div>
      </Transition>
      <NeInlineNotification
        v-if="error.notificationTitle"
        class="my-4"
        kind="error"
        :title="error.notificationTitle"
        :description="error.notificationDescription"
      />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="saving" :kind="'tertiary'" @click="emit('abortCreation')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          v-if="!props.editRoute.item"
          :disabled="saving"
          :kind="'primary'"
          :loading="saving"
          @click="createRoute()"
        >
          {{ t('common.save') }}
        </NeButton>
        <NeButton v-else :disabled="saving" :kind="'primary'" :loading="saving" @click="submit()">
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
