<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeCombobox, type NeComboboxOption } from '@nethesis/vue-components'
import {
  getAxiosErrorMessage,
  NeButton,
  NeInlineNotification,
  NeRadioSelection,
  NeTextInput,
  NeToggle,
  NeSideDrawer
} from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, ref, type PropType, watch } from 'vue'
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

const { t } = useI18n()
const uciPendingChangesStore = useUciPendingChangesStore()
const firewallConfig = useFirewallStore()

const isCreating = computed(() => {
  return !props.zoneToEdit
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      // clear errors
      saveError.value = undefined

      if (!props.zoneToEdit) {
        // creating zone, reset fields to default
        name.value = ''
        forwardsTo.value = []
        forwardsFrom.value = []
        trafficInput.value = TrafficPolicy.DROP
        trafficForward.value = TrafficPolicy.DROP
        trafficToWan.value = false
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

        trafficInput.value = props.zoneToEdit.input
        trafficForward.value = props.zoneToEdit.forward
        trafficToWan.value = !!getTrafficToWan(props.zoneToEdit, firewallConfig.forwardings)
      }
    }
  }
)

onMounted(() => {
  if (firewallConfig.loading) {
    firewallConfig.fetch()
  }
})

/*const advancedSettings = ref(false)*/

const emit = defineEmits(['close', 'success'])

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

const trafficOptions = [
  {
    id: TrafficPolicy.DROP,
    label: t('standalone.zones_and_policies.traffic_policy.' + TrafficPolicy.DROP)
  },
  {
    id: TrafficPolicy.REJECT,
    label: t('standalone.zones_and_policies.traffic_policy.' + TrafficPolicy.REJECT)
  },
  {
    id: TrafficPolicy.ACCEPT,
    label: t('standalone.zones_and_policies.traffic_policy.' + TrafficPolicy.ACCEPT)
  }
]

const name = ref('')
const forwardsTo = ref<NeComboboxOption[]>([])
const forwardsFrom = ref<NeComboboxOption[]>([])
const trafficInput = ref(TrafficPolicy.DROP)
const trafficForward = ref(TrafficPolicy.DROP)
const trafficToWan = ref(false)

/*const subnets = ref<string[]>([])
const newSubnet = ref('')
const enableLogging = ref(false)
const logPerSecond = ref('10')*/

const saving = ref(false)
const saveError = ref<Error>()
const errorBag = ref(new MessageBag())

/*function addNewSubnet() {
  subnets.value.push(newSubnet.value)
  newSubnet.value = ''
}*/

function editZone() {
  ubusCall('ns.firewall', 'edit_zone', {
    name: name.value,
    input: trafficInput.value.toUpperCase(),
    forward: trafficForward.value.toUpperCase(),
    traffic_to_wan: trafficToWan.value,
    forwards_to: forwardsTo.value.map((item) => item.id),
    forwards_from: forwardsFrom.value.map((item) => item.id)
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
      name: name.value,
      input: trafficInput.value.toUpperCase(),
      forward: trafficForward.value.toUpperCase(),
      traffic_to_wan: trafficToWan.value,
      forwards_to: forwardsTo.value.map((item) => item.id),
      forwards_from: forwardsFrom.value.map((item) => item.id)
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
  const validateName = [validateRequired(name.value), validateUciName(name.value)]
  validateName.forEach((output) => {
    if (!output.valid) {
      errorBag.value.set('name', [String(output.errMessage)])
    }
  })
  return validateName.some((output) => !output.valid)
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
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
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
      />
      <NeToggle
        v-model="trafficToWan"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.traffic_to_wan')"
      />
      <NeRadioSelection
        v-model="trafficInput"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.traffic_to_firewall')"
        :options="trafficOptions"
      />
      <NeRadioSelection
        v-model="trafficForward"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.traffic_to_same_zone')"
        :options="trafficOptions"
      />
      <!--    <NeButton kind="tertiary" size="sm" @click="advancedSettings = !advancedSettings" class="-ml-2">
      <template #suffix>
        <font-awesome-icon
          :icon="['fas', advancedSettings ? 'chevron-up' : 'chevron-down']"
          class="h-3 w-3"
          aria-hidden="true"
        />
      </template>
      {{ t('standalone.zones_and_policies.advanced_settings') }}
    </NeButton>
    <Transition name="slide-down">
      <div class="mt-2 space-y-4" v-show="advancedSettings">
        <div>
          <NeFormItemLabel>
            {{ t('standalone.zones_and_policies.covered_subnets') }}
          </NeFormItemLabel>
          <div class="space-y-2">
            <div
              v-for="index in subnets.keys()"
              :key="index"
              class="flex flex-nowrap items-center gap-4"
            >
              <NeTextInput v-model="subnets[index]" :disabled="saving" class="grow" />
              <NeButton :disabled="saving" class="h-8 w-8" @click="subnets.splice(index, 1)">
                <FontAwesomeIcon :icon="['fas', 'trash']" />
              </NeButton>
            </div>
            <div class="flex flex-nowrap items-center gap-x-4">
              <NeTextInput
                v-model="newSubnet"
                :disabled="saving"
                :placeholder="t('standalone.zones_and_policies.add_new_subnet')"
                class="grow"
              />
              <NeButton :disabled="saving" class="h-8 w-8" @click="addNewSubnet">
                <FontAwesomeIcon :icon="['fas', 'plus']" />
              </NeButton>
            </div>
          </div>
        </div>
        <div class="space-y-4">
          <NeToggle
            v-model="enableLogging"
            :disabled="saving"
            :label="t('standalone.zones_and_policies.enable_logging')"
          />
          <NeTextInput
            v-if="enableLogging"
            v-model="logPerSecond"
            :disabled="saving"
            :label="t('standalone.zones_and_policies.limit_log_messages')"
            type="number"
          />
        </div>
      </div>
    </Transition>-->
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
