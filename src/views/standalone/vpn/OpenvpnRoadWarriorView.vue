<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeTitle, NeEmptyState, NeButton } from '@nethserver/vue-tailwind-lib'
import RWAccountsManager from '@/components/standalone/openvpn_rw/RWAccountsManager.vue'
import RWServerDetails from '@/components/standalone/openvpn_rw/RWServerDetails.vue'

const { t } = useI18n()

const serverConfigured = true
</script>

<template>
  <NeTitle>{{ t('standalone.openvpn_rw.title') }}</NeTitle>

  <div class="flex flex-col gap-y-6">
    <div class="flex flex-col">
      <NeTitle level="h3">{{ t('standalone.openvpn_rw.roadwarrior_server') }}</NeTitle>
      <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
        {{ t('standalone.openvpn_rw.roadwarrior_server_description') }}
      </p>
    </div>
    <NeEmptyState
      v-if="!serverConfigured"
      :title="t('standalone.openvpn_rw.no_openvpn_rw_server_found')"
      :icon="['fas', 'globe']"
      ><NeButton kind="primary" @click="() => {}"
        ><template #prefix>
          <font-awesome-icon
            :icon="['fas', 'wrench']"
            class="h-4 w-4"
            aria-hidden="true"
          /> </template
        >{{ t('standalone.openvpn_rw.create_server') }}</NeButton
      ></NeEmptyState
    >
    <RWServerDetails v-else />

    <RWAccountsManager v-if="serverConfigured" />
  </div>
</template>
