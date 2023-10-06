import type { Tab } from 'node_modules/@nethserver/vue-tailwind-lib/dist/components/NeTabs.vue'
import { onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

/**
 * Composable which handles the state associated to a page's tabs, binding them to
 * the router's `tab` query string.
 * @param {Tab[]} tabsList - A list containing all the tabs.
 * @param {string} [initialTabName] - If present, `selectedTab` will be set to
 * the specified value when the component is mounted. If absent, the first value in `tabsList` will be
 * used instead.
 */
export function useTabs(tabsList: Tab[], initialTabName?: string) {
  const route = useRoute()
  const router = useRouter()

  const tabs = ref(tabsList)
  const selectedTab = ref('')

  onMounted(() => {
    selectedTab.value = (route.query.tab as string) ?? initialTabName ?? tabs.value[0].name
  })

  watch(selectedTab, () => {
    router.push({ path: route.path, query: { tab: selectedTab.value } })
  })

  return { tabs, selectedTab }
}
