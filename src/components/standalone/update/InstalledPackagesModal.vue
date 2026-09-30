<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeEmptyState,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTextInput,
  useItemPagination
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, ref, watch } from 'vue'
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus'
import { faBoxOpen, faChevronLeft, faChevronRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
export type InstalledPackage = {
  name: string
  version: string
}

type InstalledPackagesResponse = {
  data: {
    packages: InstalledPackage[]
  }
}

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: []
}>()

const { t } = useI18n()

const PAGE_SIZE = 8

const searchTerm = ref('')

const {
  data: packages,
  isPending,
  isError,
  error
} = useQuery({
  queryKey: ['update', 'installed-packages'],
  queryFn: ({ signal }) =>
    ubusCall<InstalledPackagesResponse>('ns.update', 'list-installed-packages', {}, { signal }),
  select: (response) => response.data.packages,
  enabled: () => props.visible
})

const filteredPackages = computed(() => {
  if (!packages.value) {
    return []
  }
  const search = searchTerm.value.toLowerCase()
  if (!search) {
    return packages.value
  }
  return packages.value.filter(
    (item) =>
      item.name.toLowerCase().includes(search) || item.version.toLowerCase().includes(search)
  )
})

const { currentPage, pageCount, paginatedItems } = useItemPagination(() => filteredPackages.value, {
  itemsPerPage: PAGE_SIZE
})

watch(searchTerm, () => {
  currentPage.value = 1
})

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      searchTerm.value = ''
      currentPage.value = 1
    }
  }
)
</script>

<template>
  <NeModal
    :visible="visible"
    kind="neutral"
    size="md"
    :title="t('standalone.update.installed_packages')"
    :primary-label="t('common.close')"
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="emit('close')"
  >
    <div class="space-y-6">
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('standalone.update.installed_packages_description') }}
      </p>
      <NeInlineNotification
        v-if="isError"
        :title="t('error.cannot_retrieve_installed_packages')"
        :description="t(getAxiosErrorMessage(error))"
        kind="error"
      />
      <NeSkeleton v-else-if="isPending" :lines="10" />
      <template v-else>
        <NeTextInput v-model="searchTerm" :placeholder="t('common.filter')" is-search />
        <NeEmptyState
          v-if="filteredPackages.length == 0"
          :icon="faBoxOpen"
          :title="
            searchTerm
              ? t('standalone.update.no_installed_packages_found')
              : t('standalone.update.no_installed_packages')
          "
          :description="
            searchTerm ? t('standalone.update.no_installed_packages_found_description') : ''
          "
        >
          <NeButton v-if="searchTerm" kind="tertiary" @click="searchTerm = ''">
            {{ t('common.clear_filter') }}
          </NeButton>
        </NeEmptyState>
        <template v-else>
          <dl>
            <div
              v-for="item in paginatedItems"
              :key="item.name"
              class="flex gap-4 border-gray-200 px-4 py-2 not-last:border-b dark:border-gray-700"
            >
              <dt class="font-medium">{{ item.name }}</dt>
              <dd class="ml-auto">{{ item.version }}</dd>
            </div>
          </dl>
          <nav
            :aria-label="t('ne_table.pagination')"
            class="flex items-center justify-between gap-4"
          >
            <ul class="flex h-10 items-center -space-x-px text-base">
              <li>
                <button
                  :disabled="currentPage === 1"
                  :aria-label="t('ne_table.go_to_previous_page')"
                  class="ms-0 flex h-10 items-center justify-center rounded-s-lg border border-e-0 border-gray-300 bg-white px-4 leading-tight text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                  @click="currentPage--"
                >
                  <span class="sr-only">{{ t('ne_table.go_to_previous_page') }}</span>
                  <FontAwesomeIcon
                    :icon="faChevronLeft"
                    class="h-3 w-3 shrink-0"
                    aria-hidden="true"
                  />
                </button>
              </li>
              <li>
                <button
                  :disabled="currentPage >= pageCount"
                  :aria-label="t('ne_table.go_to_next_page')"
                  class="flex h-10 items-center justify-center rounded-e-lg border border-gray-300 bg-white px-4 leading-tight text-gray-500 hover:bg-gray-50 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-400 dark:hover:bg-gray-900 dark:hover:text-white"
                  @click="currentPage++"
                >
                  <span class="sr-only">{{ t('ne_table.go_to_next_page') }}</span>
                  <FontAwesomeIcon
                    :icon="faChevronRight"
                    class="h-3 w-3 shrink-0"
                    aria-hidden="true"
                  />
                </button>
              </li>
            </ul>
            <span class="text-sm text-gray-700 dark:text-gray-100">
              {{ t('ne_table.page_of_total', { page: currentPage, total: pageCount }) }}
            </span>
          </nav>
        </template>
      </template>
    </div>
  </NeModal>
</template>
