<script lang="ts" setup>
import { NeSideDrawer } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { visible = false } = defineProps<{
  visible: boolean
}>()

defineEmits(['close'])
</script>

<template>
  <NeSideDrawer
    :is-shown="visible"
    :title="t('standalone.ips.create_bypass')"
    @close="$emit('close')"
  >
    Hello!
  </NeSideDrawer>
</template>
