<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeCard } from '@nethesis/vue-components'
import { faTrash } from '@fortawesome/free-solid-svg-icons'

defineProps<{
  bypass: string
}>()

const { t } = useI18n()

const emit = defineEmits<{
  delete: [item: string]
}>()
</script>

<template>
  <NeCard
    :menu-items="[
      {
        id: 'delete',
        label: t('common.delete'),
        icon: faTrash,
        action: () => emit('delete', bypass),
        danger: true
      }
    ]"
    class="border-l-4 border-indigo-400 dark:border-indigo-500"
  >
    <template #title>
      <div>
        <span>{{ bypass }}</span>
      </div>
    </template>
  </NeCard>
</template>
