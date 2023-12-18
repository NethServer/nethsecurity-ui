<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeButton, NeDropdown } from '@nethserver/vue-tailwind-lib'

const { t } = useI18n()

const emit = defineEmits(['delete-server', 'edit-server'])
</script>

<template>
  <div class="flex w-full flex-col gap-y-6 xl:flex-row xl:gap-x-6 xl:gap-y-0">
    <div
      class="flex grow flex-row items-center justify-between rounded-md border-l-4 border-indigo-400 bg-gray-100 p-2 dark:border-indigo-500 dark:bg-gray-800 sm:rounded-lg sm:shadow"
    >
      <div class="ml-4 flex flex-row items-center">
        <font-awesome-icon
          :icon="['fas', 'server']"
          aria-hidden="true"
          :class="`mr-5 h-4 w-4 rounded-full bg-gray-900 p-2 text-gray-300 dark:bg-gray-50 dark:text-gray-600`"
        />
        <p>{{ t('standalone.openvpn_rw.rw_server') }}</p>
      </div>
      <div
        class="ml-4 mr-10 grow border-l border-gray-800 py-3 pl-4 text-sm dark:border-gray-600 md:ml-8 md:pl-8"
      >
        <div class="flex max-w-xl flex-col justify-between gap-x-4 sm:flex-row">
          <div>
            <p class="mb-2 font-semibold">{{ t('standalone.openvpn_rw.status') }}:</p>
            <div :class="['flex', 'flex-row', 'items-center']">
              <font-awesome-icon
                :icon="['fas', true ? 'circle-check' : 'circle-xmark']"
                :class="['mr-2', 'h-4', 'w-4', true ? 'text-green-500' : 'text-rose-500']"
                aria-hidden="true"
              />
              <p>
                {{ true ? t('common.enabled') : t('common.disabled') }}
              </p>
            </div>
          </div>
          <div>
            <p class="mb-2 font-semibold">{{ t('standalone.openvpn_rw.authentication_mode') }}:</p>
            <p>Username and password</p>
          </div>
          <div>
            <p class="mb-2 font-semibold">{{ t('standalone.openvpn_rw.database') }}:</p>
            <p>Local Database</p>
          </div>
        </div>
      </div>
      <div class="flex flex-row items-center">
        <NeButton kind="tertiary" class="mr-2" @click="emit('edit-server')">
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'pen-to-square']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
          {{ t('common.edit') }}
        </NeButton>
        <NeDropdown
          :items="[
            {
              id: 'delete',
              label: t('common.delete'),
              iconStyle: 'fas',
              icon: 'trash',
              danger: true,
              action: () => {
                emit('delete-server')
              }
            }
          ]"
          :align-to-right="true"
        />
      </div>
    </div>

    <div
      class="flex flex-row items-center justify-between rounded-md bg-gray-100 p-5 dark:bg-gray-800 sm:rounded-lg sm:shadow"
    >
      <div class="flex flex-row items-center">
        <font-awesome-icon
          :icon="['fas', 'circle-info']"
          aria-hidden="true"
          :class="`mr-5 h-4 w-4 rounded-full bg-gray-900 p-2 text-gray-300 dark:bg-gray-50 dark:text-gray-600`"
        />
        <p class="mx-2">Connected clients</p>
      </div>
      <p class="ml-4 text-3xl">2</p>
    </div>
  </div>
</template>
