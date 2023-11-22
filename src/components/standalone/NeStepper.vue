<script setup lang="ts">
import { NeProgressBar } from '@nethserver/vue-tailwind-lib'
import { range } from 'lodash-es'

defineProps<{
  totalSteps: number
  currentStep: number
  stepLabel: string
}>()
</script>

<template>
  <div>
    <NeProgressBar :progress="(currentStep / totalSteps) * 100" size="sm" />
    <div class="mt-2 flex flex-row">
      <div v-for="i in range(1, totalSteps + 1)" :key="i" class="flex grow basis-0 justify-center">
        <p class="text-xs font-semibold text-primary-400" v-if="i == currentStep">
          Step {{ currentStep }}/{{ totalSteps }}
        </p>
      </div>
    </div>
  </div>
</template>
