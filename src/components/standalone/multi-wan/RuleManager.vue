<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import NeTable from '@/components/standalone/NeTable.vue'
import { ref, watch } from 'vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCirclePlus, faGripVertical } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import {
  NeDropdown,
  NeInlineNotification,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import type { Rule } from '@/composables/useMwan'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'
import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import ObjectTooltip from '@/components/standalone/users_objects/ObjectTooltip.vue'

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
  create: any
  edit: [rule: Rule]
  delete: [rule: Rule]
}>()

interface Props {
  rules: Array<Rule>
  policiesExist: boolean
  loading: boolean
}

const props = withDefaults(defineProps<Props>(), {
  loading: false
})

const data = ref<Array<Rule>>([])
const error = ref<Error>()

const ruleDragged = ref<number>()
const indexOver = ref<number>()

watch(
  () => props.rules,
  () => {
    data.value = props.rules
  }
)

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
  ubusCall('ns.mwan', 'order_rules', {
    rules: data.value.map((rule) => rule.name)
  })
    .then(() => uciPendingChangesStore.getChanges())
    .catch((exception: AxiosError) => (error.value = new Error(getAxiosErrorMessage(exception))))
}
</script>

<template>
  <NeInlineNotification v-if="error" :kind="'error'" class="mb-4">
    {{ error.message }}
  </NeInlineNotification>
  <HorizontalCard class="space-y-4 text-center" v-else-if="!loading && rules.length < 1">
    <p>{{ t('standalone.multi_wan.no_rule_found') }}</p>
    <NeButton v-if="policiesExist" :kind="'primary'" @click="$emit('create')">
      <template #prefix>
        <FontAwesomeIcon :icon="faCirclePlus" />
      </template>
      {{ t('standalone.multi_wan.create_default_policy') }}
    </NeButton>
    <p v-else>{{ t('standalone.multi_wan.create_policy_before') }}</p>
  </HorizontalCard>
  <NeTable
    v-else
    :data="rules"
    :headers="headers"
    :loading="loading"
    :style="'card'"
    class="!border-spacing-y-1"
  >
    <template #tbody>
      <tbody>
        <template v-if="loading">
          <tr>
            <td :colspan="headers.length">
              <NeSkeleton :lines="3" />
            </td>
          </tr>
        </template>
        <template v-else>
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
                {{ item.label ?? item.name }}
              </td>
              <td>
                {{ item.policy.label ?? item.policy.name }}
              </td>
              <td v-if="item.ns_src">
                <ObjectTooltip :object-id="item.ns_src" />
              </td>
              <td v-else>
                {{ item.source_address ?? t('standalone.multi_wan.any') }}
              </td>
              <td v-if="item.ns_dst">
                <ObjectTooltip :object-id="item.ns_dst" />
              </td>
              <td v-else>
                {{ item.destination_address ?? t('standalone.multi_wan.any') }}
              </td>
              <td>
                {{
                  item.protocol
                    ? t(`standalone.multi_wan.protocol_${item.protocol}`)
                    : t('standalone.multi_wan.all')
                }}
              </td>
              <td>
                <div class="flex justify-start gap-2">
                  <NeButton kind="tertiary" @click="$emit('edit', item)">
                    <template #prefix>
                      <FontAwesomeIcon :icon="['fas', 'edit']" />
                    </template>
                    {{ t('Edit') }}
                  </NeButton>
                  <NeDropdown
                    :items="[
                      {
                        id: 'delete',
                        action: () => $emit('delete', item),
                        label: t('common.delete'),
                        disabled: item.name == 'ns_default_rule',
                        danger: true
                      }
                    ]"
                    align-to-right
                  />
                </div>
              </td>
            </tr>
          </template>
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
