import { useRoute, useRouter } from 'vue-router'
import { computed } from 'vue'

const FILTERS = ['client', 'app', 'protocol', 'host']
export type AvailableFilters = 'client' | 'app' | 'protocol' | 'host'

export type Filter = {
  key: AvailableFilters
  value: string
}

export function useTrafficFilter() {
  const route = useRoute()
  const router = useRouter()

  const list = computed<Filter[]>(() => {
    return Object.keys(route.query)
      .filter((key) => FILTERS.includes(key))
      .map((key) => ({ key: key as AvailableFilters, value: route.query[key] as string }))
  })

  const active = computed<boolean>(() => list.value.length > 0)

  function remove(keys: AvailableFilters | AvailableFilters[]) {
    if (!Array.isArray(keys)) {
      keys = [keys]
    }
    const query = { ...route.query }
    keys.forEach((key) => delete query[key])
    router.push({ query })
  }

  function push(filter: Filter) {
    const query = { ...route.query, [filter.key]: filter.value }
    router.push({ query })
  }

  function contains(string: AvailableFilters): boolean {
    return route.query[string] != undefined
  }

  function misses(string: AvailableFilters): boolean {
    return !contains(string)
  }

  function get(key: AvailableFilters): string {
    return route.query[key] as string
  }

  return {
    list,
    active,
    remove,
    push,
    contains,
    get,
    misses
  }
}
