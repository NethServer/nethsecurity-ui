<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { NeSkeleton, NeInlineNotification } from '@nethserver/vue-tailwind-lib'
import { getStandaloneRoutePrefix } from '@/lib/router'

//// move to library

const props = defineProps({
  title: {
    type: String
  },
  icon: {
    type: Array<string>
  },
  loading: {
    type: Boolean,
    default: false
  },
  skeletonLines: {
    type: Number,
    default: 4
  },
  titleLink: {
    type: String
  },
  errorTitle: {
    type: String
  },
  errorDescription: {
    type: String
  }
})
</script>

<template>
  <div
    class="overflow-hidden bg-white px-4 py-5 text-sm text-gray-700 dark:bg-gray-950 dark:text-gray-200 sm:rounded-lg sm:px-6 sm:shadow"
  >
    <div class="flex flex-row items-center justify-between">
      <div class="grow">
        <NeSkeleton v-if="loading" :lines="skeletonLines"></NeSkeleton>
        <NeInlineNotification
          v-else-if="errorTitle"
          kind="error"
          :title="errorTitle"
          :description="errorDescription"
        />
        <template v-else>
          <h3 v-if="title" class="mb-2 font-semibold leading-6 text-gray-900 dark:text-gray-50">
            <router-link
              v-if="titleLink"
              :to="`${getStandaloneRoutePrefix()}/${titleLink}`"
              class="text-primary-700 dark:text-primary-500"
            >
              {{ title }}
            </router-link>
            <span v-else>
              {{ title }}
            </span>
          </h3>
          <slot></slot>
        </template>
      </div>
      <FontAwesomeIcon
        v-if="icon?.length"
        :icon="icon"
        class="ml-4 h-6 w-6 shrink-0 text-gray-400 dark:text-gray-600"
      />
    </div>
  </div>
</template>
