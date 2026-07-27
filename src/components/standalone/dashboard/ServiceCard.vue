<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeBadgeV2, NeCard, getAxiosErrorMessage } from '@nethesis/vue-components'
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  useDashboardOverview,
  type DashboardCounterName,
  type DashboardServiceName
} from '@/composables/useDashboardOverview'
import { getStatusBadge } from '@/lib/standalone/dashboard'

type CardCounter = {
  name: DashboardCounterName
  label: string
}

const props = defineProps<{
  serviceName?: DashboardServiceName
  hasStatus?: boolean
  counter?: CardCounter
  title?: string
  icon?: string[]
}>()

const { t } = useI18n()

const { data: overview, isPending, isError, error } = useDashboardOverview()

const serviceStatus = computed(() =>
  props.serviceName ? overview.value?.services[props.serviceName] : undefined
)
const badge = computed(() => getStatusBadge(serviceStatus.value))
const serviceCounter = computed(() =>
  props.counter ? overview.value?.counters[props.counter.name] : undefined
)

const errorTitle = computed(() => (isError.value ? t('error.cannot_retrieve_service_status') : ''))
const errorDescription = computed(() => (isError.value ? t(getAxiosErrorMessage(error.value)) : ''))
</script>

<template>
  <NeCard
    :title="title"
    :icon="icon"
    :skeleton-lines="2"
    :loading="isPending"
    :error-title="errorTitle"
    :error-description="errorDescription"
  >
    <!-- title slot (if present) -->
    <template #title>
      <slot name="title"></slot>
    </template>
    <div class="space-y-3">
      <NeBadgeV2 v-if="hasStatus" :kind="badge.kind">
        <FontAwesomeIcon :icon="badge.icon" class="size-4" />
        {{ t(badge.textKey) }}
      </NeBadgeV2>
      <div v-if="counter">
        <span class="text-xl">{{ serviceCounter ?? '-' }}</span>
        <span v-if="counter.label" class="ml-2">{{ counter.label }}</span>
      </div>
    </div>
  </NeCard>
</template>
