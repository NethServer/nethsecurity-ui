<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useIpsStatusStore } from '@/stores/standalone/ipsStatus'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { NeBadge } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed } from 'vue'

const { t } = useI18n()

const { enabledLabel, disabledLabel } = defineProps<{
  enabledLabel?: string
  disabledLabel?: string
}>()

const _enabledLabel = computed(() => {
  if (enabledLabel == undefined) {
    return t('standalone.ips.ips_enabled')
  } else {
    return enabledLabel
  }
})

const _disabledLabel = computed(() => {
  if (disabledLabel == undefined) {
    return t('standalone.ips.ips_disabled')
  } else {
    return disabledLabel
  }
})

const ips = useIpsStatusStore()
</script>

<template>
  <template v-if="!ips.loading">
    <NeBadge v-if="ips.enabled" :icon="faCheck" :text="_enabledLabel" kind="success" />
    <NeBadge v-else :icon="faXmark" :text="_disabledLabel" kind="secondary" />
  </template>
</template>
