<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeSideDrawer,
  NeEmptyState,
  NeToastNotificationV2,
  NeToastNotification
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useNotificationsStore } from '@/stores/notifications'
import { isEmpty } from 'lodash-es'
import { faBell } from '@fortawesome/free-solid-svg-icons'
import { useAlerts } from '@/composables/useAlerts'
import { useRoute, useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const { notifications: alertNotifications } = useAlerts()

function closeDrawer() {
  notificationsStore.setNotificationDrawerOpen(false)
}

const router = useRouter()
const route = useRoute()

function goToAlerts() {
  closeDrawer()
  router.push(`${getStandaloneRoutePrefix(route)}/monitoring/metrics?tab=alerts`)
}
</script>

<template>
  <NeSideDrawer
    :is-shown="notificationsStore.isNotificationDrawerOpen"
    :title="t('notifications.title')"
    :close-aria-label="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <div class="space-y-6">
      <!-- empty state -->
      <NeEmptyState
        v-if="isEmpty(notificationsStore.notifications) && alertNotifications.length == 0"
        :title="t('notifications.no_notification')"
        :icon="faBell"
      />
      <!-- notifications -->
      <div v-else class="flex w-full flex-col items-center space-y-4 sm:items-end">
        <TransitionGroup name="fade">
          <template v-if="alertNotifications.length > 0">
            <NeToastNotificationV2
              v-for="alert in alertNotifications"
              :key="alert.id"
              :notification="alert"
              :sr-close-label="t('common.close')"
              full-width
              @action="goToAlerts"
            />
          </template>
          <NeToastNotification
            v-for="notification in notificationsStore.notifications"
            :key="notification.id"
            :notification="notification"
            full-width
            show-timestamp
            :sr-close-label="t('common.close')"
          />
        </TransitionGroup>
      </div>
    </div>
  </NeSideDrawer>
</template>
