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
import { ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCircleCheck, faCircleXmark } from '@fortawesome/free-solid-svg-icons'

const props = defineProps<{
  users: ControllerAccount[]
}>()

const emit = defineEmits<{
  delete: [item: ControllerAccount]
  edit: [item: ControllerAccount]
}>()

const { t } = useI18n()
const controllerLogin = useLoginStore()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.users, {
  itemsPerPage: pageSize
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
        {{ t('controller.users.two_fa_status') }}
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
        <NeTableCell :data-label="t('controller.users.two_fa_status')">
          <span class="flex items-center gap-2">
            <template v-if="item.two_fa">
              <FontAwesomeIcon :icon="faCircleCheck" class="text-green-700 dark:text-green-500" />
              <span>{{ t('controller.users.two_fa_enabled') }}</span>
            </template>
            <template v-else>
              <FontAwesomeIcon :icon="faCircleXmark" />
              <span>{{ t('controller.users.two_fa_disabled') }}</span>
            </template>
          </span>
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
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="props.users.length"
        :page-size="pageSize"
        :nav-pagination-label="t('ne_table.pagination')"
        :next-label="t('ne_table.go_to_next_page')"
        :previous-label="t('ne_table.go_to_previous_page')"
        :range-of-total-label="t('ne_table.of')"
        :page-size-label="t('ne_table.show')"
        @select-page="
            (page: number) => {
              currentPage = page
            }"
        @selectPageSize="
            (size: number) => {
              pageSize = size
            }"
      />
    </template>
  </NeTable>
</template>
