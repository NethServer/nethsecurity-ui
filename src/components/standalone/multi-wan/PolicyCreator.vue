<script lang="ts" setup>
import type { NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import {
  getAxiosErrorMessage,
  NeButton,
  NeCombobox,
  NeFormItemLabel,
  NeInlineNotification,
  NeRadioSelection,
  NeSideDrawer,
  NeSkeleton,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError, AxiosResponse } from 'axios'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { useMwanConfig } from '@/composables/useMwanConfig'
import { MessageBag, validateRequired, validateUciName } from '@/lib/validation'
import { useMwanDefaults } from '@/composables/useMwanDefaults'

const { t } = useI18n()

/**
 * Interface describing the get firewall response
 */
interface FirewallResponse {
  values: {
    [name: string]: {
      name: string
      network: Array<string>
    }
  }
}

/**
 * Gateway definition.
 */
class Gateway {
  id: string
  weight: string

  constructor(id: string = '', weight: string = '100') {
    this.id = id
    this.weight = weight
  }
}

/**
 * Reactive state interface.
 */
interface Form {
  label: string
  selection: string
  priorities: Array<Array<Gateway>>
}

/**
 * RadioSelection options
 */
const policyOptions = [
  {
    id: 'balance',
    label: t('standalone.multi_wan.behave_picker.balance')
  },
  {
    id: 'backup',
    label: t('standalone.multi_wan.behave_picker.backup')
  },
  {
    id: 'custom',
    label: t('standalone.multi_wan.behave_picker.custom')
  }
]

const props = defineProps({
  isShown: {
    type: Boolean,
    required: true
  },
  createDefault: {
    type: Boolean,
    default: false
  }
})

const mwanConfig = reactive(useMwanConfig())
const mwanDefaults = reactive(useMwanDefaults())

const form = ref<Form>({
  label: '',
  selection: policyOptions[0].id,
  priorities: [[new Gateway(), new Gateway()]]
})
const gateways = ref<Array<NeComboboxOption>>()
const error = ref<Error>()
const loading = ref(false)
const saving = ref(false)
const messageBag = ref(new MessageBag())

const labelElement = ref<HTMLInputElement | null>(null)

/**
 * Weather the button should be disabled or not once deletion.
 */
const isTrashButtonDisabled = computed<boolean>(() => {
  if (form.value.selection == 'balance') {
    return form.value.priorities[0].length < 3
  } else if (form.value.selection == 'backup') {
    return form.value.priorities.length < 3
  }
  return false
})

/**
 * Map transformation of priorities and gateways between behaviours, allows to keep previous values set.
 */
watch(
  () => form.value.selection,
  () => {
    if (form.value.selection == 'backup') {
      form.value.priorities = form.value.priorities
        .map((priority) => priority.map((gateway) => [gateway]))
        .flat(1)
      for (let i = form.value.priorities.length; i < 2; i++) {
        form.value.priorities.push([new Gateway()])
      }
    } else if (form.value.selection == 'balance') {
      form.value.priorities = [form.value.priorities.flat(1)]
      for (let i = form.value.priorities[0].length; i < 2; i++) {
        form.value.priorities[0].push(new Gateway())
      }
    }
  }
)

/**
 * Focus and populate first element on open, delay by 50ms due to DOM creation.
 */
watch(
  () => props.isShown,
  () => {
    if (props.createDefault) {
      form.value.label = 'Default'
    }
    if (props.isShown && !props.createDefault) {
      setTimeout(() => labelElement.value?.focus(), 50)
    }
  }
)

/**
 * Get error from mwanDefaults if any
 */
watch(
  () => mwanDefaults.error,
  () => (error.value = mwanDefaults.error)
)

/**
 * Get error from mwanConfig if any
 */
watch(
  () => mwanConfig.error,
  () => (error.value = mwanConfig.error)
)

const emit = defineEmits(['policyCreated', 'abortCreation'])

onMounted(() => fetchGateways())

/**
 * Get gateways from the 'wan' firewall zone.
 */
function fetchGateways() {
  loading.value = true
  ubusCall('uci', 'get', { config: 'firewall', type: 'zone' })
    .then(
      (response: AxiosResponse<FirewallResponse>) =>
        (gateways.value = Object.entries(response.data.values)
          .filter((value) => value[1].name == 'wan')
          .flatMap((value) => value[1].network)
          .map((value) => {
            return {
              id: value,
              label: value
            }
          }))
    )
    .catch((exception: AxiosError) => (error.value = new Error(t(getAxiosErrorMessage(exception)))))
    .finally(() => (loading.value = false))
}

/**
 * If there's a priority that is empty, remove it.
 */
function cleanPriorities() {
  form.value.priorities = form.value.priorities.filter((priority) => priority.length > 0)
}

/**
 * Validation form.
 */
function validate(): boolean {
  messageBag.value = new MessageBag()
  let errMessage = validateRequired(form.value.label).errMessage
  if (errMessage) {
    messageBag.value.set('label', [t(errMessage.valueOf())])
    labelElement.value?.focus()
  }
  errMessage = validateUciName(form.value.label).errMessage
  if (errMessage) {
    messageBag.value.set('label', [t(errMessage.valueOf())])
    labelElement.value?.focus()
  }
  // TODO: implement priority/gateway validation
  return !(messageBag.value.size > 0)
}

/**
 * Create every entity needed for the policy to work. Interfaces, Members, Policies and Default Rule (if missing)
 */
function createPolicy() {
  if (validate()) {
    saving.value = true
    // group all calls in one big promise
    let calls: Promise<any>[] = []
    // interface creation
    calls.push(
      // start with organizing the interfaces to create
      ...form.value.priorities
        // flatten all priorities, get only the gateways picked
        .map((priorities) => priorities.map((gateway) => gateway))
        .flat(1)
        // gateways must not already exist, this filters them out
        .filter((gateway) => !mwanConfig.interfaces.some((iface) => iface.name == gateway.id))
        // map all in multiple calls
        .map((gateway) =>
          ubusCall('uci', 'add', {
            config: 'mwan3',
            name: gateway.id,
            type: 'interface',
            values: {
              enabled: '1',
              initial_state: mwanDefaults.data!.values.initial_state,
              family: mwanDefaults.data!.values.protocol,
              track_ip: mwanDefaults.data!.values.track_ip,
              track_method: mwanDefaults.data!.values.tracking_method,
              reliability: mwanDefaults.data!.values.tracking_reliability,
              count: mwanDefaults.data!.values.ping_count,
              size: mwanDefaults.data!.values.ping_size,
              max_ttl: mwanDefaults.data!.values.ping_max_ttl,
              timeout: mwanDefaults.data!.values.ping_timeout,
              interval: mwanDefaults.data!.values.ping_interval,
              failure_interval: mwanDefaults.data!.values.ping_failure_interval,
              recovery_interval: mwanDefaults.data!.values.ping_recovery_interval,
              down: mwanDefaults.data!.values.interface_down_threshold,
              up: mwanDefaults.data!.values.interface_up_threshold
            }
          })
        )
    )
    // member creation
    calls.push(
      // for each priority we'll have +10 metric applied
      ...form.value.priorities
        .map((priority, index) =>
          // call 'add' to each gateway
          priority.map((gateway) =>
            ubusCall('uci', 'add', {
              config: 'mwan3',
              name: `${gateway.id}_M${(index + 1) * 10}_W${gateway.weight ?? 100}`,
              type: 'member',
              values: {
                interface: gateway.id,
                metric: (index + 1) * 10,
                weight: gateway.weight ?? 100
              }
            })
          )
        )
        // flatten array, we have nested promises here
        .flat(1)
    )
    calls.push(
      // create policy
      ubusCall('uci', 'add', {
        config: 'mwan3',
        name: form.value.label,
        type: 'policy',
        values: {
          // map gateways to members name
          // TODO: reuse name generation logic from above
          use_member: form.value.priorities
            .map((priority, index) =>
              priority.map(
                (gateway) => `${gateway.id}_M${(index + 1) * 10}_W${gateway.weight ?? 100}`
              )
            )
            .flat(1)
        }
      })
    )
    // if this is the default policy, create a default rule too
    if (props.createDefault) {
      calls.push(
        ubusCall('uci', 'add', {
          config: 'mwan3',
          name: 'DefaultRule',
          type: 'rule',
          values: {
            proto: 'all',
            src_ip: '0.0.0.0/0',
            dest_ip: '0.0.0.0/0',
            sticky: '0',
            use_policy: form.value.label
          }
        })
      )
    }
    // If all calls are successful, go forth and reload the UI
    // TODO: implement error catching, with rollback.
    Promise.all(calls).then(() => {
      saving.value = false
      emit('policyCreated')
    })
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="t('standalone.multi_wan.create_policy', { name: form.label })"
  >
    <NeSkeleton v-if="loading" :lines="10" />
    <NeInlineNotification v-else-if="error" :kind="'error'" :title="error.message" />
    <div v-else class="space-y-8">
      <NeTextInput
        ref="labelElement"
        v-model="form.label"
        :disabled="createDefault"
        :invalid-message="messageBag.get('label')?.[0]"
        :label="t('standalone.multi_wan.label_input_label')"
      />
      <NeRadioSelection
        v-model="form.selection"
        :label="t('standalone.multi_wan.behave_picker.choose_behaviour')"
        :options="policyOptions"
        :screen-reader-help-text="t('standalone.multi_wan.behave_picker.choose_behaviour_sr')"
      />
      <div v-for="(priority, index) in form.priorities" :key="index" class="space-y-4">
        <NeFormItemLabel v-if="form.priorities.length > 1">
          {{ t('standalone.multi_wan.priority', index + 1) }}
        </NeFormItemLabel>
        <template v-for="(gateway, index) in priority" :key="index">
          <div class="flex gap-x-4">
            <NeCombobox
              v-model="gateway.id"
              :options="gateways"
              :placeholder="t('standalone.multi_wan.choose_gateway')"
              class="grow"
            />
            <NeTextInput
              v-if="form.selection != 'backup'"
              v-model.number="gateway.weight"
              :placeholder="t('standalone.multi_wan.weight')"
            />
            <NeButton
              :disabled="isTrashButtonDisabled"
              @click=";[priority.splice(index, 1), cleanPriorities()]"
            >
              <FontAwesomeIcon :icon="['fas', 'trash']" />
            </NeButton>
          </div>
        </template>
        <NeButton
          v-if="form.selection != 'backup'"
          :kind="'tertiary'"
          @click="priority.push(new Gateway())"
        >
          {{ t('standalone.multi_wan.add_gateway') }}
        </NeButton>
      </div>
      <NeButton v-if="form.selection != 'balance'" @click="form.priorities.push([new Gateway()])">
        <template #prefix>
          <FontAwesomeIcon :icon="faPlus" />
        </template>
        Add Priority level
      </NeButton>
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="saving" :kind="'tertiary'" @click="emit('abortCreation')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="createPolicy()">
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
