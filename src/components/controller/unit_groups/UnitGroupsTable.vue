<!--
  Copyright (C) 2025 Nethesis S.r.l.
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
  useItemPagination,
  NeButton,
  formatDateLoc,
  NeTooltip
} from '@nethesis/vue-components'
import { ref } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faPenToSquare, faTrash } from '@fortawesome/free-solid-svg-icons'
import type { UnitGroup } from '@/stores/controller/unit_groups'
import DeleteUnitGroupModal from './DeleteUnitGroupModal.vue'

const props = defineProps<{
  unitGroups: UnitGroup[]
  unitNameMap?: Record<string, string>
}>()

const emit = defineEmits<{
  'edit-group': [selectedGroup: UnitGroup]
  'group-deleted': []
}>()

const { t } = useI18n()
const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => props.unitGroups, {
  itemsPerPage: pageSize
})
const showDeleteModal = ref(false)
const selectedGroup = ref<UnitGroup>()

function getDropdownItems(item: UnitGroup) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      icon: faTrash,
      disabled: item.used_by && item.used_by.length > 0,
      danger: true,
      action: () => {
        openDeleteModal(item)
      }
    }
  ]
}

function openDeleteModal(itemToDelete: UnitGroup) {
  selectedGroup.value = itemToDelete
  showDeleteModal.value = true
}

function closeDeleteModal() {
  showDeleteModal.value = false
  selectedGroup.value = undefined
  emit('group-deleted')
}
</script>

<template>
  <div>
    <NeTable :aria-label="t('controller.unit_groups.title')" card-breakpoint="xl">
      <NeTableHead>
        <NeTableHeadCell>
          {{ t('controller.unit_groups.name') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('controller.unit_groups.description') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('controller.unit_groups.units') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          {{ t('controller.unit_groups.used_by') }}
        </NeTableHeadCell>
        <NeTableHeadCell>
          <!-- no header for actions -->
        </NeTableHeadCell>
      </NeTableHead>
      <NeTableBody>
        <NeTableRow v-for="item in paginatedItems" :key="item.id">
          <NeTableCell :data-label="t('controller.unit_groups.name')">
            <div>{{ item.name }}</div>
            <!-- more info button -->
            <div>
              <NeTooltip interactive :max-width="450">
                <template #trigger>
                  <NeButton size="sm" kind="tertiary" class="-mx-2">
                    {{ t('common.more_info') }}
                  </NeButton>
                </template>
                <template #content>
                  <div class="space-y-1 px-2 py-1">
                    <!-- number of units -->
                    <div>
                      <span class="mr-2 inline-block font-semibold">
                        {{ t('controller.unit_groups.units_number') }}:
                      </span>
                      <span class="text-gray-300 dark:text-gray-600">
                        {{ item.units.length || '-' }}
                      </span>
                    </div>
                    <!-- created -->
                    <div v-if="item.created_at">
                      <span class="mr-2 inline-block font-semibold">
                        {{ t('controller.unit_groups.created') }}:
                      </span>
                      <span class="text-gray-300 dark:text-gray-600">
                        {{ formatDateLoc(new Date(item.created_at), 'PPpp') || '-' }}
                      </span>
                    </div>
                    <!-- updated -->
                    <div v-if="item.updated_at">
                      <span class="mr-2 inline-block font-semibold">
                        {{ t('controller.unit_groups.updated') }}:
                      </span>
                      <span class="text-gray-300 dark:text-gray-600">
                        {{ formatDateLoc(new Date(item.updated_at), 'PPpp') || '-' }}
                      </span>
                    </div>
                  </div>
                </template>
              </NeTooltip>
            </div>
          </NeTableCell>
          <NeTableCell :data-label="t('controller.unit_groups.description')">
            {{ item.description }}
          </NeTableCell>
          <NeTableCell :data-label="t('controller.unit_groups.units')">
            <span v-if="item.units && item.units.length" class="truncate">
              {{
                item.units
                  .slice(0, 2)
                  .map((unitId: string) => props.unitNameMap?.[unitId] || unitId)
                  .join(', ')
              }}
              <template v-if="item.units.length > 2">
                {{ t('common.plus_num_others', { num: item.units.length - 2 }) }}
              </template>
            </span>
            <span v-else>-</span>
          </NeTableCell>
          <NeTableCell :data-label="t('controller.unit_groups.used_by')">
            <span v-if="item.used_by && item.used_by.length" class="truncate">
              {{ item.used_by.join(', ') }}
            </span>
            <span v-else>-</span>
          </NeTableCell>
          <NeTableCell :data-label="t('common.actions')">
            <div class="align-center -ml-2.5 flex gap-2 md:ml-0 md:justify-end">
              <NeButton kind="tertiary" @click="emit('edit-group', item)">
                <template #prefix>
                  <FontAwesomeIcon :icon="faPenToSquare" class="h-4 w-4" aria-hidden="true" />
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
          :total-rows="props.unitGroups.length"
          :page-size="pageSize"
          :nav-pagination-label="t('ne_table.pagination')"
          :next-label="t('ne_table.go_to_next_page')"
          :previous-label="t('ne_table.go_to_previous_page')"
          :range-of-total-label="t('ne_table.of')"
          :page-size-label="t('ne_table.show')"
          @select-page="
            (page: number) => {
              currentPage = page
            }
          "
          @select-page-size="
            (size: number) => {
              pageSize = size
            }
          "
        />
      </template>
    </NeTable>

    <DeleteUnitGroupModal
      :visible="showDeleteModal"
      :item-to-delete="selectedGroup"
      @group-deleted="closeDeleteModal()"
    />
  </div>
</template>
