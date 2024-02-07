<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeTitle } from '@nethesis/vue-components'
const { t } = useI18n()
import FlashstartContent from '@/components/standalone/security/FlashstartContent.vue'
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <NeTitle>{{ t('standalone.flashstart.title') }}</NeTitle>
    <FlashstartContent />
  </div>
</template>
