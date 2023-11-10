<script setup lang="ts">
import { NeTitle, NeButton } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'

const { t } = useI18n()

const updatedAt = new Date().toLocaleString()
const release = 'nethsecurity-22.05.01'

async function checkFixes() {}
</script>

<template>
  <NeTitle>{{ t('standalone.update.title') }}</NeTitle>
  <FormLayout
    :title="t('standalone.update.bug_security_fixes')"
    :description="t('standalone.update.bug_security_fixes_description')"
    class="max-w-4xl"
  >
    <p class="text-sm text-gray-500 dark:text-gray-400">
      {{ t('standalone.update.updated_at', { updateDate: updatedAt }) }}
    </p>
    <NeButton class="mt-4" @click="checkFixes">
      <template #prefix>
        <font-awesome-icon
          :icon="['fas', 'arrows-rotate']"
          class="h-4 w-4"
          aria-hidden="true" /></template
      >{{ t('standalone.update.check_for_fixes') }}</NeButton
    >
  </FormLayout>
  <hr />
  <FormLayout class="mt-6 max-w-4xl" :title="t('standalone.update.system_update')">
    <template #description>
      <p class="mb-4 text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.update.system_update_description') }}
      </p>
      <div class="mb-4 flex flex-row items-start gap-x-2">
        <FontAwesomeIcon
          :icon="['fas', 'circle-info']"
          class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
        />
        <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.update.system_update_first_tip') }}
        </p>
      </div>
      <div class="flex flex-row items-start gap-x-2">
        <FontAwesomeIcon
          :icon="['fas', 'circle-info']"
          class="h-4 w-4 text-indigo-500 dark:text-indigo-300"
        />
        <p class="text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.update.system_update_second_tip') }}
        </p>
      </div>
    </template>

    <p class="text-sm text-gray-500 dark:text-gray-400">
      {{ t('standalone.update.installed_release', { release: release }) }}
    </p>
    <div class="mt-4">
      <NeButton class="mr-4"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'calendar']"
            class="h-4 w-4"
            aria-hidden="true" /></template
        >{{ t('standalone.update.schedule_update') }}</NeButton
      >
      <NeButton kind="tertiary"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'circle-arrow-up']"
            class="h-4 w-4"
            aria-hidden="true" /></template
        >{{ t('standalone.update.upload_image') }}</NeButton
      >
    </div>
  </FormLayout>
</template>
