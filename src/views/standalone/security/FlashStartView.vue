<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeHeading } from '@nethesis/vue-components'
const { t } = useI18n()
import FlashstartContent from '@/components/standalone/security/FlashstartContent.vue'
</script>

<template>
  <div class="flex flex-col gap-y-6">
    <NeHeading tag="h3" class="mb-7">{{ t('standalone.flashstart.title') }}</NeHeading>
    <FlashstartContent />
  </div>
</template>
