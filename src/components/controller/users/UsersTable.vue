<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeDropdown,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination
} from '@nethesis/vue-components'
import { NeButton } from '@nethesis/vue-components'
import { type ControllerAccount } from '@/stores/controller/accounts'
import { useLoginStore } from '@/stores/controller/controllerLogin'

const props = defineProps<{
  users: ControllerAccount[]
}>()

const emit = defineEmits<{
  delete: [item: ControllerAccount]
  edit: [item: ControllerAccount]
}>()

const { t } = useI18n()
const controllerLogin = useLoginStore()
const { currentPage, pageCount, paginatedItems } = useItemPagination(() => props.users, {
  itemsPerPage: 10
})

function getDropdownItems(item: ControllerAccount) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('delete', item)
      },
      disabled: item.username === controllerLogin.username
    }
  ]
}
</script>

<template>
  <NeTable :ariaLabel="t('controller.users.title')" cardBreakpoint="md">
    <NeTableHead>
      <NeTableHeadCell>
        {{ t('controller.users.username') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        {{ t('controller.users.display_name') }}
      </NeTableHeadCell>
      <NeTableHeadCell>
        <!-- no header for actions -->
      </NeTableHeadCell>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.username">
        <NeTableCell :data-label="t('controller.users.username')">
          {{ item.username }}
        </NeTableCell>
        <NeTableCell :data-label="t('controller.users.display_name')">
          {{ item.display_name }}
        </NeTableCell>
        <NeTableCell :data-label="t('common.actions')">
          <div class="align-center -ml-2.5 flex gap-2 md:ml-0 md:justify-end">
            <NeButton kind="tertiary" @click="emit('edit', item)">
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
        </NeTableCell>
      </NeTableRow>
    </NeTableBody>
    <template #paginator v-if="pageCount > 1">
      <NePaginator
        :current-page="currentPage ?? 1"
        :total-pages="pageCount ?? 1"
        :next-label="t('common.next')"
        :previous-label="t('common.previous')"
        @select-page="
                (page: number) => {
                  currentPage = page
                }
              "
      />
    </template>
  </NeTable>
</template>
