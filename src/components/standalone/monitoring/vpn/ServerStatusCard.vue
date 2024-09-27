<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import SimpleStat from '@/components/charts/SimpleStat.vue'
import type { RWServer } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import { NeCard } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'

defineProps<{
  ovpnConfiguration?: RWServer
  loading: boolean
}>()

const { t } = useI18n()
</script>

<template>
  <NeCard :title="t('common.status')" :loading="loading" :skeletonLines="2">
    <SimpleStat class="mt-1">
      <div class="flex items-center justify-center gap-2">
        <font-awesome-icon
          :icon="['fas', ovpnConfiguration?.enabled === '1' ? 'circle-check' : 'circle-xmark']"
          aria-hidden="true"
        />
        <span>{{
          ovpnConfiguration?.enabled === '1' ? t('common.enabled') : t('common.disabled')
        }}</span>
      </div>
    </SimpleStat>
  </NeCard>
</template>
