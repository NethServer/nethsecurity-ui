<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown, NeButton } from '@nethserver/vue-tailwind-lib'
import type { ReverseProxy } from '@/views/standalone/network/ReverseProxyView.vue'

const { t } = useI18n()

defineProps<{
  proxies: ReverseProxy[]
}>()

const emit = defineEmits(['proxy-delete', 'proxy-edit'])

const tableHeaders = [
  {
    label: t('standalone.reverse_proxy.domain_path'),
    key: 'domain_path'
  },
  {
    label: t('standalone.reverse_proxy.destination_url'),
    key: 'destination'
  },
  {
    label: t('standalone.reverse_proxy.description'),
    key: 'description'
  },
  {
    label: t('standalone.reverse_proxy.allowed_networks'),
    key: 'allow'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: ReverseProxy) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('proxy-delete', item)
      }
    }
  ]
}
</script>

<template>
  <NeTable :data="proxies" :headers="tableHeaders">
    <template #domain_path="{ item }: { item: ReverseProxy }">
      <p>{{ item.domain ?? item.path ?? item.location }}</p>
    </template>
    <template #description="{ item }: { item: ReverseProxy }">
      <p>{{ item.description ? item.description : '-' }}</p>
    </template>
    <template #allow="{ item }: { item: ReverseProxy }">
      <p>{{ item.allow?.slice(0, 2)?.join(', ') ?? '-' }}</p>
      <p class="text-primary-800 dark:text-primary-400" v-if="item.allow && item.allow.length > 2">
        {{ t('standalone.reverse_proxy.and_n_others', { n: item.allow.length - 2 }) }}
      </p>
    </template>
    <template #menu="{ item }: { item: ReverseProxy }">
      <div class="align-center flex justify-end">
        <NeButton kind="tertiary" @click="emit('proxy-edit', item)">
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'pen-to-square']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
          {{ t('common.edit') }}
        </NeButton>
        <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
      </div>
    </template>
  </NeTable>
</template>
