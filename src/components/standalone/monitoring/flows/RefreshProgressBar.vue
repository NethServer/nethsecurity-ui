<script lang="ts" setup>
import { computed } from 'vue'
import { useIntervalFn, useNow } from '@vueuse/core'
import { NeProgressBar } from '@nethesis/vue-components'

const { dataUpdatedAt, interval } = defineProps<{
  dataUpdatedAt: number
  interval: number | false
}>()

const now = useNow({
  scheduler: (cb) => useIntervalFn(cb, 1000)
})

const progress = computed(() => {
  if (interval == false) {
    return 0
  }
  const elapsed = now.value.getTime() - dataUpdatedAt
  const progressValue = (elapsed / interval) * 100
  return Math.max(0, Math.min(progressValue, 100))
})
</script>

<template>
  <div v-if="interval != false">
    <NeProgressBar :progress="progress" color="indigo" size="sm" />
  </div>
</template>
