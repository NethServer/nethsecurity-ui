<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed } from 'vue'
import { range } from 'lodash-es'

export type PaginatorProps = {
  currentPage: number
  totalPages: number
  previousLabel: string
  nextLabel: string
}

const props = defineProps<PaginatorProps>()

const emit = defineEmits<{
  selectPage: [page: number]
}>()

const firstPages = computed(() => props.currentPage <= 4)
const lastPages = computed(() => props.currentPage >= props.totalPages - 4)

const cellClass =
  'flex h-10 items-center justify-center border border-gray-300 bg-white px-4 leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white'
const currentPageCellClass =
  'z-10 flex items-center justify-center px-4 h-10 leading-tight text-blue-600 border border-blue-300 bg-blue-50 hover:bg-blue-100 hover:text-blue-700 dark:border-gray-700 dark:bg-gray-700 dark:text-white'

function getCellClass(page: number) {
  return props.currentPage === page ? currentPageCellClass : cellClass
}

function getAriaCurrent(page: number) {
  return props.currentPage === page ? 'page' : 'false'
}

function navigateToPage(page: number) {
  emit('selectPage', page)
}
</script>

<template>
  <nav>
    <ul class="flex h-10 items-center -space-x-px text-base">
      <li>
        <button
          @click="navigateToPage(currentPage - 1)"
          :disabled="currentPage === 1"
          class="ms-0 flex h-10 items-center justify-center rounded-s-lg border border-e-0 border-gray-300 bg-white px-4 leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <span class="sr-only">{{ previousLabel }}</span>
          <svg
            class="h-3 w-3 rtl:rotate-180"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 6 10"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M5 1 1 5l4 4"
            />
          </svg>
        </button>
      </li>
      <!-- show all page numbers if there are no more than 8 pages in total -->
      <template v-if="totalPages <= 8">
        <li v-for="i in range(1, totalPages + 1)" :key="i">
          <button
            :aria-current="getAriaCurrent(i)"
            :class="getCellClass(i)"
            @click="navigateToPage(i)"
          >
            {{ i }}
          </button>
        </li>
      </template>
      <!-- show a collapsed view of the pages, with start, ending, previous and next page -->
      <template v-else>
        <li>
          <button
            :aria-current="getAriaCurrent(1)"
            :class="getCellClass(1)"
            @click="navigateToPage(1)"
          >
            1
          </button>
        </li>
        <li>
          <button
            :aria-current="getAriaCurrent(firstPages ? 2 : -1)"
            :class="getCellClass(firstPages ? 2 : -1)"
            @click="firstPages ? navigateToPage(2) : undefined"
          >
            {{ firstPages ? 2 : '...' }}
          </button>
        </li>
        <li v-for="i in range(-1, 2)" :key="i">
          <button
            :aria-current="
              getAriaCurrent(firstPages ? 4 + i : lastPages ? totalPages - 3 + i : currentPage + i)
            "
            :class="
              getCellClass(firstPages ? 4 + i : lastPages ? totalPages - 3 + i : currentPage + i)
            "
            @click="
              navigateToPage(firstPages ? 4 + i : lastPages ? totalPages - 3 + i : currentPage + i)
            "
          >
            {{ firstPages ? 4 + i : lastPages ? totalPages - 3 + i : currentPage + i }}
          </button>
        </li>
        <li>
          <button
            :aria-current="getAriaCurrent(lastPages ? totalPages - 1 : -1)"
            :class="getCellClass(lastPages ? totalPages - 1 : -1)"
            @click="lastPages ? navigateToPage(totalPages - 1) : undefined"
          >
            {{ lastPages ? totalPages - 1 : '...' }}
          </button>
        </li>
        <li>
          <button
            :aria-current="getAriaCurrent(totalPages)"
            :class="getCellClass(totalPages)"
            @click="navigateToPage(totalPages)"
          >
            {{ totalPages }}
          </button>
        </li>
      </template>
      <li>
        <button
          @click="navigateToPage(currentPage + 1)"
          :disabled="currentPage === totalPages"
          class="flex h-10 items-center justify-center rounded-e-lg border border-gray-300 bg-white px-4 leading-tight text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
        >
          <span class="sr-only">{{ nextLabel }}</span>
          <svg
            class="h-3 w-3 rtl:rotate-180"
            aria-hidden="true"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 6 10"
          >
            <path
              stroke="currentColor"
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="m1 9 4-4-4-4"
            />
          </svg>
        </button>
      </li>
    </ul>
  </nav>
</template>
