<script lang="ts" setup>
import { NeSideDrawer } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

const { isShown } = defineProps<{
  isShown: boolean
}>()

defineEmits(['close'])

const drawerTitle = computed<string>(() => {
  return t('standalone.wireguard_peers.add_peer_tunnel')
})
</script>

<template>
  <NeSideDrawer :is-shown="isShown" :title="drawerTitle" @close="$emit('close')"> </NeSideDrawer>
</template>
