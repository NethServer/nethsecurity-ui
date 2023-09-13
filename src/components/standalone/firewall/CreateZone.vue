<script lang="ts" setup>
import type { NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import {
  getAxiosErrorMessage,
  NeButton,
  NeCombobox,
  NeExpandable,
  NeFormItemLabel,
  NeInlineNotification,
  NeRadioSelection,
  NeTextInput,
  NeToggle
} from '@nethserver/vue-tailwind-lib'
import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { TrafficPolicy, useFirewallStore } from '@/stores/standalone/useFirewallStore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { MessageBag, validateRequired, validateUciName } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import { AxiosError } from 'axios'

const { t } = useI18n()

const uciPendingChangesStore = useUciPendingChangesStore()

const firewallConfig = useFirewallStore()
onMounted(() => {
  if (firewallConfig.loading) {
    firewallConfig.fetch()
  }
})

const advancedSettings = ref(false)

const emit = defineEmits(['cancel', 'success'])

const zoneComboboxOptions = computed((): NeComboboxOption[] => {
  return firewallConfig.zones.map((zone) => {
    return {
      id: zone.name,
      label: zone.name.toUpperCase()
    }
  })
})

const forwardPlaceholder = computed((): string => {
  return firewallConfig.zones
    .slice(0, 2)
    .map((zone) => zone.name.toUpperCase())
    .join(', ')
    .concat('...')
})

const trafficOptions = [
  {
    id: TrafficPolicy.ACCEPT,
    label: t('standalone.zones_and_policies.traffic_policy.' + TrafficPolicy.ACCEPT)
  },
  {
    id: TrafficPolicy.REJECT,
    label: t('standalone.zones_and_policies.traffic_policy.' + TrafficPolicy.REJECT)
  },
  {
    id: TrafficPolicy.DROP,
    label: t('standalone.zones_and_policies.traffic_policy.' + TrafficPolicy.DROP)
  }
]

const label = ref('')
const forwardsTo = ref<NeComboboxOption[]>([])
const forwardsFrom = ref<NeComboboxOption[]>([])
const trafficOutput = ref(TrafficPolicy.DROP)
const trafficInput = ref(TrafficPolicy.DROP)
const trafficForward = ref(TrafficPolicy.DROP)
const subnets = ref<string[]>([])
const newSubnet = ref('')
const enableLogging = ref(false)
const logPerSecond = ref('10')

const saving = ref(false)
const saveError = ref<Error>()
const errorBag = ref(new MessageBag())

function addNewSubnet() {
  subnets.value.push(newSubnet.value)
  newSubnet.value = ''
}

function save() {
  if (!validate()) {
    saving.value = true
    ubusCall('ns.firewall', 'create_zone', {
      name: label.value,
      input: trafficInput.value.toUpperCase(),
      output: trafficOutput.value.toUpperCase(),
      forward: trafficForward.value.toUpperCase(),
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
}

function validate(): boolean {
  errorBag.value.clear()
  const validateLabel = [validateRequired(label.value), validateUciName(label.value)]
  validateLabel.forEach((output) => {
    if (!output.valid) {
      errorBag.value.set('label', [String(output.errMessage)])
    }
  })
  return validateLabel.some((output) => !output.valid)
}
</script>
<template>
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
      v-model="label"
      :disabled="saving"
      :invalid-message="t(errorBag.getFirstFor('label'))"
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
    />
    <NeCombobox
      v-model="forwardsFrom"
      :disabled="saving"
      :label="t('standalone.zones_and_policies.allow_forwards_from')"
      :options="zoneComboboxOptions"
      :placeholder="forwardPlaceholder"
      multiple
    />
    <NeRadioSelection
      v-model="trafficOutput"
      :disabled="saving"
      :label="t('standalone.zones_and_policies.traffic_to_wan')"
      :options="trafficOptions"
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
    <NeExpandable
      :expanded="advancedSettings"
      :title="t('standalone.zones_and_policies.advanced_settings')"
      @set-expanded="(expanded) => (advancedSettings = expanded)"
    >
      <div class="mt-2 space-y-4">
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
    </NeExpandable>
    <hr />
    <div class="flex justify-end gap-4">
      <NeButton :disabled="saving" @click="$emit('cancel')">
        {{ t('common.close') }}
      </NeButton>
      <NeButton :disabled="saving" :loading="saving" kind="primary" @click="save()">
        {{ t('common.save') }}
      </NeButton>
    </div>
  </div>
</template>
