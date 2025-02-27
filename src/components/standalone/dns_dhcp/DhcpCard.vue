<script lang="ts" setup>
import type { DhcpInterface } from '@/components/standalone/dns_dhcp/DhcpManager.vue'
import {
  getIconFromZone,
  getZoneBorderColorClasses,
  getZoneIconBackgroundStyle,
  getZoneIconForegroundStyle
} from '@/lib/standalone/network.ts'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { computed } from 'vue'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faCheck,
  faCircleCheck,
  faCircleXmark,
  faPenToSquare,
  faXmark
} from '@fortawesome/free-solid-svg-icons'
import { NeBadge, NeButton, NeLink, NeTooltip } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useFirewallStore } from '@/stores/standalone/firewall.ts'

const firewallConfig = useFirewallStore()
const { t } = useI18n()

defineEmits(['edit'])

const { dhcpInterface, interfaceName } = defineProps<{
  interfaceName: string
  dhcpInterface: DhcpInterface
}>()

const borderColor = computed((): string => {
  const zoneName =
    firewallConfig.zones.find((zone) => zone.interfaces.includes(interfaceName))?.name ?? ''
  return getZoneBorderColorClasses(zoneName)
})

const range = computed((): string | undefined => {
  if (dhcpInterface.first != undefined && dhcpInterface.last != undefined) {
    return `${dhcpInterface.first} - ${dhcpInterface.last}`
  }
  return undefined
})

const dhcpOptions = computed(() => {
  return Object.entries(dhcpInterface.options).map(([key, value]) => {
    return { key, value }
  })
})

const leaseTime = computed((): string | undefined => {
  return dhcpOptions.value.find((option) => option.key == 'leasetime')?.value
})

const visibleOptions = computed(() => {
  return dhcpOptions.value.filter((option) => option.key != 'leasetime')
})
</script>

<template>
  <div
    :class="borderColor"
    class="space-y-4 border-l-4 bg-white px-4 py-5 text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:rounded-lg sm:px-6 sm:shadow"
  >
    <div class="flex justify-between">
      <div class="flex items-center gap-2">
        <div
          :class="getZoneIconBackgroundStyle(dhcpInterface.zone)"
          class="flex h-8 w-8 items-center justify-center rounded-full"
        >
          <FontAwesomeIcon
            :class="getZoneIconForegroundStyle(dhcpInterface.zone)"
            :icon="getIconFromZone(dhcpInterface.zone)"
            aria-hidden="true"
            class="h-4 w-4"
          />
        </div>
        <span class="text-base font-medium leading-6">
          {{ interfaceName }}<br />{{ dhcpInterface.device }}
        </span>
      </div>
      <div>
        <NeButton kind="tertiary" size="sm" @click="$emit('edit', dhcpInterface)">
          <template #prefix>
            <FontAwesomeIcon :icon="faPenToSquare" aria-hidden="true" class="h-4 w-4" />
          </template>
          {{ t('common.edit') }}
        </NeButton>
      </div>
    </div>
    <div class="text-tertiary-neutral space-y-2">
      <p class="flex items-center gap-3">
        <span>{{ t('standalone.dns_dhcp.mac_binding') }}:</span>
        <span class="space-x-1">
          <template v-if="dhcpInterface.ns_binding != undefined && dhcpInterface.ns_binding == 0">
            <FontAwesomeIcon :icon="faCircleXmark" class="text-offline" />
            <span>{{ t('common.disabled') }}</span>
          </template>
          <template v-else>
            <FontAwesomeIcon :icon="faCircleCheck" class="text-online" />
            <span>{{ t('common.enabled') }}</span>
          </template>
        </span>
      </p>
      <p v-if="dhcpInterface.ns_binding != undefined">
        <template v-if="dhcpInterface.ns_binding == 1">
          {{ t('standalone.dns_dhcp.soft_mac_binding') }}
        </template>
        <template v-else-if="dhcpInterface.ns_binding == 2">
          {{ t('standalone.dns_dhcp.hard_mac_binding') }}
        </template>
      </p>
      <hr />
    </div>
    <div class="space-y-1 text-sm">
      <p class="flex items-center">
        {{ t('standalone.dns_dhcp.dhcp') }}
        <NeBadge
          v-if="dhcpInterface.active"
          :icon="faCheck"
          :text="t('common.enabled')"
          class="ml-auto"
          kind="success"
          size="xs"
        />
        <NeBadge
          v-else
          :icon="faXmark"
          :text="t('common.disabled')"
          class="ml-auto"
          kind="secondary"
          size="xs"
        />
      </p>
      <div v-if="dhcpInterface.active" class="space-y-1 font-normal">
        <p v-if="range != undefined">{{ t('standalone.dns_dhcp.ip_range') }}: {{ range }}</p>
        <p v-if="leaseTime != undefined">
          {{ t('standalone.dns_dhcp.lease_time') }}: {{ leaseTime }}
        </p>
        <template v-if="visibleOptions.length > 3">
          <p v-for="dhcpOption in visibleOptions.slice(0, 2)" :key="dhcpOption.key">
            {{ dhcpOption.key }}: {{ dhcpOption.value }}
          </p>
          <p v-if="visibleOptions.length > 2">
            <NeTooltip>
              <template #trigger>
                <NeLink>
                  {{ t('standalone.dns_dhcp.plus_n_others', { n: visibleOptions.length - 2 }) }}
                </NeLink>
              </template>
              <template #content>
                <p v-for="dhcpOption in visibleOptions.slice(2)" :key="dhcpOption.key">
                  {{ dhcpOption.key }}: {{ dhcpOption.value }}
                </p>
              </template>
            </NeTooltip>
          </p>
        </template>
        <template v-else>
          <p v-for="dhcpOption in visibleOptions" :key="dhcpOption.key">
            {{ dhcpOption.key }}: {{ dhcpOption.value }}
          </p>
        </template>
      </div>
    </div>
  </div>
</template>
