<script lang="ts" setup>
import BasicPieChart from '@/components/charts/BasicPieChart.vue'
import { NeCard, NeEmptyState } from '@nethesis/vue-components'
import type { TrafficRecord } from '@/composables/useTrafficStats'
import { computed } from 'vue'
import {
  AMBER_500,
  AMBER_600,
  CYAN_300,
  CYAN_500,
  CYAN_600,
  CYAN_800,
  EMERALD_500,
  EMERALD_600,
  FUCHSIA_500,
  FUCHSIA_600,
  GRAY_400,
  GRAY_50,
  GRAY_500,
  GRAY_900,
  INDIGO_500,
  INDIGO_600,
  LIME_500,
  LIME_600,
  ROSE_500,
  ROSE_600,
  VIOLET_500,
  VIOLET_600
} from '@/lib/color'
import { useThemeStore } from '@/stores/theme'
import TrafficTable from '@/components/standalone/monitoring/TrafficTable.vue'
import { useI18n } from 'vue-i18n'
import { faEmptySet } from '@nethesis/nethesis-solid-svg-icons'
import type { AvailableFilters } from '@/composables/useTrafficFilter'

const themeStore = useThemeStore()

const { t } = useI18n()

const {
  title,
  data,
  filterable = false
} = defineProps<{
  title: string
  data?: TrafficRecord[]
  filterable?: boolean
  filterableKey?: AvailableFilters
}>()

const dataLimited = computed(() => {
  return data?.slice(0, 5) ?? []
})

const pieDatasets = computed(() => {
  return [
    {
      borderColor: themeStore.isLight ? GRAY_50 : GRAY_900,
      backgroundColor: themeStore.isLight
        ? [
            CYAN_600,
            INDIGO_600,
            EMERALD_600,
            VIOLET_600,
            AMBER_600,
            ROSE_600,
            LIME_600,
            FUCHSIA_600,
            CYAN_800,
            GRAY_500
          ]
        : [
            CYAN_500,
            INDIGO_500,
            EMERALD_500,
            VIOLET_500,
            AMBER_500,
            ROSE_500,
            LIME_500,
            FUCHSIA_500,
            CYAN_300,
            GRAY_400
          ],
      data: dataLimited.value.map((value) => value.traffic)
    }
  ]
})

const pieLabels = computed(() => {
  return dataLimited.value.map((value) => value?.label ?? value.id)
})
</script>

<template>
  <NeCard v-if="data" :title="title">
    <div v-if="data.length > 0" class="space-y-6">
      <BasicPieChart :datasets="pieDatasets" :labels="pieLabels" byteFormat height="25vh" />
      <TrafficTable
        :filterable="filterable"
        :filterable-key="filterableKey"
        :title="title"
        :traffic-entries="data"
      />
    </div>
    <NeEmptyState
      v-else
      :title="t('standalone.real_time_monitor.no_data_available')"
      :icon="faEmptySet"
    />
  </NeCard>
</template>
