<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs'
import { NeTitle, NeTabs } from '@nethserver/vue-tailwind-lib'
import BackupContent from '@/components/standalone/backup_and_restore/BackupContent.vue'
import RestoreContent from '@/components/standalone/backup_and_restore/RestoreContent.vue'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  {
    name: 'tab-backup',
    label: t('standalone.backup_and_restore.tabs.backup')
  },
  {
    name: 'tab-restore',
    label: t('standalone.backup_and_restore.tabs.restore')
  }
])
</script>
<template>
  <NeTitle>{{ t('standalone.backup_and_restore.title') }}</NeTitle>
  <div class="flex flex-col gap-y-6">
    <NeTabs
      :selected="selectedTab"
      :srSelectTabLabel="t('ne_tabs.select_a_tab')"
      :srTabsLabel="t('ne_tabs.tabs')"
      :tabs="tabs"
      class="mb-8"
      @selectTab="selectedTab = $event"
    />
    <BackupContent v-if="selectedTab == 'tab-backup'" />
    <RestoreContent v-if="selectedTab == 'tab-restore'" />
  </div>
</template>
