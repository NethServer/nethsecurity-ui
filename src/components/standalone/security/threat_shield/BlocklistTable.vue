<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import type { Blocklist } from './BlocklistTab.vue'
import { useI18n } from 'vue-i18n'
import NeTable from '../../NeTable.vue'
import { NeProgressBar, useItemPagination } from '@nethesis/vue-components'
import { NeToggle } from '@nethserver/vue-tailwind-lib'
import { range } from 'lodash-es'

const { t } = useI18n()

const props = defineProps<{
  blocklists: Blocklist[]
  disableToggle: boolean
}>()

defineEmits<{
  enableDisable: [item: Blocklist]
}>()

const { currentPage, pageCount, paginatedItems } = useItemPagination(() => props.blocklists, {
  itemsPerPage: 10
})

const tableHeaders = [
  {
    label: t('standalone.threat_shield.name'),
    key: 'name'
  },
  {
    label: t('standalone.threat_shield.type'),
    key: 'type'
  },
  {
    label: t('standalone.threat_shield.confidence'),
    key: 'confidence'
  },
  {
    label: t('common.status'),
    key: 'status'
  }
]

function getTypeLabel(item: Blocklist) {
  switch (item.type) {
    case 'community':
      return t('standalone.threat_shield.community')
    case 'enterprise':
      return t('standalone.threat_shield.enterprise')
    default:
      return t('standalone.threat_shield.unknown')
  }
}

function getTypeIcon(item: Blocklist) {
  switch (item.type) {
    case 'community':
      return 'users'
    case 'enterprise':
      return 'award'
    default:
      return 'warning'
  }
}
</script>

<template>
  <NeTable
    :with-paginator="true"
    :paginator-props="{
      totalPages: pageCount,
      currentPage,
      previousLabel: t('common.previous'),
      nextLabel: t('common.next')
    }"
    @select-page="
      (page) => {
        currentPage = page
      }
    "
    :data="paginatedItems"
    :headers="tableHeaders"
    class="z-10"
  >
    <template #name="{ item }: { item: Blocklist }">
      <p class="w-60 xl:w-40">{{ item.description }}</p>
    </template>
    <template #type="{ item }: { item: Blocklist }">
      <div class="flex flex-row items-center gap-x-2">
        <FontAwesomeIcon :icon="['fas', getTypeIcon(item)]" class="h-5 w-5" />
        <p>
          {{ getTypeLabel(item) }}
        </p>
      </div>
    </template>
    <template #confidence="{ item }: { item: Blocklist }">
      <p v-if="item.confidence === -1">{{ t('standalone.threat_shield.unknown') }}</p>
      <div class="max-w-[10rem]" v-else>
        <div class="mb-2 flex flex-row">
          <div v-for="i in range(0, 10)" :key="i" class="flex grow basis-0 justify-center">
            <p class="text-xs font-semibold" v-if="i + 1 == item.confidence">
              {{ item.confidence }}/10
            </p>
          </div>
        </div>
        <NeProgressBar
          color="custom"
          custom-color-classes="bg-gradient-to-r from-cyan-500 to-indigo-500"
          :progress="(item.confidence / 10) * 100"
          size="sm"
        />
      </div>
    </template>
    <template #status="{ item }: { item: Blocklist }">
      <NeToggle
        v-model="item.enabled"
        @change="
          () => {
            $emit('enableDisable', item)
          }
        "
        :disabled="disableToggle || item.type === 'unknown'"
        :label="item.enabled ? t('common.enabled') : t('common.disabled')"
      />
    </template>
  </NeTable>
</template>
