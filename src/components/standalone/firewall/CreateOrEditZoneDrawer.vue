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
  NeTooltip,
  NeToggle,
  type RadioOption
} from '@nethesis/vue-components'
import { computed, onMounted, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { SpecialZones, TrafficPolicy, useFirewallStore, Zone } from '@/stores/standalone/firewall'
import {
  MessageBag,
  validateAlphanumeric,
  validateRequired,
  validateUciName
} from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import { AxiosError, type AxiosResponse } from 'axios'
import {
  forwardingsFromByZone,
  forwardingsToByZone,
  getTrafficToWan
} from '@/lib/standalone/network'
import { faShield, faStar, faUsers } from '@fortawesome/free-solid-svg-icons'

const { isShown = false, zoneToEdit } = defineProps<{
  isShown?: boolean
  zoneToEdit?: Zone
}>()

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
  return !zoneToEdit
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
  () => isShown,
  () => {
    if (isShown) {
      // clear errors
      saveError.value = undefined
      errorBag.value.clear()
      preset.value = 'custom'

      if (!zoneToEdit) {
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
        name.value = zoneToEdit.name
        forwardsTo.value = forwardingsToByZone(zoneToEdit, firewallConfig.forwardings).map(
          (forwarding) => {
            return {
              id: forwarding.destination,
              label: forwarding.destination.toUpperCase()
            }
          }
        )
        forwardsFrom.value = forwardingsFromByZone(zoneToEdit, firewallConfig.forwardings).map(
          (forwarding) => {
            return {
              id: forwarding.source,
              label: forwarding.source.toUpperCase()
            }
          }
        )

        trafficInput.value = mapTrafficPolicyToRadioId(zoneToEdit.input, 'input')
        trafficForward.value = mapTrafficPolicyToRadioId(zoneToEdit.forward, 'forward')
        trafficToWan.value = !!getTrafficToWan(zoneToEdit, firewallConfig.forwardings)
        enableLogging.value = zoneToEdit.logging
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
        (zone) => zone.name != SpecialZones.WAN && (!zoneToEdit || zoneToEdit.name !== zone.name)
      )
      .map((zone) => {
        return {
          id: zone.name,
          label: zone.name.toUpperCase()
        }
      })
  )
})

function editZone() {
  ubusCall('ns.firewall', 'edit_zone', {
    name: name.value.toLowerCase(),
    input: mapRadioIdToTrafficPolicy(trafficInput.value),
    forward: mapRadioIdToTrafficPolicy(trafficForward.value),
    traffic_to_wan: trafficToWan.value,
    forwards_to: forwardsTo.value.map((item: NeComboboxOption) => item.id),
    forwards_from: forwardsFrom.value.map((item: NeComboboxOption) => item.id),
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

type CreatedZoneResponse = {
  data: {
    created_zone: string
  }
}

function addZone() {
  if (!validate()) {
    saving.value = true
    saveError.value = undefined

    ubusCall('ns.firewall', 'create_zone', {
      name: name.value.toLowerCase(),
      input: mapRadioIdToTrafficPolicy(trafficInput.value),
      forward: mapRadioIdToTrafficPolicy(trafficForward.value),
      traffic_to_wan: trafficToWan.value,
      forwards_to: forwardsTo.value.map((item: NeComboboxOption) => item.id),
      forwards_from: forwardsFrom.value.map((item: NeComboboxOption) => item.id),
      log: enableLogging.value
    })
      .then(async (response: CreatedZoneResponse) => {
        if (isPresetActive.value) {
          const promises: Promise<unknown>[] = []
          // if preset is active, we need to call additional APIs to configure the firewall rules
          if (preset.value == SpecialZones.GUEST) {
            promises.push(
              ubusCall('ns.firewall', 'add-rule', {
                name: 'Allow-DNS-from-Guest-Zone',
                enabled: true,
                src_ip: [],
                ns_src: '',
                src: 'guest',
                dest_ip: [],
                ns_dst: '',
                dest: '',
                ns_service: 'domain',
                proto: [],
                dest_port: [],
                target: 'ACCEPT',
                add_to_top: false,
                ns_tag: [],
                log: false,
                system_rule: false,
                ns_link: `firewall/${response.data.created_zone}`
              })
            )
            promises.push(
              ubusCall('ns.firewall', 'add-rule', {
                name: 'Allow-DHCP-from-Guest-Zone',
                enabled: true,
                src_ip: [],
                ns_src: '',
                src: 'guest',
                dest_ip: [],
                ns_dst: '',
                dest: '',
                ns_service: 'bootps',
                proto: [],
                dest_port: [],
                target: 'ACCEPT',
                add_to_top: false,
                ns_tag: [],
                log: false,
                system_rule: false,
                ns_link: `firewall/${response.data.created_zone}`
              })
            )
          }
          if (preset.value == SpecialZones.DMZ) {
            promises.push(
              ubusCall('ns.firewall', 'add-rule', {
                name: 'Allow-DNS-from-DMZ-Zone',
                enabled: true,
                src_ip: [],
                ns_src: '',
                src: 'dmz',
                dest_ip: [],
                ns_dst: '',
                dest: '',
                ns_service: 'domain',
                proto: [],
                dest_port: [],
                target: 'ACCEPT',
                add_to_top: false,
                ns_tag: [],
                log: false,
                system_rule: false,
                ns_link: `firewall/${response.data.created_zone}`
              })
            )
          }
          await Promise.all(promises)
        }
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
      .finally(() => (saving.value = false))
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
  const validateName = [
    validateRequired(name.value),
    validateUciName(name.value.toLowerCase()),
    validateAlphanumeric(name.value, true)
  ]
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

type AvailablePresets = SpecialZones.GUEST | SpecialZones.DMZ | 'custom'
const getPresets = computed<RadioOption[]>(() => {
  return [
    {
      id: 'custom',
      label: t('standalone.interfaces_and_devices.custom_zone'),
      icon: faStar
    },
    {
      id: SpecialZones.GUEST,
      label: t('standalone.zones_and_policies.zone_guest_label'),
      description: t('standalone.zones_and_policies.zone_guest_color'),
      icon: faUsers,
      disabled: firewallConfig.zones.some((zone) => zone.name == SpecialZones.GUEST)
    },
    {
      id: SpecialZones.DMZ,
      label: t('standalone.zones_and_policies.zone_dmz_label'),
      description: t('standalone.zones_and_policies.zone_dmz_color'),
      icon: faShield,
      disabled: firewallConfig.zones.some((zone) => zone.name == SpecialZones.DMZ)
    }
  ]
})

const preset = ref<AvailablePresets>('custom')
const isPresetActive = computed<boolean>(() => {
  return preset.value != 'custom'
})

watch(preset, (newPreset) => {
  if (isCreating.value) {
    switch (newPreset) {
      case SpecialZones.GUEST:
        name.value = SpecialZones.GUEST
        forwardsTo.value = []
        forwardsFrom.value = [
          {
            id: SpecialZones.LAN,
            label: SpecialZones.LAN.toUpperCase()
          }
        ]
        trafficToWan.value = true
        trafficInput.value = mapTrafficPolicyToRadioId(TrafficPolicy.DROP, 'input')
        trafficForward.value = mapTrafficPolicyToRadioId(TrafficPolicy.DROP, 'forward')
        break
      case SpecialZones.DMZ:
        name.value = SpecialZones.DMZ
        forwardsTo.value = []
        forwardsFrom.value = [
          {
            id: SpecialZones.LAN,
            label: SpecialZones.LAN.toUpperCase()
          }
        ]
        trafficToWan.value = true

        trafficInput.value = mapTrafficPolicyToRadioId(TrafficPolicy.DROP, 'input')
        trafficForward.value = mapTrafficPolicyToRadioId(TrafficPolicy.DROP, 'forward')
        break
      default:
        name.value = ''
        forwardsTo.value = []
        forwardsFrom.value = []
        trafficInput.value = mapTrafficPolicyToRadioId(TrafficPolicy.DROP, 'input')
        trafficForward.value = mapTrafficPolicyToRadioId(TrafficPolicy.DROP, 'forward')
        trafficToWan.value = false
    }
  }
})
</script>
<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="
      isCreating
        ? t('standalone.zones_and_policies.add_zone')
        : t('standalone.zones_and_policies.edit_zone_name', { name: zoneToEdit?.name })
    "
    :close-aria-label="t('common.shell.close_side_drawer')"
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
      <NeRadioSelection
        v-if="isCreating"
        v-model="preset"
        :options="getPresets"
        :label="t('standalone.zones_and_policies.type')"
        card
      />
      <NeInlineNotification
        v-if="isPresetActive"
        kind="info"
        :title="t('standalone.zones_and_policies.preset_active_title')"
        :description="t('standalone.zones_and_policies.preset_active_description')"
      />
      <NeTextInput
        ref="nameRef"
        v-model="name"
        :disabled="saving || !isCreating || isPresetActive"
        :invalid-message="t(errorBag.getFirstI18nKeyFor('name'))"
        :label="t('standalone.zones_and_policies.name')"
        :placeholder="t('standalone.zones_and_policies.name')"
      />
      <NeCombobox
        v-model="forwardsTo"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.allow_forwards_to')"
        :options="zoneComboboxOptions"
        :placeholder="t('standalone.zones_and_policies.choose_one_or_more_zones')"
        multiple
        :no-results-label="t('ne_combobox.no_results')"
        :limited-options-label="t('ne_combobox.limited_options_label')"
        :no-options-label="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optional-label="t('common.optional')"
        optional
      />
      <NeCombobox
        v-model="forwardsFrom"
        :disabled="saving"
        :label="t('standalone.zones_and_policies.allow_forwards_from')"
        :options="zoneComboboxOptions"
        :placeholder="t('standalone.zones_and_policies.choose_one_or_more_zones')"
        multiple
        :no-results-label="t('ne_combobox.no_results')"
        :limited-options-label="t('ne_combobox.limited_options_label')"
        :no-options-label="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optional-label="t('common.optional')"
        optional
      />
      <NeToggle
        v-if="zoneToEdit?.name !== SpecialZones.WAN"
        v-model="trafficToWan"
        :disabled="saving"
        :top-label="t('standalone.zones_and_policies.traffic_to_wan')"
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
        :top-label="t('standalone.zones_and_policies.logging')"
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
