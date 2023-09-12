<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import NeCard from '@/components/NeCard.vue'
import TrafficSummaryChart from '@/components/standalone/dashboard/TrafficSummaryChart.vue'
import { watch } from 'vue'

const props = defineProps({
  title: {
    type: String
  },
  description: {
    type: String
  },
  chartLabels: {
    type: Array,
    required: true
  },
  chartDatasets: {
    type: Array,
    required: true
  },
  loading: {
    type: Boolean
  },
  errorTitle: {
    type: String
  },
  errorDescription: {
    type: String
  }
})
</script>

<template>
  <NeCard
    :title="title"
    :skeletonLines="6"
    :loading="loading"
    :errorTitle="errorTitle"
    :errorDescription="errorDescription"
  >
    <div class="text-gray-500 dark:text-gray-400">{{ description }}</div>
    <TrafficSummaryChart
      v-if="chartDatasets?.length"
      :labels="chartLabels"
      :datasets="chartDatasets"
    />
  </NeCard>
</template>
