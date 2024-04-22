<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../../standalone/NeTable.vue'
import { NeDropdown, useItemPagination } from '@nethesis/vue-components'
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

const tableHeaders = [
  {
    label: t('controller.users.username'),
    key: 'username'
  },
  {
    label: t('controller.users.display_name'),
    key: 'display_name'
  },
  {
    label: '',
    key: 'menu'
  }
]

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
  <NeTable
    :data="paginatedItems"
    :headers="tableHeaders"
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
  >
    <template #menu="{ item }: { item: ControllerAccount }">
      <div class="align-center flex justify-end">
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
    </template>
  </NeTable>
</template>
