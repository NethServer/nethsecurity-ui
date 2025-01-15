<script lang="ts" setup>
import { useIpsStatusStore } from '@/stores/standalone/ipsStatus'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { NeBadge } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { onMounted } from 'vue'

const { t } = useI18n()

const ips = useIpsStatusStore()

onMounted(() => {
  ips.fetchStatus()
})
</script>

<template>
  <template v-if="!ips.loading">
    <NeBadge
      v-if="ips.enabled"
      :icon="faCheck"
      :text="t('standalone.ips.ips_enabled')"
      kind="success"
    />
    <NeBadge v-else :icon="faXmark" :text="t('standalone.ips.ips_disabled')" kind="error" />
  </template>
</template>
