<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import SshConfig from '@/components/standalone/ssh/SshConfig.vue'
import SshKeys from '@/components/standalone/ssh/SshKeys.vue'

const { t } = useI18n()
</script>

<template>
  <h1 class="page-title">{{ t('standalone.ssh.title') }}</h1>
  <div class="max-w-3xl flex flex-col gap-y-8">
    <SshConfig />
    <hr class="border-gray-200 dark:border-gray-700" />
    <SshKeys />
  </div>
</template>
