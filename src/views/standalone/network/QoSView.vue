<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeTitle } from '@nethserver/vue-tailwind-lib'

const { t } = useI18n()
</script>

<template>
  <NeTitle>{{ t('standalone.qos.title') }}</NeTitle>
</template>
