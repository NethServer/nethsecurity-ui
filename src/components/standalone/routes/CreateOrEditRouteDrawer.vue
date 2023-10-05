<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeCombobox,
  NeInlineNotification,
  NeSideDrawer,
  NeSkeleton,
  NeTextInput,
  NeToggle,
  NeTooltip
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { onMounted, ref, watch } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'
import { MessageBag, validateRequired } from '@/lib/validation'
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
  network_address: props.protocol === 'ipv4' ? '0.0.0.0/0' : '::/0',
  gateway: props.protocol === 'ipv4' ? '192.168.9.1' : 'fe80::1',
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
let messageBag = ref(new MessageBag())
let isExpandedAdvancedSettings = ref(false)
let labelElement = ref<HTMLInputElement | null>(null)

let objError = {
  notificationTitle: '',
  notificationDescription: ''
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
    if (props.editRoute) {
      let selectedRoute = props.editRoute
      if (selectedRoute && selectedRoute.item) {
        if (selectedRoute.item.id) form.value.id = selectedRoute.item.id
        if (selectedRoute.item.disabled) form.value.status = selectedRoute.item.disabled === '0'
        if (selectedRoute.item.ns_description) form.value.name = selectedRoute.item.ns_description
        if (selectedRoute.item.target) form.value.network_address = selectedRoute.item.target
        if (selectedRoute.item.gateway) form.value.gateway = selectedRoute.item.gateway
        if (selectedRoute.item.metric) form.value.metric = selectedRoute.item.metric
        if (selectedRoute.item.interface) form.value.routeInterface = selectedRoute.item.interface
        if (selectedRoute.item.type) form.value.routeType = selectedRoute.item.type
        if (selectedRoute.item.mtu) form.value.mtu = selectedRoute.item.mtu
        if (selectedRoute.item.onlink) form.value.onlink = selectedRoute.item.mtu === '0'
      } else form.value = { ...originalForm }
    } else form.value = { ...originalForm }
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
    if (props.editRoute.item) title = t('standalone.routes.edit_route_ipv4')
  } else if (props.protocol === 'ipv6') {
    title = t('standalone.routes.create_route_ipv6')
    if (props.editRoute.item) title = t('standalone.routes.edit_route_ipv6')
  }
  return title
}

/**
 * Get interfaces and route types
 */
function getFirewallData() {
  loading.value = true
  error = ref({ ...objError })
  errorLoadingData = ref({ ...objError })

  let promises: Promise<any>[] = []

  // Retrive list interfaces
  promises.push(ubusCall('ns.routes', 'list-interfaces', {}))

  // Retrive list route types
  promises.push(ubusCall('ns.routes', 'list-route-types', {}))

  Promise.all(promises)
    .then((values) => {
      if (
        values[0] &&
        values[0].data &&
        values[0].data.interfaces &&
        values[0].data.interfaces.length
      )
        routeInterfaces.value = values[0].data.interfaces.map((item: RouteInterface) => ({
          id: item,
          label: item
        }))

      if (values[1] && values[1].data && values[1].data.types && values[1].data.types.length)
        routeTypes.value = values[1].data.types.map((item: RouteType) => ({
          id: item,
          label: item
        }))
    })
    .catch((exception: AxiosError) => {
      errorLoadingData.value.notificationTitle = t('standalone.routes.retrive_error')
      errorLoadingData.value.notificationDescription = t(getAxiosErrorMessage(exception))
    })
    .finally(() => (loading.value = false))
}

/**
 * Validation form.
 */
function validate(): boolean {
  messageBag.value = new MessageBag()
  let errMessage = validateRequired(form.value.network_address).errMessage
  if (errMessage) {
    messageBag.value.set('label', [t(errMessage.valueOf())])
    labelElement.value?.focus()
  }
  errMessage = validateRequired(form.value.gateway).errMessage
  if (errMessage) {
    messageBag.value.set('label', [t(errMessage.valueOf())])
    labelElement.value?.focus()
  }
  return !(messageBag.value.size > 0)
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
          if (!form.value.status) methodUpdateStatus = 'disable-route'

          ubusCall('ns.routes', methodUpdateStatus, {
            id: response.data.id
          })
        }
      })
      .catch((exception: AxiosError) => {
        error.value.notificationTitle = t('standalone.routes.cannot_create_route')
        error.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => (saving.value = false))

    emit('routeCreated')
  }
}

function editRoute() {
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
          if (!form.value.status) methodUpdateStatus = 'disable-route'

          ubusCall('ns.routes', methodUpdateStatus, {
            id: response.data.id
          })
        }
      })
      .catch((exception: AxiosError) => {
        error.value.notificationTitle = t('standalone.routes.cannot_edit_route')
        error.value.notificationDescription = t(getAxiosErrorMessage(exception))
      })
      .finally(() => (saving.value = false))

    emit('routeEdited')
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
      {{ t('standalone.routes.route_status') }}
      <NeToggle
        v-model="form.status"
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
        :invalid-message="messageBag.get('label')?.[0]"
        :placeholder="props.protocol === 'ipv4' ? '0.0.0.0/0' : '::/0'"
        :label="t('standalone.routes.route_network_address')"
      />
      <NeTextInput
        v-model="form.gateway"
        :invalid-message="messageBag.get('label')?.[0]"
        :placeholder="props.protocol === 'ipv4' ? '192.168.9.1' : 'fe80::1'"
        :label="t('standalone.routes.route_gateway')"
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
        placeholder="0"
        :label="t('standalone.routes.route_metric')"
      />
      <NeCombobox
        v-model="form.routeInterface"
        :options="routeInterfaces"
        :label="t('standalone.routes.route_interface')"
        :placeholder="t('standalone.routes.route_choose_interface')"
        class="grow"
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
          />
          <NeTextInput
            v-model="form.mtu"
            invalid-message=""
            placeholder="1500"
            :label="t('standalone.routes.route_mtu')"
          />
          <NeToggle v-model="form.onlink" :label="t('standalone.routes.route_onlink')" />
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
        <NeButton
          v-else
          :disabled="saving"
          :kind="'primary'"
          :loading="saving"
          @click="editRoute()"
        >
          {{ t('common.edit') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
