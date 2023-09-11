<script lang="ts" setup>
import type { PropType } from 'vue'
import { computed, onBeforeMount, reactive, ref, watch } from 'vue'
import type { Member, Policy } from '@/composables/useMwanConfig'
import { useMwanConfig } from '@/composables/useMwanConfig'
import {
  getAxiosErrorMessage,
  NeButton,
  NeCombobox,
  NeFormItemLabel,
  NeInlineNotification,
  NeRadioSelection,
  NeSkeleton,
  NeTextInput
} from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { groupBy } from 'lodash'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Gateway, PolicyOptions, usePolicyForm } from '@/composables/usePolicyForm'
import { ubusCall } from '@/lib/standalone/ubus'
import { useMwanDefaults } from '@/composables/useMwanDefaults'
import type { AxiosError } from 'axios'

const { t } = useI18n()

/**
 * Translates the policyOptions into labels.
 */
const policyOptionsSelection = [
  {
    id: PolicyOptions.BALANCE,
    label: t('standalone.multi_wan.behave_picker.balance')
  },
  {
    id: PolicyOptions.BACKUP,
    label: t('standalone.multi_wan.behave_picker.backup')
  },
  {
    id: PolicyOptions.CUSTOM,
    label: t('standalone.multi_wan.behave_picker.custom')
  }
]

const emit = defineEmits(['cancel', 'success'])

const policyForm = reactive(usePolicyForm())
const mwanConfig = reactive(useMwanConfig())
const mwanDefaults = reactive(useMwanDefaults())

const { form } = usePolicyForm()
const saving = ref(false)
const updateError = ref<Error>()

const props = defineProps({
  policy: {
    type: Object as PropType<Policy>,
    required: true
  }
})

/**
 * Weather the button should be disabled or not once deletion.
 */
const isTrashButtonDisabled = computed<boolean>(() => {
  if (form.value.selection == PolicyOptions.BALANCE) {
    return form.value.priorities[0].length < 3
  } else if (form.value.selection == PolicyOptions.BACKUP) {
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
    if (form.value.selection == PolicyOptions.BACKUP) {
      form.value.priorities = form.value.priorities
        .map((priority) => priority.map((gateway) => [gateway]))
        .flat(1)
      for (let i = form.value.priorities.length; i < 2; i++) {
        form.value.priorities.push([new Gateway()])
      }
    } else if (form.value.selection == PolicyOptions.BALANCE) {
      form.value.priorities = [form.value.priorities.flat(1)]
      for (let i = form.value.priorities[0].length; i < 2; i++) {
        form.value.priorities[0].push(new Gateway())
      }
    }
  }
)

/**
 * When removing a gateway, check if there's an empty priority, then clean if any.
 * @param priorityIndex
 * @param gatewayIndex
 */
function removeGateway(priorityIndex: number, gatewayIndex: number) {
  form.value.priorities[priorityIndex].splice(gatewayIndex, 1)
  form.value.priorities = form.value.priorities.filter((priority) => priority.length > 0)
}

/**
 * Delete the edited policy, then create it again with the edited values.
 */
function save() {
  //saving.value = true
  const promises: Promise<any>[] = []
  promises.push(
    ubusCall('uci', 'delete', {
      config: 'mwan3',
      section: props.policy?.name
    })
  )
  promises.push(
    ...form.value.priorities
      .flat()
      .filter((gateway) => !mwanConfig.interfaces.some((iface) => iface.name == gateway.id))
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
  promises.push(
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
      .flat()
  )
  promises.push(
    // create policy
    ubusCall('uci', 'add', {
      config: 'mwan3',
      name: props.policy?.name,
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
          .flat()
      }
    })
  )
  Promise.all(promises)
    .then(() => emit('success'))
    .catch(
      (exception: AxiosError) => (updateError.value = new Error(t(getAxiosErrorMessage(exception))))
    )
    .finally(() => (saving.value = false))
}

/**
 * Adapt the policy object to the form
 * TODO: might be better to put this inside a PolicyAdapter
 */
onBeforeMount(() => {
  const metrics = props.policy?.members.map((member) => member.metric)
  if (metrics.every((metric, index, array) => array[0] == metric)) {
    form.value.selection = PolicyOptions.BALANCE
  } else if (metrics.every((metric, index, array) => array.indexOf(metric) == index)) {
    form.value.selection = PolicyOptions.BACKUP
  } else {
    form.value.selection = PolicyOptions.CUSTOM
  }

  form.value.priorities = Object.values(groupBy(props.policy?.members, 'metric')).map(
    (members: Member[]) => {
      return members.map((member) => new Gateway(member.interface.name, String(member.weight)))
    }
  )
})
</script>
<template>
  <NeSkeleton v-if="policyForm.loading" :lines="20" />
  <NeInlineNotification
    v-else-if="policyForm.error"
    :title="t(getAxiosErrorMessage(policyForm.error))"
    kind="error"
  />
  <div v-else class="space-y-8">
    <NeRadioSelection
      v-model="form.selection"
      :label="t('standalone.multi_wan.behave_picker.choose_behaviour')"
      :options="policyOptionsSelection"
      :screen-reader-help-text="t('standalone.multi_wan.behave_picker.choose_behaviour_sr')"
    />
    <div
      v-for="(priority, priorityIndex) in form.priorities"
      :key="priorityIndex"
      class="space-y-4"
    >
      <NeFormItemLabel v-if="form.priorities.length > 1">
        {{ t('standalone.multi_wan.priority', priorityIndex + 1) }}
      </NeFormItemLabel>
      <template v-for="(gateway, gatewayIndex) in priority" :key="gatewayIndex">
        <div class="flex gap-x-4">
          <NeCombobox
            v-model="gateway.id"
            :options="policyForm.gateways"
            :placeholder="t('standalone.multi_wan.choose_gateway')"
            class="grow"
          />
          <NeTextInput
            v-if="form.selection != PolicyOptions.BACKUP"
            v-model.number="gateway.weight"
            :placeholder="t('standalone.multi_wan.weight')"
          />
          <NeButton
            :disabled="isTrashButtonDisabled"
            @click="removeGateway(priorityIndex, gatewayIndex)"
          >
            <FontAwesomeIcon :icon="['fas', 'trash']" />
          </NeButton>
        </div>
      </template>
      <NeButton
        v-if="form.selection != PolicyOptions.BACKUP"
        :kind="'tertiary'"
        @click="priority.push(new Gateway())"
      >
        {{ t('standalone.multi_wan.add_gateway') }}
      </NeButton>
    </div>
    <NeButton
      v-if="form.selection != PolicyOptions.BALANCE"
      @click="form.priorities.push([new Gateway()])"
    >
      <template #prefix>
        <FontAwesomeIcon :icon="faPlus" />
      </template>
      Add Priority level
    </NeButton>
    <hr />
    <div class="flex justify-end gap-4">
      <NeButton :disabled="saving" :kind="'tertiary'" @click="$emit('cancel')">
        {{ t('common.cancel') }}
      </NeButton>
      <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="save()">
        {{ t('common.save') }}
      </NeButton>
    </div>
  </div>
</template>
