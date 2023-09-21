<script lang="ts" setup>
import type { NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import {
    getAxiosErrorMessage,
    NeButton, NeCombobox,
    NeInlineNotification,
    NeSideDrawer,
    NeSkeleton,
    NeTextInput,
    NeToggle
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError, AxiosResponse } from 'axios'
import { useRoutesConfig } from '@/composables/useRoutesConfig'
import { MessageBag, validateRequired, validateUciName } from '@/lib/validation'
//import { useMwanDefaults } from '@/composables/useMwanDefaults'

const { t } = useI18n()

/**
 * Reactive state interface.
 */
interface Form {
  name: string,
  status: boolean,
  network_address: string,
  gateway: string,
  metric: number,
  routeInterface: string,
  routeType: string,
  mtu: number,
  onlink: boolean
}

defineProps({
  isShown: {
    type: Boolean,
    required: true
  }
})

const routeConfig = reactive(useRoutesConfig())

const form = ref<Form>({
  name: '',
  status: true,
  network_address: '',
  gateway: '',
  metric: '',
  routeInterface: '',
  routeType: '',
  mtu: '',
  onlink: false
})
let routeInterfaces = ref<Array<NeComboboxOption>>()
let routeTypes = ref<Array<NeComboboxOption>>()
let error = ref<Error>()
let loading = ref(false)
let saving = ref(false)
let messageBag = ref(new MessageBag())
let isExpandedAdvancedSettings = ref(false)
let labelElement = ref<HTMLInputElement | null>(null)

/**
 * Get error from routeConfig if any
 */
watch(
  () => routeConfig.error,
  () => (error.value = routeConfig.error)
)

const emit = defineEmits(['routeCreated', 'abortCreation'])

onMounted(() => {
    fetchInterfaces()
    fetchRouteTypes()
})

/**
 * Get interfaces from the 'network -> interfaces and devices'.
 */
function fetchInterfaces() {
  loading.value = true
  ubusCall('ns.routes', 'list-interfaces', {})
    .then(response => { routeInterfaces.value = response.data.interfaces.map(item => ({ id: item, label: item })) })
    .catch((exception: AxiosError) => (error.value = new Error(t(getAxiosErrorMessage(exception)))))
    .finally(() => (loading.value = false))
}

/**
 * Get route types
 */
function fetchRouteTypes() {
  loading.value = true
  ubusCall('ns.routes', 'list-route-types', {})
    .then(response => { routeTypes.value = response.data.types.map(item => ({ id: item, label: item })) })
    .catch((exception: AxiosError) => (error.value = new Error(t(getAxiosErrorMessage(exception)))))
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
  errMessage = validateRequired(form.value.routeInterface).errMessage
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
      //table: ,
      interface: form.value.routeInterface,
      type: form.value.routeType,
      mtu: form.value.mtu,
      onlink: form.value.onlink,
      ns_description: form.value.name,
      protocol: "ipv4"
    };

    ubusCall('ns.routes', 'add-route', payload);

    saving.value = false
    emit('routeCreated')
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="t('standalone.routes.create_route_ipv4', { name: form.label })"
    @close="emit('abortCreation')"
  >
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification v-else-if="error" :kind="'error'" :title="error.message" />
    <div v-else class="space-y-8">
      {{ t('standalone.routes.route_status') }}
      <NeToggle
        v-model="form.status"
        :label="form.status ? t('standalone.routes.route_status_enabled') : t('standalone.routes.route_status_disabled')"
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
        placeholder="0.0.0.0/0"
        :label="t('standalone.routes.route_network_address')"
      />
      <NeTextInput
        v-model="form.gateway"
        :invalid-message="messageBag.get('label')?.[0]"
        placeholder="192.168.9.1"
        :helperText="t('standalone.routes.route_gateway_helper')"
        :label="t('standalone.routes.route_gateway')"
      />
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
       :invalid-message="messageBag.get('label')?.[0]"
       class="grow"
      />
      <NeButton
       kind="tertiary"
       size="sm"
       @click="isExpandedAdvancedSettings = !isExpandedAdvancedSettings"
       class="-ml-2"
      >
        <template #suffix>
          <font-awesome-icon
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
          <NeToggle
            v-model="form.onlink"
            :label="t('standalone.routes.route_onlink')"
          />
        </div>
      </Transition>
      <div class="flex justify-end gap-4">
        <NeButton :disabled="saving" :kind="'tertiary'" @click="emit('abortCreation')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="createRoute()">
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
