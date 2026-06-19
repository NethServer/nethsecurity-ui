<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

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
import { faCircleCheck, faCircleXmark, faPenToSquare } from '@fortawesome/free-solid-svg-icons'
import { NeButton, NeLink, NeTooltip } from '@nethesis/vue-components'
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

const allRanges = computed((): Array<string> => {
  if (dhcpInterface.ranges && dhcpInterface.ranges.length > 0) {
    return dhcpInterface.ranges.map(({ first, last }) => `${first} - ${last}`)
  }
  return []
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
    class="space-y-4 border-l-4 bg-white px-4 py-5 text-sm text-gray-700 sm:rounded-lg sm:px-6 sm:shadow dark:bg-gray-950 dark:text-gray-200"
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
        <div class="flex flex-col">
          <span class="text-base leading-6 font-medium text-primary-neutral">
            {{ interfaceName }}
          </span>
          <span class="text-sm text-tertiary-neutral">
            {{ dhcpInterface.device }}
          </span>
        </div>
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

    <!-- MAC binding section -->
    <div class="space-y-2">
      <p class="text-sm font-medium text-primary-neutral">
        {{ t('standalone.dns_dhcp.mac_binding') }}
      </p>
      <div class="flex items-center justify-between text-sm text-tertiary-neutral">
        <span>{{ t('common.status') }}</span>
        <span class="flex items-center gap-1.5">
          <template v-if="dhcpInterface.ns_binding != undefined && dhcpInterface.ns_binding == 0">
            <FontAwesomeIcon :icon="faCircleXmark" class="text-offline" />
            <span>{{ t('common.disabled') }}</span>
          </template>
          <template v-else>
            <FontAwesomeIcon :icon="faCircleCheck" class="text-online" />
            <span>
              {{ t('common.enabled') }}
              <template v-if="dhcpInterface.ns_binding == 1">
                ({{ t('standalone.dns_dhcp.soft') }})
              </template>
              <template v-else-if="dhcpInterface.ns_binding == 2">
                ({{ t('standalone.dns_dhcp.strict') }})
              </template>
            </span>
          </template>
        </span>
      </div>
    </div>

    <!-- DHCP section -->
    <div class="mt-6 space-y-2">
      <p class="text-sm font-medium text-primary-neutral">{{ t('standalone.dns_dhcp.dhcp') }}</p>

      <!-- status -->
      <div class="flex items-center justify-between text-sm text-tertiary-neutral">
        <span>{{ t('common.status') }}</span>
        <span class="flex items-center gap-1.5">
          <FontAwesomeIcon
            :icon="dhcpInterface.active ? faCircleCheck : faCircleXmark"
            :class="dhcpInterface.active ? 'text-online' : 'text-offline'"
          />
          <span>{{ dhcpInterface.active ? t('common.enabled') : t('common.disabled') }}</span>
        </span>
      </div>

      <template v-if="dhcpInterface.active">
        <hr />
        <!-- IP ranges -->
        <div
          v-if="allRanges.length > 0"
          class="flex justify-between gap-4 text-sm text-tertiary-neutral"
        >
          <span class="shrink-0">
            {{ t('standalone.dns_dhcp.ip_range', allRanges.length) }}
          </span>
          <div class="flex flex-col items-end gap-0.5">
            <span v-for="(range, index) in allRanges" :key="index">{{ range }}</span>
          </div>
        </div>
        <hr />
        <!-- lease time -->
        <div
          v-if="leaseTime != undefined"
          class="flex items-center justify-between text-sm text-tertiary-neutral"
        >
          <span>
            {{ t('standalone.dns_dhcp.lease_time') }}
          </span>
          <span>{{ leaseTime }}</span>
        </div>

        <!-- DHCP options -->
        <template v-if="visibleOptions.length > 3">
          <template v-for="dhcpOption in visibleOptions.slice(0, 2)" :key="dhcpOption.key">
            <hr />
            <div class="flex items-center justify-between text-sm text-tertiary-neutral">
              <span>{{ dhcpOption.key }}</span>
              <span>{{ dhcpOption.value }}</span>
            </div>
          </template>
          <div v-if="visibleOptions.length > 2" class="flex justify-end">
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
          </div>
        </template>
        <template v-else>
          <template v-for="dhcpOption in visibleOptions" :key="dhcpOption.key">
            <hr />
            <div class="flex items-center justify-between text-sm text-tertiary-neutral">
              <span>{{ dhcpOption.key }}</span>
              <span>{{ dhcpOption.value }}</span>
            </div>
          </template>
        </template>
      </template>
    </div>
  </div>
</template>
