import { useOffsetPagination } from '@vueuse/core'
import { computed, type Ref } from 'vue'

export type ItemPaginationSettings = {
  itemsPerPage: number
  onPageChange?: () => void
}

/**
 * Composable that provides pagination functionality for an array of items,
 * returning the paginated items based on the current page.
 * @param {T[] | Ref<T[]>} items - The array of items to paginate.
 * @param {ItemPaginationSettings} settings - The pagination settings, including the number of items per
 * page and an optional onPageChange callback.
 *
 * @example
 * const { currentPage, pageCount, paginatedItems, prev, next } = useItemPagination(items, { itemsPerPage: 10 });
 */
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
