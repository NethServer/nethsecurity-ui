<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  NeCombobox,
  type NeComboboxOption,
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeRadioSelection,
  NeTextInput,
  getAxiosErrorMessage,
  focusElement,
  NeTooltip
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { computed, onMounted, ref, type PropType, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { SpecialZones, TrafficPolicy, useFirewallStore, Zone } from '@/stores/standalone/firewall'
import { MessageBag, validateRequired, validateUciName } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'
import {
  forwardingsFromByZone,
  forwardingsToByZone,
  getTrafficToWan
} from '@/lib/standalone/network'

const props = defineProps({
  isShown: { type: Boolean, default: false },
  zoneToEdit: {
    type: Object as PropType<Zone>,
    default: undefined
  }
})

const emit = defineEmits(['close', 'success'])

const { t } = useI18n()
const uciPendingChangesStore = useUciPendingChangesStore()
const firewallConfig = useFirewallStore()

const name = ref('')
const nameRef = ref()
const forwardsTo = ref<NeComboboxOption[]>([])
const forwardsFrom = ref<NeComboboxOption[]>([])
// ID of radio selection
const trafficInput = ref('input-drop')
// ID of radio selection
const trafficForward = ref('forward-drop')
const trafficToWan = ref(false)
const enableLogging = ref(false)

const saving = ref(false)
const saveError = ref<Error>()
const errorBag = ref(new MessageBag())

const isCreating = computed(() => {
  return !props.zoneToEdit
})

const inputTrafficOptions = [
  {
    id: 'input-drop',
    label: 'DROP'
  },
  {
    id: 'input-reject',
    label: 'REJECT'
  },
  {
    id: 'input-accept',
    label: 'ACCEPT'
  }
]

const forwardTrafficOptions = [
  {
    id: 'forward-drop',
    label: 'DROP'
  },
  {
    id: 'forward-reject',
    label: 'REJECT'
  },
  {
    id: 'forward-accept',
    label: 'ACCEPT'
  }
]

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      // clear errors
      saveError.value = undefined
      errorBag.value.clear()

      if (!props.zoneToEdit) {
        // creating zone, reset fields to default
        name.value = ''
        forwardsTo.value = []
        forwardsFrom.value = []
        trafficInput.value = mapTrafficPolicyToRadioId(TrafficPolicy.DROP, 'input')
        trafficForward.value = mapTrafficPolicyToRadioId(TrafficPolicy.DROP, 'forward')
        trafficToWan.value = false
        enableLogging.value = false

        nextTick(() => {
          focusElement(nameRef)
        })
      } else {
        // editing zone
        name.value = props.zoneToEdit.name
        forwardsTo.value = forwardingsToByZone(props.zoneToEdit, firewallConfig.forwardings).map(
          (forwarding) => {
            return {
              id: forwarding.destination,
              label: forwarding.destination.toUpperCase()
            }
          }
        )
        forwardsFrom.value = forwardingsFromByZone(
          props.zoneToEdit,
          firewallConfig.forwardings
        ).map((forwarding) => {
          return {
            id: forwarding.source,
            label: forwarding.source.toUpperCase()
          }
        })

        trafficInput.value = mapTrafficPolicyToRadioId(props.zoneToEdit.input, 'input')
        trafficForward.value = mapTrafficPolicyToRadioId(props.zoneToEdit.forward, 'forward')
        trafficToWan.value = !!getTrafficToWan(props.zoneToEdit, firewallConfig.forwardings)
        enableLogging.value = props.zoneToEdit.logging
      }
    }
  }
)

watch(
  () => name.value,
  () => {
    // always show uppercase zone name
    if (name.value !== name.value.toUpperCase()) {
      name.value = name.value.toUpperCase()
    }
  }
)

onMounted(() => {
  if (firewallConfig.loading) {
    firewallConfig.fetch()
  }
})

const zoneComboboxOptions = computed((): NeComboboxOption[] => {
  return (
    firewallConfig.zones
      // exclude WAN and current zone (if editing)
      .filter(
        (zone) =>
          zone.name != SpecialZones.WAN &&
          (!props.zoneToEdit || props.zoneToEdit.name !== zone.name)
      )
      .map((zone) => {
        return {
          id: zone.name,
          label: zone.name.toUpperCase()
        }
      })
  )
})

const forwardPlaceholder = computed((): string => {
  return zoneComboboxOptions.value
    .slice(0, 2)
    .map((zone: NeComboboxOption) => zone.label.toUpperCase())
    .join(', ')
    .concat('...')
})

function editZone() {
  ubusCall('ns.firewall', 'edit_zone', {
    name: name.value.toLowerCase(),
    input: mapRadioIdToTrafficPolicy(trafficInput.value),
    forward: mapRadioIdToTrafficPolicy(trafficForward.value),
    traffic_to_wan: trafficToWan.value,
    forwards_to: forwardsTo.value.map((item) => item.id),
    forwards_from: forwardsFrom.value.map((item) => item.id),
    log: enableLogging.value
  })
    .then(() => {
      uciPendingChangesStore.getChanges()
      firewallConfig.fetch()
      emit('success')
    })
    .catch((error: AxiosError) => (saveError.value = error))
    .then(() => (saving.value = false))
}

function addZone() {
  if (!validate()) {
    saving.value = true

    ubusCall('ns.firewall', 'create_zone', {
      name: name.value.toLowerCase(),
      input: mapRadioIdToTrafficPolicy(trafficInput.value),
      forward: mapRadioIdToTrafficPolicy(trafficForward.value),
      traffic_to_wan: trafficToWan.value,
      forwards_to: forwardsTo.value.map((item) => item.id),
      forwards_from: forwardsFrom.value.map((item) => item.id),
      log: enableLogging.value
    })
      .then(() => {
        uciPendingChangesStore.getChanges()
        firewallConfig.fetch()
        emit('success')
      })
      .catch((error: AxiosError) => {
        if (error instanceof ValidationError) {
          errorBag.value = error.errorBag
        } else {
          saveError.value = error
        }
      })
      .then(() => (saving.value = false))
  }
}

function save() {
  if (isCreating.value) {
    addZone()
  } else {
    editZone()
  }
}

function validate(): boolean {
  errorBag.value.clear()
  const validateName = [validateRequired(name.value), validateUciName(name.value.toLowerCase())]
  validateName.forEach((output) => {
    if (!output.valid) {
      errorBag.value.set('name', [String(output.errMessage)])
    }
  })
  return validateName.some((output) => !output.valid)
}

function mapTrafficPolicyToRadioId(trafficPolicy: TrafficPolicy, prefix: string): string {
  return `${prefix}-${trafficPolicy}`
}

function mapRadioIdToTrafficPolicy(radioId: string): string {
  const [, trafficPolicy] = radioId.split('-')
  return trafficPolicy.toUpperCase()
}
</script>
<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="
      isCreating
        ? t('standalone.zones_and_policies.add_zone')
        : t('standalone.zones_and_policies.edit_zone_name', { name: zoneToEdit?.name })
    "
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="emit('close')"
  >
    <NeInlineNotification
      v-if="firewallConfig.error"
      :title="t(getAxiosErrorMessage(firewallConfig.error))"
      kind="error"
    />
    <div v-else class="space-y-8">
      <NeInlineNotification
        v-if="saveError"
        :title="t(getAxiosErrorMessage(saveError.message))"
        kind="error"
      />
      <NeTextInput
        v-model="name"
        :disabled="saving || !isCreating"
        :invalid-message="t(errorBag.getFirstI18nKeyFor('name'))"
        :label="t('standalone.zones_and_policies.name')"
        :placeholder="t('standalone.zones_and_policies.name')"
        ref="nameRef"
      />
      <NeCombobox
        v-model="forwardsTo"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.allow_forwards_to')"
        :options="zoneComboboxOptions"
        :placeholder="forwardPlaceholder"
        multiple
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
      />
      <NeCombobox
        v-model="forwardsFrom"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.allow_forwards_from')"
        :options="zoneComboboxOptions"
        :placeholder="forwardPlaceholder"
        multiple
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
      />
      <NeToggle
        v-if="zoneToEdit?.name !== SpecialZones.WAN"
        v-model="trafficToWan"
        :disabled="saving"
        :topLabel="t('standalone.zones_and_policies.traffic_to_wan')"
        :label="trafficToWan ? t('common.enabled') : t('common.disabled')"
      />
      <NeRadioSelection
        v-model="trafficInput"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.traffic_to_firewall')"
        :options="inputTrafficOptions"
      />
      <NeRadioSelection
        v-model="trafficForward"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.traffic_to_same_zone')"
        :options="forwardTrafficOptions"
      />
      <NeToggle
        v-model="enableLogging"
        :disabled="saving"
        :topLabel="t('standalone.zones_and_policies.logging')"
        :label="enableLogging ? t('common.enabled') : t('common.disabled')"
      >
        <template #topTooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.zones_and_policies.enable_logging_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeToggle>
      <hr />
      <div class="flex justify-end gap-4">
        <NeButton :disabled="saving" kind="tertiary" size="lg" @click="$emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="saving" :loading="saving" kind="primary" size="lg" @click="save()">
          {{ isCreating ? t('standalone.zones_and_policies.add_zone') : t('common.save') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
