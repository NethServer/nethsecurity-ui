<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { NeHeading } from '@nethesis/vue-components'
import LiveTrace from '@/components/standalone/monitoring/livetrace/LiveTrace.vue'

const { t } = useI18n()
</script>

<template>
  <div>
    <NeHeading tag="h3" class="mb-7">
      {{ t('standalone.live_trace.title') }}
    </NeHeading>
    <LiveTrace />
  </div>
</template>
