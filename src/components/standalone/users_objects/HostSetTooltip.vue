<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
/**
 * @deprecated
 * @see ObjectTooltip.
 */
import { type PropType } from 'vue'
import { NeTooltip, NeLink } from '@nethesis/vue-components'
import type { HostSet } from '@/composables/useHostSets'
import { useObjects } from '@/composables/useObjects'

const props = defineProps({
  hostSetId: {
    type: String,
    required: true
  },
  allHostSets: {
    type: Array as PropType<HostSet[]>
  }
})

const { getObjectIcon } = useObjects()

function getRecord(record: string) {
  return props.allHostSets?.find((hostSet) => hostSet.id === record)
}
</script>

<template>
  <NeTooltip placement="top" class="shrink-0">
    <template #trigger>
      <NeLink class="flex items-center gap-1.5">
        <font-awesome-icon
          :icon="getObjectIcon(getRecord(hostSetId)?.subtype || '')"
          class="h-4 w-4"
          aria-hidden="true"
        />
        {{ getRecord(hostSetId)?.name || '-' }}
      </NeLink>
    </template>
    <template #content>
      <div v-if="getRecord(hostSetId)?.ipaddr">
        <!-- this v-for is just a trick to declare 'internalRecords' variable -->
        <div v-for="(internalRecords, i) in [getRecord(hostSetId)?.ipaddr]" :key="i">
          <ul v-if="internalRecords" class="space-y-1">
            <li
              v-for="internalRecord in internalRecords"
              :key="internalRecord"
              :class="{ 'list-inside list-disc': internalRecords.length > 1 }"
            >
              <span class="inline-flex items-center gap-1.5">
                <span v-if="internalRecord.includes('/ns_')">
                  <font-awesome-icon
                    :icon="getObjectIcon(getRecord(internalRecord)?.subtype || '')"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                  {{ getRecord(internalRecord)?.name || '-' }}
                </span>
                <span v-else>{{ internalRecord }}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div v-else>-</div>
    </template>
  </NeTooltip>
</template>
