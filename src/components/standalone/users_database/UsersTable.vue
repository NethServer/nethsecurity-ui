<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeDropdown,
  NeButton,
  NeTable,
  NeTableHead,
  NeTableHeadCell,
  NeTableBody,
  NeTableRow,
  NeTableCell,
  NePaginator,
  useItemPagination,
  NeTooltip
} from '@nethesis/vue-components'
import type { User } from './UsersDatabaseManager.vue'
import { faCrown } from '@fortawesome/free-solid-svg-icons'
import { ref } from 'vue'

const props = defineProps<{
  users: User[]
  isLdapDatabase: boolean
}>()

const emit = defineEmits<{
  delete: [item: User]
  edit: [item: User]
  setAdmin: [item: User]
  removeAdmin: [item: User]
}>()

const { t } = useI18n()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.users, {
  itemsPerPage: pageSize
})

function getDropdownItems(item: User) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('delete', item)
      }
    },
    item.admin
      ? {
          id: 'remove_admin',
          label: t('standalone.users_database.remove_admin'),
          iconStyle: 'fas',
          icon: 'circle-minus',
          action: () => {
            emit('removeAdmin', item)
          }
        }
      : {
          id: 'set_admin',
          label: t('standalone.users_database.set_admin'),
          iconStyle: 'fas',
          icon: 'crown',
          action: () => {
            emit('setAdmin', item)
          }
        }
  ]
}
</script>

<template>
  <NeTable :ariaLabel="t('standalone.users_database.users')" cardBreakpoint="xl">
    <NeTableHead>
      <NeTableHeadCell>{{ t('standalone.users_database.username') }}</NeTableHeadCell>
      <NeTableHeadCell>{{ t('standalone.users_database.display_name') }}</NeTableHeadCell>
      <!-- table headers vary based on the database type: in the case of the local database, the password and menu headers will be included. In the case of a LDAP database, only the username and display name will be shown instead. -->
      <template v-if="!props.isLdapDatabase">
        <NeTableHeadCell>{{ t('standalone.users_database.password') }}</NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </template>
    </NeTableHead>
    <NeTableBody>
      <NeTableRow v-for="item in paginatedItems" :key="item.name">
        <NeTableCell :data-label="t('standalone.users_database.username')">
          <div :class="['flex', 'flex-row', 'items-center']">
            {{ item.name }}
            <NeTooltip interactive v-if="item.admin">
              <template #trigger>
                <FontAwesomeIcon
                  v-if="item.admin"
                  :icon="faCrown"
                  class="ml-2 text-indigo-700 dark:text-indigo-500"
                  aria-hidden="true"
                />
              </template>
              <template #content>
                <p class="text-center">
                  {{ t('standalone.users_database.administrator_table_tooltip') }}
                </p>
              </template></NeTooltip
            >
          </div>
        </NeTableCell>
        <NeTableCell :data-label="t('standalone.users_database.display_name')">
          {{ item.description || '-' }}
        </NeTableCell>
        <template v-if="!props.isLdapDatabase">
          <NeTableCell :data-label="t('standalone.users_database.password')">
            <div :class="['flex', 'flex-row', 'items-center']">
              <font-awesome-icon
                :icon="['fas', item.password ? 'circle-check' : 'circle-xmark']"
                class="mr-2 h-5 w-5"
                aria-hidden="true"
              />
              <p>
                {{
                  item.password
                    ? t('standalone.users_database.set')
                    : t('standalone.users_database.not_set')
                }}
              </p>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('common.actions')">
            <div class="align-center -ml-2.5 flex gap-2 xl:ml-0 xl:justify-end">
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
        </template>
      </NeTableRow>
    </NeTableBody>
    <template #paginator>
      <NePaginator
        :current-page="currentPage"
        :total-rows="users.length"
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
