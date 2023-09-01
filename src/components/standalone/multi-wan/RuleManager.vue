<script lang="ts" setup>
import type { Rule } from '@/composables/useMwanConfig'
import { genericValueComparator, useMwanConfig } from '@/composables/useMwanConfig'
import NeTable from '@/components/standalone/NeTable.vue'
import { reactive, ref, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faGripVertical } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import type { AxiosError } from 'axios'
import { getAxiosErrorMessage, NeButton, NeInlineNotification } from '@nethserver/vue-tailwind-lib'

const { t } = useI18n()

const uciPendingChangesStore = useUciPendingChangesStore()

const headers = [
  {
    key: 'vertical-grip'
  },
  {
    label: 'Name',
    key: 'name'
  },
  {
    label: 'Policy',
    key: 'policy.name'
  },
  {
    label: 'Source',
    key: 'source'
  },
  {
    label: 'Destination',
    key: 'destination'
  },
  {
    label: 'Protocol',
    key: 'protocol'
  },
  {
    label: 'Actions',
    key: 'actions'
  }
]

defineEmits<{
  editRule: [rule: Rule]
}>()

const mwanConfig = reactive(useMwanConfig())
const data = ref<Array<Rule>>([])
const error = ref<Error>()

const ruleDragged = ref<number>()
const indexOver = ref<number>()

watch(mwanConfig, () => {
  data.value = mwanConfig.rules
})

function drop(index: number): void {
  indexOver.value = undefined
  if (ruleDragged.value != undefined && ruleDragged.value != index) {
    if (ruleDragged.value - index < 0) {
      data.value.splice(index - 1, 0, ...data.value.splice(ruleDragged.value, 1))
    } else {
      data.value.splice(index, 0, ...data.value.splice(ruleDragged.value, 1))
    }
    saveState()
  }
}

function saveState(): void {
  const sorted = Object.values(mwanConfig.data?.values ?? [])
    .filter((value) => value['.type'] != 'rule')
    .sort(genericValueComparator)
    .map((value) => value['.name'])
  data.value.forEach((value) => sorted.push(value['name']))
  ubusCall('uci', 'order', {
    config: 'mwan3',
    sections: sorted
  })
    .then(() => uciPendingChangesStore.getChanges())
    .catch((exception: AxiosError) => (error.value = new Error(getAxiosErrorMessage(exception))))
}
</script>

<template>
  <NeInlineNotification v-if="error" :kind="'error'" class="mb-4">
    {{ error.message }}
  </NeInlineNotification>
  <NeTable
    v-else
    :data="data"
    :headers="headers"
    :loading="mwanConfig.loading"
    :style="'card'"
    class="!border-spacing-y-1"
  >
    <template #tbody>
      <tbody>
        <template v-for="(item, index) in data" :key="item.key">
          <tr
            :class="[
              indexOver == index ? 'drop-over drop-target' : '',
              ruleDragged != undefined ? 'drop-active' : ''
            ]"
            class="drop-target"
            @dragenter="indexOver = index"
            @dragleave="indexOver = undefined"
            @drop.prevent="drop(index)"
            @dragover.prevent
          >
            <td :colspan="headers.length"></td>
          </tr>
          <tr
            :class="{ 'opacity-30': ruleDragged == index }"
            draggable="true"
            @dragend="ruleDragged = undefined"
            @dragstart="ruleDragged = index"
          >
            <td class="cursor-move text-center hover:bg-opacity-50 hover:dark:bg-opacity-70">
              <FontAwesomeIcon :icon="faGripVertical" />
            </td>
            <td>
              {{ item.name }}
            </td>
            <td>
              {{ item.policy.name }}
            </td>
            <td>
              {{ item.source }}
            </td>
            <td>
              {{ item.destination }}
            </td>
            <td>
              {{ item.protocol }}
            </td>
            <td>
              <NeButton kind="secondary" @click="$emit('editRule', item)">
                {{ t('Edit') }}
              </NeButton>
            </td>
          </tr>
        </template>
        <tr
          :class="[
            indexOver == data.length ? 'drop-over' : '',
            ruleDragged != undefined ? 'drop-active' : ''
          ]"
          class="drop-target"
          @dragenter="indexOver = data.length"
          @dragleave="indexOver = undefined"
          @drop.prevent="drop(data.length)"
          @dragover.prevent
        >
          <td :colspan="headers.length"></td>
        </tr>
      </tbody>
    </template>
  </NeTable>
</template>

<style scoped>
tr.drop-target > td {
  @apply bg-transparent py-1;
}

tr.drop-over > td {
  @apply bg-primary-900 py-7;
}
</style>
