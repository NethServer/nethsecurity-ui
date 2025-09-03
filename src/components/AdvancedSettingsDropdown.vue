<script setup lang="ts">
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faChevronDown, faChevronUp } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { NeButton } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const model = defineModel<boolean>()

const icon = computed<IconDefinition>(() => {
  if (model.value) {
    return faChevronUp
  } else {
    return faChevronDown
  }
})
</script>

<template>
  <NeButton kind="tertiary" @click="model = !model">
    {{ t('common.advanced_settings') }}
    <template #suffix>
      <FontAwesomeIcon :icon="icon" class="h-4 w-4" aria-hidden="true" />
    </template>
  </NeButton>
  <slot v-if="model" />
</template>
