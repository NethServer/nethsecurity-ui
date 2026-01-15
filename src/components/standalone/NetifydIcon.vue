<script lang="ts" setup>
import { useNetifydStore } from '@/stores/standalone/netifyd.ts'
import { computed } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faQuestionCircle } from '@fortawesome/free-solid-svg-icons'

const { data } = useNetifydStore()

const { name } = defineProps<{
  name: string
}>()

const icon = computed<string | null>(() => {
  for (const application of data) {
    if (name == application.tag) {
      return application.icon
    }
  }
  return null
})
</script>

<template>
  <img v-if="icon" :alt="name" :src="icon" />
  <FontAwesomeIcon v-else :icon="faQuestionCircle" />
</template>
