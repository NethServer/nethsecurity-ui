<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <NeTitle>{{ t('standalone.controller.title') }}</NeTitle>
</template>
