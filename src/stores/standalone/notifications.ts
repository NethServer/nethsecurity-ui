//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ref } from 'vue'
import { defineStore } from 'pinia'
import { uid } from 'uid/single'
import { getAxiosErrorMessage, type NeNotification } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { useLoginStore } from './standaloneLogin'

const NOTIFICATIONS_LIMIT = 30
const DEFAULT_NOTIFICATION_TIMEOUT = 5000
const ERROR_NOTIFICATION_TIMEOUT = 10000

export const useNotificationsStore = defineStore('notifications', () => {
  const { t } = useI18n()
  const loginStore = useLoginStore()
  const notifications = ref<NeNotification[]>([])
  const isAxiosErrorModalOpen = ref(false)
  const axiosErrorNotificationToShow = ref<NeNotification>()
  const isNotificationDrawerOpen = ref(false)

  const addNotification = (notification: NeNotification) => {
    notifications.value.unshift(notification)
    setNotificationShown(notification.id, true)

    // limit total number of notifications
    notifications.value = notifications.value.slice(0, NOTIFICATIONS_LIMIT)
  }

  const getNotificationTimeout = (notification: NeNotification) => {
    return ['error', 'warning'].includes(notification.kind)
      ? ERROR_NOTIFICATION_TIMEOUT
      : DEFAULT_NOTIFICATION_TIMEOUT
  }

  const createNotificationFromAxiosError = (axiosError: any) => {
    const notificationTitle = axiosError.config.url.includes('/ubus/call')
      ? t('notifications.ubus_call_failed')
      : t('notifications.api_call_failed')

    const notification: NeNotification = {
      id: uid(),
      kind: 'error',
      title: notificationTitle,
      description: t(getAxiosErrorMessage(axiosError)),
      timestamp: new Date(),
      payload: axiosError,
      primaryLabel: t('notifications.show_details'),
      secondaryLabel: t('notifications.copy_curl')
    }

    notification.primaryAction = () => {
      showErrorDetails(notification)
    }
    notification.secondaryAction = () => {
      copyCurlToClipboard(notification)
    }
    addNotification(notification)
  }

  const setNotificationShown = (notificationId: string, isShown: boolean) => {
    const notification = notifications.value.find((n) => n.id === notificationId)

    if (notification) {
      notification.isShown = isShown

      if (isShown) {
        // hide notification after a while
        setTimeout(() => {
          setNotificationShown(notificationId, false)
        }, getNotificationTimeout(notification))
      }
    }
  }

  const setAxiosErrorModalOpen = (isOpen: boolean) => {
    isAxiosErrorModalOpen.value = isOpen
  }

  const setAxiosErrorNotificationToShow = (notification: NeNotification) => {
    axiosErrorNotificationToShow.value = notification
  }

  const setNotificationDrawerOpen = (isOpen: boolean) => {
    isNotificationDrawerOpen.value = isOpen
  }

  const copyCurlToClipboard = (notification: NeNotification) => {
    const url = notification.payload.config.url
    const token = loginStore.token
    const tokenChunk = token ? `-H 'Authorization: Bearer ${token}'` : ''
    const data = notification.payload.config.data
    const dataChunk = data ? `-d ${JSON.stringify(data)}` : ''

    const curlCommand = `curl -X ${notification.payload.config.method.toUpperCase()} '${url}' --insecure -H 'Content-Type: application/json' ${tokenChunk} ${dataChunk}`
    navigator.clipboard.writeText(curlCommand)
  }

  const showErrorDetails = (notification: NeNotification) => {
    setAxiosErrorNotificationToShow(notification)
    setAxiosErrorModalOpen(true)
    setNotificationDrawerOpen(false)
  }

  const hideNotification = (notificationId: string) => {
    const notification = notifications.value.find((n) => n.id === notificationId)

    if (notification) {
      setNotificationShown(notificationId, false)
    }
  }

  return {
    notifications,
    axiosErrorNotificationToShow,
    isAxiosErrorModalOpen,
    isNotificationDrawerOpen,
    addNotification,
    setNotificationShown,
    createNotificationFromAxiosError,
    setAxiosErrorModalOpen,
    setAxiosErrorNotificationToShow,
    copyCurlToClipboard,
    setNotificationDrawerOpen,
    hideNotification
  }
})
