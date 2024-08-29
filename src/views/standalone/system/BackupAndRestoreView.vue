<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { useTabs } from '@/composables/useTabs'
import { NeHeading, NeTabs } from '@nethesis/vue-components'
import BackupContent from '@/components/standalone/backup_and_restore/BackupContent.vue'
import RestoreContent from '@/components/standalone/backup_and_restore/RestoreContent.vue'
import MigrationContent from '@/components/standalone/backup_and_restore/MigrationContent.vue'

const { t } = useI18n()

const { tabs, selectedTab } = useTabs([
  {
    name: 'tab-backup',
    label: t('standalone.backup_and_restore.tabs.backup')
  },
  {
    name: 'tab-restore',
    label: t('standalone.backup_and_restore.tabs.restore')
  },
  {
    name: 'tab-migration',
    label: t('standalone.backup_and_restore.tabs.migration')
  }
])
</script>
<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.backup_and_restore.title') }}</NeHeading>
  <div class="flex flex-col">
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
    <MigrationContent v-if="selectedTab == 'tab-migration'" />
  </div>
</template>
