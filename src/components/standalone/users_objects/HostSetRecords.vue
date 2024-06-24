<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { type PropType } from 'vue'
import { NeTooltip, NeLink } from '@nethesis/vue-components'
import type { HostSet } from './HostSets.vue'

const props = defineProps({
  records: {
    type: Array as PropType<string[]>,
    required: true
  },
  allHostSets: {
    type: Array as PropType<HostSet[]>
  }
})

function getRecord(record: string) {
  return props.allHostSets?.find((hostSet) => hostSet.id === record)
}
</script>

<template>
  <div>
    <span v-for="record in records" :key="record">
      <span v-if="record.includes('/ns_')">
        <NeTooltip placement="top" class="shrink-0">
          <template #trigger>
            <NeLink>{{ getRecord(record)?.name || '-' }}</NeLink>
          </template>
          <template #content>
            <div v-if="getRecord(record)?.ipaddr">
              <!-- this v-for is just a trick to declare 'internalRecords' variable -->
              <div v-for="(internalRecords, i) in [getRecord(record)?.ipaddr]" :key="i">
                <template v-if="internalRecords">
                  <span v-for="internalRecord in internalRecords" :key="internalRecord">
                    <span v-if="internalRecord.includes('/ns_')">
                      {{ getRecord(internalRecord)?.name || '-' }}
                    </span>
                    <span v-else>{{ internalRecord }}</span>
                    <span v-if="internalRecord !== internalRecords[internalRecords.length - 1]"
                      >,
                    </span>
                  </span>
                </template>
              </div>
            </div>
            <div v-else>-</div>
          </template>
        </NeTooltip>
      </span>
      <span v-else>{{ record }}</span>
      <span v-if="record !== records[records.length - 1]">, </span>
    </span>
  </div>
</template>
