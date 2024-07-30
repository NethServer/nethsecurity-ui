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
import type { DomainSet } from '@/composables/useDomainSets'
import { library as faLibrary } from '@fortawesome/fontawesome-svg-core'
import { faCloud } from '@fortawesome/free-solid-svg-icons'

const props = defineProps({
  domainSetId: {
    type: String,
    required: true
  },
  allDomainSets: {
    type: Array as PropType<DomainSet[]>
  }
})

faLibrary.add(faCloud)

function getRecord(record: string) {
  return props.allDomainSets?.find((hostSet) => hostSet.id === record)
}
</script>

<template>
  <NeTooltip placement="top" class="shrink-0">
    <template #trigger>
      <NeLink class="flex items-center gap-1.5">
        <font-awesome-icon :icon="['fas', 'cloud']" class="h-4 w-4" aria-hidden="true" />
        {{ getRecord(domainSetId)?.name || '-' }}
      </NeLink>
    </template>
    <template #content>
      <div v-if="getRecord(domainSetId)?.domain">
        <!-- this v-for is just a trick to declare 'internalRecords' variable -->
        <div v-for="(internalDomains, i) in [getRecord(domainSetId)?.domain]" :key="i">
          <ul v-if="internalDomains" class="space-y-1">
            <li
              v-for="domain in internalDomains"
              :key="domain"
              :class="{ 'list-inside list-disc': internalDomains.length > 1 }"
            >
              <span class="inline-flex items-center gap-1.5">
                <span>{{ domain }}</span>
              </span>
            </li>
          </ul>
        </div>
      </div>
      <div v-else>-</div>
    </template>
  </NeTooltip>
</template>
