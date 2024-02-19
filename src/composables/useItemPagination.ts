import { useOffsetPagination } from '@vueuse/core'
import { computed, type Ref } from 'vue'

export type ItemPaginationSettings = {
  itemsPerPage: number
  onPageChange?: () => void
}

export function useItemPagination<T>(items: T[] | Ref<T[]>, settings: ItemPaginationSettings) {
  const { currentPage, pageCount, prev, next } = useOffsetPagination({
    page: 1,
    pageSize: settings.itemsPerPage,
    total: () => (Array.isArray(items) ? items.length : items.value.length),
    onPageChange: settings.onPageChange
  })

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * settings.itemsPerPage
    const end = start + settings.itemsPerPage
    const itemsArray = Array.isArray(items) ? items : items.value
    return itemsArray.slice(start, end)
  })

  return {
    currentPage,
    pageCount,
    paginatedItems,
    prev,
    next
  }
}
