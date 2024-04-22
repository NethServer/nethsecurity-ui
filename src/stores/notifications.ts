//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { uid } from 'uid/single'
import { type NeNotification } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { useLoginStore as useControllerLoginStore } from '@/stores/controller/controllerLogin'
import { useLoginStore as useStandaloneLoginStore } from '@/stores/standalone/standaloneLogin'
import { isEmpty } from 'lodash-es'
import { isStandaloneMode } from '@/lib/config'

const NOTIFICATIONS_LIMIT = 30
const DEFAULT_NOTIFICATION_TIMEOUT = 5000
const ERROR_NOTIFICATION_TIMEOUT = 10000

export const useNotificationsStore = defineStore('notifications', () => {
  const { t } = useI18n()
  const notifications = ref<NeNotification[]>([])
  const isAxiosErrorModalOpen = ref(false)
  const axiosErrorNotificationToShow = ref<NeNotification>()
  const isNotificationDrawerOpen = ref(false)

  const numNotifications = computed(() => {
    return notifications.value.length
  })

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

  const getErrorDescription = (axiosError: any, isUbusCall: boolean) => {
    if (isUbusCall && JSON.parse(axiosError.config.data)?.method) {
      const ubusPath = JSON.parse(axiosError.config.data).path
      const ubusMethod = JSON.parse(axiosError.config.data).method
      return `${ubusPath} ${ubusMethod}`
    } else {
      // return last segment of api url
      const chunks = axiosError.config.url.split('/api/')

      if (chunks.length == 2) {
        return axiosError.config.url.split('/api/')[1]
      } else {
        return axiosError.config.url
      }
    }
  }

  const createNotification = (notificationData: any) => {
    const notification: NeNotification = {
      id: notificationData.id || uid(),
      kind: notificationData.kind || 'info',
      title: notificationData.title || '',
      description: notificationData.description || '',
      timestamp: notificationData.timestamp || new Date(),
      payload: notificationData.payload || undefined,
      primaryLabel: notificationData.primaryLabel || '',
      secondaryLabel: notificationData.secondaryLabel || ''
    }
    notification.primaryAction = notificationData.primaryAction || undefined
    notification.secondaryAction = notificationData.secondaryAction || undefined
    addNotification(notification)
  }

  const createNotificationFromAxiosError = (axiosError: any) => {
    const isUbusCall = axiosError.config.url.includes('/ubus/call')
    const notificationTitle = isUbusCall
      ? t('error_modal.ubus_request_failed')
      : t('error_modal.api_request_failed')

    const notification: NeNotification = {
      id: uid(),
      kind: 'error',
      title: notificationTitle,
      description: getErrorDescription(axiosError, isUbusCall),
      timestamp: new Date(),
      payload: axiosError,
      primaryLabel: t('notifications.show_details'),
      secondaryLabel: t('error_modal.copy_command')
    }

    notification.primaryAction = () => {
      showErrorDetails(notification)
    }
    notification.secondaryAction = () => {
      copyCommandToClipboard(notification)
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
    let token
    if (isStandaloneMode()) {
      token = useStandaloneLoginStore().token
    } else {
      token = useControllerLoginStore().token
    }
    const url = notification.payload.config.url
    const tokenChunk = token ? `-H 'Authorization: Bearer ${token}'` : ''
    const data = notification.payload.config.data
    const dataChunk = data ? `-d ${JSON.stringify(data)}` : ''

    const curlCommand = `curl -X ${notification.payload.config.method.toUpperCase()} '${url}' --insecure -H 'Content-Type: application/json' ${tokenChunk} ${dataChunk}`
    navigator.clipboard.writeText(curlCommand)
  }

  const copyCommandToClipboard = (notification: NeNotification) => {
    const isUbusCall = notification.payload?.config.url.includes('/ubus/call')

    if (!isUbusCall) {
      copyCurlToClipboard(notification)
    } else {
      // it's a ubus call
      const inputData = JSON.parse(notification.payload.config.data)
      const ubusPath = inputData.path

      // check if it's a ns.xyz api
      if (new RegExp(/^ns\..+/).test(ubusPath)) {
        copyUbusApiCommandToClipboard(notification)
      } else {
        // it's a ubus call but not a ns.xyz api, let's copy curl command
        copyCurlToClipboard(notification)
      }
    }
  }

  const copyUbusApiCommandToClipboard = (notification: NeNotification) => {
    const inputData = JSON.parse(notification.payload.config.data)
    const ubusPath = inputData.path
    const ubusMethod = inputData.method
    const inputPayload = inputData.payload
    let command = ``

    if (!isEmpty(inputPayload)) {
      command += `echo '${JSON.stringify(inputPayload)}' | `
    }
    command += `/usr/libexec/rpcd/${ubusPath} call ${ubusMethod}`
    navigator.clipboard.writeText(command)
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
    numNotifications,
    axiosErrorNotificationToShow,
    isAxiosErrorModalOpen,
    isNotificationDrawerOpen,
    addNotification,
    setNotificationShown,
    createNotification,
    createNotificationFromAxiosError,
    setAxiosErrorModalOpen,
    setAxiosErrorNotificationToShow,
    copyCommandToClipboard,
    setNotificationDrawerOpen,
    hideNotification
  }
})
