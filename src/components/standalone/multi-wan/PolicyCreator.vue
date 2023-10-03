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
import { computed, onMounted, reactive, ref, toRef, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPlus } from '@fortawesome/free-solid-svg-icons'
import { MessageBag, validateRequired } from '@/lib/validation'
import { useFirewallStore, Zone } from '@/stores/standalone/useFirewallStore'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'
import { Gateway, usePolicyForm } from '@/composables/usePolicyForm'

const { t } = useI18n()

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

const policyForm = reactive(usePolicyForm(toRef(() => undefined)))

const saving = ref(false)
const messageBag = ref(new MessageBag())
const error = ref<Error>()

const labelElement = ref<HTMLInputElement | null>(null)

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
 * Focus and populate first element on open, delay by 50ms due to DOM creation.
 */
watch(
  () => props.isShown,
  () => {
    policyForm.cleanForm()
    if (props.createDefault) {
      policyForm.label = 'Default'
    }
    if (props.isShown && !props.createDefault) {
      setTimeout(() => labelElement.value?.focus(), 50)
    }
  }
)

const emit = defineEmits(['success', 'close'])

onMounted(() => {
  firewall.fetch()
})

/**
 * Validation form.
 */
function validate(): boolean {
  messageBag.value = new MessageBag()
  let errMessage = validateRequired(policyForm.label).errMessage
  if (errMessage) {
    messageBag.value.set('name', [t(errMessage.valueOf())])
    labelElement.value?.focus()
  }
  policyForm.priorities.flat().forEach((priority, index) => {
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
      name: policyForm.label,
      interfaces: policyForm.priorities
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
        policyForm.cleanForm()
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
    :is-shown="isShown"
    :title="t('standalone.multi_wan.create_policy', { name: policyForm.label })"
    @close="$emit('close')"
  >
    <NeInlineNotification v-if="firewall.error" :kind="'error'" :title="firewall.error.message" />
    <div v-else class="space-y-8">
      <NeTextInput
        ref="labelElement"
        v-model="policyForm.label"
        :disabled="createDefault"
        :invalid-message="messageBag.getFirstFor('name')"
        :label="t('standalone.multi_wan.label_input_label')"
      />
      <NeRadioSelection
        v-model="policyForm.selection"
        :label="t('standalone.multi_wan.behave_picker.choose_behaviour')"
        :options="policyForm.policyOptionSelection"
        :screen-reader-help-text="t('standalone.multi_wan.behave_picker.choose_behaviour_sr')"
      />
      <NeSkeleton v-if="firewall.loading" :lines="10" />
      <template v-else>
        <div
          v-for="(priority, priorityIndex) in policyForm.priorities"
          :key="priorityIndex"
          class="space-y-4"
        >
          <NeFormItemLabel v-if="policyForm.priorities.length > 1">
            {{ t('standalone.multi_wan.priority', priorityIndex + 1) }}
          </NeFormItemLabel>
          <template v-for="(gateway, index) in priority" :key="index">
            <div class="flex gap-x-4">
              <NeCombobox
                v-model="gateway.id"
                :invalid-message="messageBag.getFirstFor(`interfaces.${index}.name`)"
                :options="availableGateways"
                :placeholder="t('standalone.multi_wan.choose_gateway')"
                class="grow"
              />
              <NeTextInput
                v-if="policyForm.selection != 'backup'"
                v-model.number="gateway.weight"
                :invalid-message="messageBag.getFirstFor(`interfaces.${index}.weight`)"
                :placeholder="t('standalone.multi_wan.weight')"
              />
              <NeButton
                :disabled="policyForm.isTrashButtonDisabled"
                @click="policyForm.removePriority(priorityIndex, index)"
              >
                <FontAwesomeIcon :icon="['fas', 'trash']" />
              </NeButton>
            </div>
          </template>
          <NeButton
            v-if="policyForm.selection != 'backup'"
            :kind="'tertiary'"
            @click="priority.push(new Gateway())"
          >
            {{ t('standalone.multi_wan.add_gateway') }}
          </NeButton>
        </div>
      </template>
      <NeButton
        v-if="policyForm.selection != 'balance'"
        @click="policyForm.priorities.push([new Gateway()])"
      >
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
