<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getCompanyName } from '@/lib/config'
import { useAppLogo } from '@/composables/useAppLogo'

const { logoUrl } = useAppLogo()
</script>

<template>
  <div class="flex h-16 shrink-0 flex-col items-start justify-center pt-3 pl-3">
    <img class="h-7 w-auto" :src="logoUrl" :alt="`${getCompanyName()} logo`" />
    <span class="text-base text-primary-700 dark:text-primary-500">Controller</span>
  </div>
</template>
