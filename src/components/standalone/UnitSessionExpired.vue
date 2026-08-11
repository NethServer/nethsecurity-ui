<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeButton, NeHeading, NeInlineNotification } from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'
import { getProductName } from '@/lib/config'
import loginLogoUrl from '@/assets/login_logo.svg'

/**
 * Shown instead of the login form when this UI is served through a controller and the handed-over
 * session is missing or expired.
 *
 * The login form would be a dead end here: the unit's credentials are provisioned and held by the
 * controller, so the operator has never seen them. The only way forward is to go back to the
 * controller and reopen the unit, which mints a fresh token.
 *
 * Deliberately not an automatic redirect — if the controller cannot mint a token, an automatic
 * bounce would ping-pong between the two SPAs.
 */
const { t } = useI18n()

function backToController() {
  window.location.assign(`${window.location.origin}/#/controller/units`)
}
</script>

<template>
  <div class="flex h-screen min-h-full flex-1 bg-gray-200 dark:bg-gray-950">
    <div
      class="flex flex-1 flex-col justify-center px-4 py-12 sm:px-6 lg:flex-none lg:px-20 xl:px-24"
    >
      <div class="mx-auto w-full max-w-md">
        <div class="bg-gray-50 px-6 py-12 shadow sm:rounded-lg sm:px-12 dark:bg-gray-900">
          <NeHeading tag="h4" class="mb-4">
            {{ t('login.unit_session_expired_title') }}
          </NeHeading>
          <div class="mb-6 text-sm text-gray-700 dark:text-gray-100">
            {{ t('login.unit_session_expired_description', { product: getProductName() }) }}
          </div>
          <NeInlineNotification
            kind="info"
            :title="t('login.unit_session_expired_hint_title')"
            :description="t('login.unit_session_expired_hint_description')"
            class="mb-6"
          />
          <NeButton kind="primary" size="lg" class="w-full" @click="backToController">
            <template #prefix>
              <FontAwesomeIcon :icon="faArrowLeft" aria-hidden="true" />
            </template>
            {{ t('common.shell.back_to_controller') }}
          </NeButton>
        </div>
      </div>
    </div>
    <div
      class="relative hidden w-0 flex-1 items-center justify-center bg-linear-to-t from-gray-950 to-primary-800 lg:flex"
    >
      <img :src="loginLogoUrl" alt="" class="w-2/3 xl:w-2/5 3xl:w-1/3 5xl:w-1/4" />
    </div>
  </div>
</template>
