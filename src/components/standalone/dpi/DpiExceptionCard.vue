<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import type { DpiException } from './DpiExceptions.vue'
import { NeCard, NeButton } from '@nethserver/vue-tailwind-lib'

defineProps<{
  exception: DpiException
}>()

const { t } = useI18n()

const emit = defineEmits<{
  (e: 'delete-exception', item: DpiException): void
  (e: 'edit-exception', item: DpiException): void
}>()
</script>

<template>
  <NeCard
    :menuItems="[
      {
        id: 'delete',
        label: t('common.delete'),
        icon: 'trash',
        iconStyle: 'fas',
        action: () => emit('delete-exception', exception),
        danger: true
      }
    ]"
    class="min-h-[10rem] border-l-4 border-indigo-400 dark:border-indigo-500"
  >
    <template #title>
      <div :class="{ 'opacity-50': !exception.enabled }">
        <span>{{ exception.description }}</span>
      </div>
    </template>
    <template #topRight>
      <NeButton kind="tertiary" size="lg" @click="emit('edit-exception', exception)">
        <template #prefix>
          <font-awesome-icon :icon="['fas', 'pen-to-square']" class="h-4 w-4" aria-hidden="true" />
        </template>
        {{ t('common.edit') }}
      </NeButton>
    </template>
    <div :class="{ 'opacity-50': !exception.enabled }">
      <!-- exception enabled -->
      <div v-if="exception.enabled" class="flex items-center">
        <font-awesome-icon
          :icon="['fas', 'circle-check']"
          class="mr-2 h-4 w-4"
          aria-hidden="true"
        />
        <span>{{ t('common.enabled') }}</span>
      </div>
      <!-- exception disabled -->
      <div v-else class="flex items-center">
        <font-awesome-icon
          :icon="['fas', 'circle-xmark']"
          class="mr-2 h-4 w-4"
          aria-hidden="true"
        />
        <span>{{ t('common.disabled') }}</span>
      </div>
      <!-- exception criteria -->
      <NeCard alternateBackground class="mt-4">
        <div class="divide-y divide-gray-300 dark:divide-gray-600">
          <p>{{ exception.criteria }}</p>
        </div>
      </NeCard>
    </div>
  </NeCard>
</template>
