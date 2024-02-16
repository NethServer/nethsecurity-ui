import { ref, computed, type Ref } from 'vue'

export function usePagination<T>(items: Ref<T[]>, itemsPerPage: number) {
  // TODO: allow usage of both refs/getters and values
  // TODO: make use of useOffsetPagination from vue-use?

  const currentPage = ref(1)

  const paginatedItems = computed(() => {
    const start = (currentPage.value - 1) * itemsPerPage
    const end = start + itemsPerPage
    console.log(items, start, end)
    return items.value.slice(start, end)
  })

  const lastPage = computed(() => Math.ceil(items.value.length / itemsPerPage))

  const nextPage = () => {
    if (currentPage.value * itemsPerPage < items.value.length) {
      currentPage.value++
    }
  }

  const prevPage = () => {
    if (currentPage.value > 1) {
      currentPage.value--
    }
  }

  const setPage = (page: number) => {
    if (page >= 0 && page * itemsPerPage < items.value.length) {
      currentPage.value = page
    }
  }

  return {
    currentPage,
    lastPage,
    paginatedItems,
    nextPage,
    prevPage,
    setPage
  }
}
