<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { type PropType } from 'vue'
import type { HostSet } from '@/composables/useHostSets'
import HostSetTooltip from './HostSetTooltip.vue'

defineProps({
  records: {
    type: Array as PropType<string[]>,
    required: true
  },
  allHostSets: {
    type: Array as PropType<HostSet[]>
  }
})
</script>

<template>
  <div class="flex flex-wrap gap-3">
    <span v-for="record in records" :key="record">
      <span v-if="record.includes('/ns_')">
        <HostSetTooltip :hostSetId="record" :allHostSets="allHostSets" />
      </span>
      <span v-else>{{ record }}</span>
    </span>
  </div>
</template>
