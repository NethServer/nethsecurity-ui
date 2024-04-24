<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeButton } from '@nethesis/vue-components'
import { type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { useFirewallStore } from '@/stores/standalone/firewall'
import { getZoneBorderColorClasses } from '@/lib/standalone/network'
import type { ScanInterface } from './ScanNetwork.vue'

defineProps({
  iface: {
    type: Object as PropType<ScanInterface>,
    required: true
  },
  scanButtonLoading: {
    type: Boolean,
    default: false
  },
  scanButtonDisabled: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['startScan'])

const { t } = useI18n()
const firewallConfig = useFirewallStore()

function getBorderColorForInterface(iface: string) {
  const interfaceZone = firewallConfig.zones.find((zone) => zone.interfaces.includes(iface))
  return getZoneBorderColorClasses(interfaceZone?.name ?? '')
}
</script>

<template>
  <div
    :class="`overflow-hidden rounded-md border-l-4 bg-white text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:rounded-lg sm:shadow ${getBorderColorForInterface(
      iface.name
    )}`"
  >
    <div class="flex grow flex-col gap-y-4 p-5">
      <div class="flex flex-col">
        <div class="flex flex-row items-center justify-between">
          <p class="text-sm">
            <strong>{{ iface.name }}</strong>
            <br />
            {{ iface.device }}
          </p>
          <NeButton
            kind="tertiary"
            @click="emit('startScan', iface)"
            :loading="scanButtonLoading"
            :disabled="scanButtonDisabled"
          >
            <template #prefix>
              <font-awesome-icon
                :icon="['fas', 'magnifying-glass']"
                class="h-4 w-4"
                aria-hidden="true"
              />
            </template>
            {{ t('standalone.dns_dhcp.scan_network') }}
          </NeButton>
        </div>
      </div>
    </div>
  </div>
</template>
