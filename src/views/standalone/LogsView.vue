<script lang="ts" setup>
import {
  NeCombobox,
  type NeComboboxOption,
  NeHeading,
  NeInlineNotification,
  NeTooltip,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import { MessageBag } from '@/lib/validation'

interface LogResponse {
  values: string[]
}

const logLimitComboboxOption: NeComboboxOption[] = [
  {
    id: '100',
    label: '100'
  },
  {
    id: '200',
    label: '200'
  },
  {
    id: '500',
    label: '500'
  },
  {
    id: '1000',
    label: '1000'
  }
]

const { t } = useI18n()

const limit = ref(logLimitComboboxOption[0].id)
const wrapRow = ref(true)
const search = ref('')
const pool = ref(false)
const poolInterval = ref<number>()
const errorBag = ref(new MessageBag())

const logRef = ref<HTMLUListElement | null>(null)

const data = ref<Array<string>>()
const error = ref<Error>()
const loading = ref(false)

const logRowStyle = computed(() => {
  return wrapRow.value ? 'break-all' : 'whitespace-nowrap'
})

watch(data, () => {
  setTimeout(() => {
    if (logRef.value != null) {
      logRef.value.scrollTop = logRef.value.scrollHeight
    }
  }, 50)
})

watch([limit, search], () => {
  fetchData()
})

watch(pool, () => {
  if (pool.value) {
    fetchData()
    poolInterval.value = setInterval(() => {
      fetchData()
    }, 2500)
  } else {
    clearInterval(poolInterval.value)
  }
})

onMounted(() => {
  fetchData()
})

onUnmounted(() => {
  if (poolInterval.value) {
    clearInterval(poolInterval.value)
  }
})

function fetchData() {
  // reset status
  error.value = undefined
  errorBag.value.clear()
  loading.value = true
  // api call
  ubusCall('ns.log', 'get-log', {
    search: search.value,
    limit: limit.value
  })
    .then((response: AxiosResponse<LogResponse>) => {
      data.value = response.data.values
    })
    .catch((reason: Error) => {
      if (reason instanceof ValidationError) {
        if (reason.errorBag.has('search')) {
          errorBag.value.set('search', t('standalone.logs.search_error'))
        }
        if (reason.errorBag.has('limit')) {
          errorBag.value.set('limit', t('standalone.logs.limit_error'))
        }
      } else {
        // generic error, show in UI
        error.value = reason
      }
    })
    .finally(() => (loading.value = false))
}
</script>

<template>
  <NeHeading tag="h3" class="mb-7">{{ t('standalone.logs.title') }}</NeHeading>
  <div class="space-y-8">
    <div class="grid grid-cols-1 gap-6 sm:max-w-xl sm:grid-cols-2">
      <NeTextInput
        v-model="search"
        :invalid-message="errorBag.getFirstFor('search')"
        :label="t('standalone.logs.search')"
        :placeholder="t('standalone.logs.search_placeholder')"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.logs.search_tooltip') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeCombobox
        v-model="limit"
        :invalid-message="errorBag.getFirstFor('limits')"
        :label="t('standalone.logs.limit_rows')"
        :options="logLimitComboboxOption"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
      />
      <div class="col-span-1 flex gap-8 sm:col-span-2">
        <NeToggle v-model="wrapRow" :label="t('standalone.logs.wrap_row')" />
        <NeToggle v-model="pool" :label="t('standalone.logs.pooling')" />
      </div>
    </div>
    <NeInlineNotification
      v-if="error"
      :description="error.message"
      :title="t(getAxiosErrorMessage(error))"
      kind="error"
    />
    <ul
      ref="logRef"
      class="max-h-[55vh] max-w-6xl divide-y divide-gray-300 overflow-y-scroll rounded-md border border-gray-300 font-mono text-sm dark:divide-gray-600 dark:border-gray-600"
    >
      <li
        v-for="(entry, index) in data"
        :key="index"
        :class="logRowStyle"
        class="p-2 odd:bg-gray-100 odd:dark:bg-gray-950"
      >
        {{ entry }}
      </li>
    </ul>
  </div>
</template>
