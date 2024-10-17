<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeSideDrawer, NeEmptyState } from '@nethesis/vue-components'
import { NeToastNotification } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '@/stores/notifications'
import { isEmpty } from 'lodash-es'

const { t } = useI18n()
const notificationsStore = useNotificationsStore()

function closeDrawer() {
  notificationsStore.setNotificationDrawerOpen(false)
}
</script>

<template>
  <NeSideDrawer
    :isShown="notificationsStore.isNotificationDrawerOpen"
    :title="t('notifications.title')"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <!-- empty state -->
    <NeEmptyState
      v-if="isEmpty(notificationsStore.notifications)"
      :title="t('notifications.no_notification')"
      :icon="['fas', 'bell']"
    />
    <!-- notifications -->
    <div v-else class="flex w-full flex-col items-center space-y-4 sm:items-end">
      <TransitionGroup name="fade">
        <NeToastNotification
          v-for="notification in notificationsStore.notifications"
          :key="notification.id"
          :notification="notification"
          fullWidth
          showTimestamp
          :srCloseLabel="t('common.close')"
        />
      </TransitionGroup>
    </div>
  </NeSideDrawer>
</template>
