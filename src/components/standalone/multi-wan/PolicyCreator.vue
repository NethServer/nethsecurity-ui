<script lang="ts" setup>
import type { NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import {
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
import { computed, onMounted, ref, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { MessageBag, validateRequired, validateUciName } from '@/lib/validation'
import { useFirewallStore, Zone } from '@/stores/standalone/useFirewallStore'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'

const { t } = useI18n()

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

const firewall = useFirewallStore()

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

const form = ref<Form>(initForm())

const saving = ref(false)
const messageBag = ref(new MessageBag())
const error = ref<Error>()

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

const availableGateways = computed((): Array<NeComboboxOption> => {
  return firewall.zones
    .filter((zone: Zone) => zone.configName == 'ns_wan')
    .map((zone: Zone) => zone.interfaces)
    .flat()
    .map((name: string) => {
      return {
        id: name,
        label: name
      }
    })
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
    form.value = initForm()
    if (props.isShown && !props.createDefault) {
      setTimeout(() => labelElement.value?.focus(), 50)
    }
  }
)

const emit = defineEmits(['success', 'close'])

onMounted(() => {
  firewall.fetch()
})

function initForm(): Form {
  return {
    label: props.createDefault ? 'Default' : '',
    selection: policyOptions[0].id,
    priorities: [[new Gateway(), new Gateway()]]
  }
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
  form.value.priorities.flat().forEach((priority, index) => {
    errMessage = validateRequired(priority.id).errMessage
    if (errMessage) {
      messageBag.value.set(`interfaces.${index}.name`, [t(errMessage.valueOf())])
    }
  })
  return !(messageBag.value.size > 0)
}

/**
 * Create every entity needed for the policy to work. Interfaces, Members, Policies and Default Rule (if missing)
 */
function create() {
  if (validate()) {
    saving.value = true
    ubusCall('ns.mwan', 'store_policy', {
      name: form.value.label,
      interfaces: form.value.priorities
        .map((gateways, index) =>
          gateways.map((gateway) => {
            return {
              name: gateway.id,
              metric: (index + 1) * 10,
              weight: gateway.weight
            }
          })
        )
        .flat()
    })
      .then(() => {
        emit('success')
        form.value = initForm()
      })
      .catch((reason: ValidationError) => {
        messageBag.value = reason.errorBag
      })
      .catch((reason: AxiosError) => {
        error.value = reason
      })
      .finally(() => {
        saving.value = false
      })
  }
}
</script>

<template>
  <NeSideDrawer
    @close="$emit('close')"
    :is-shown="isShown"
    :title="t('standalone.multi_wan.create_policy', { name: form.label })"
  >
    <NeInlineNotification v-if="firewall.error" :kind="'error'" :title="firewall.error.message" />
    <div v-else class="space-y-8">
      <NeTextInput
        ref="labelElement"
        v-model="form.label"
        :disabled="createDefault"
        :invalid-message="messageBag.getFirstFor('name')"
        :label="t('standalone.multi_wan.label_input_label')"
      />
      <NeRadioSelection
        v-model="form.selection"
        :label="t('standalone.multi_wan.behave_picker.choose_behaviour')"
        :options="policyOptions"
        :screen-reader-help-text="t('standalone.multi_wan.behave_picker.choose_behaviour_sr')"
      />
      <NeSkeleton v-if="firewall.loading" :lines="10" />
      <template v-else>
        <div v-for="(priority, index) in form.priorities" :key="index" class="space-y-4">
          <NeFormItemLabel v-if="form.priorities.length > 1">
            {{ t('standalone.multi_wan.priority', index + 1) }}
          </NeFormItemLabel>
          <template v-for="(gateway, index) in priority" :key="index">
            <div class="flex gap-x-4">
              <NeCombobox
                v-model="gateway.id"
                :options="availableGateways"
                :placeholder="t('standalone.multi_wan.choose_gateway')"
                class="grow"
                :invalid-message="messageBag.getFirstFor(`interfaces.${index}.name`)"
              />
              <NeTextInput
                v-if="form.selection != 'backup'"
                v-model.number="gateway.weight"
                :placeholder="t('standalone.multi_wan.weight')"
                :invalid-message="messageBag.getFirstFor(`interfaces.${index}.weight`)"
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
      </template>
      <NeButton v-if="form.selection != 'balance'" @click="form.priorities.push([new Gateway()])">
        <template #prefix>
          <FontAwesomeIcon :icon="faPlus" />
        </template>
        Add Priority level
      </NeButton>
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="saving" :kind="'tertiary'" @click="$emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="saving" :kind="'primary'" :loading="saving" @click="create()">
          {{ t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
