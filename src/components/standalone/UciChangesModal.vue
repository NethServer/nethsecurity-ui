<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { NeExpandable, NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { ref, watch, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

let loading = ref({
  isApplyingChanges: false,
  isRevertingChanges: false
})

let error = ref({
  notificationTitle: '',
  notificationDescription: ''
})

let expandedChanges: Ref<any> = ref({})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      // clear errors
      error.value.notificationTitle = ''
      error.value.notificationDescription = ''
    }
  }
)

watch(
  () => uciChangesStore.changes,
  () => {
    // initialize expanded state of NeExpandables
    expandedChanges.value = {}

    for (const config of Object.keys(uciChangesStore.changes)) {
      expandedChanges.value[config] = false
    }
  }
)

function onClose() {
  emit('close')
}

function setExpanded(config: string, isExpanded: boolean) {
  expandedChanges.value[config] = isExpanded
}

function getChangeTemplate(config: string, change: any) {
  const templateName = `${change[0]}-${change.length}`

  switch (templateName) {
    case 'add-3':
      return `uci add ${config} ${change[2]}='${change[1]}'`
    case 'set-3':
      return `uci set ${config}.${change[1]}='${change[2]}'`
    case 'set-4':
      return `uci set ${config}.${change[1]}.${change[2]}='${change[3]}'`
    case 'remove-2':
      return `uci del ${config}.${change[1]}`
    case 'remove-3':
      return `uci del ${config}.${change[1]}.${change[2]}`
    case 'order-3':
      return `uci reorder ${config}.${change[1]}='${change[2]}'`
    case 'list-add-4':
      return `uci add_list ${config}.${change[1]}.${change[2]}='${change[3]}'`
    case 'list-del-4':
      return `uci del_list ${config}.${change[1]}.${change[2]}='${change[3]}'`
    case 'rename-3':
      return `uci rename ${config}.${change[1]}='${change[2]}'`
    case 'rename-4':
      return `uci rename ${config}.${change[1]}.${change[2]}='${change[3]}'`
  }
}

function getChangeIcon(change: any) {
  switch (change[0]) {
    case 'add':
    case 'set':
    case 'reorder':
    case 'list-add':
    case 'rename':
      return 'circle-plus'
    default:
      return 'circle-minus'
  }
}

function getChangeColor(change: any) {
  switch (change[0]) {
    case 'add':
    case 'set':
    case 'reorder':
    case 'list-add':
    case 'rename':
      return 'text-green-700 dark:text-green-500'
    default:
      return 'text-rose-700 dark:text-rose-500'
  }
}

async function applyChanges() {
  loading.value.isApplyingChanges = true

  try {
    await uciChangesStore.commitChanges()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_apply_configuration_changes')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.isApplyingChanges = false
    await uciChangesStore.getChanges()
  }
}

async function revertChanges() {
  loading.value.isRevertingChanges = true

  try {
    await uciChangesStore.revertChanges()
  } catch (err: any) {
    console.error(err)
    error.value.notificationTitle = t('error.cannot_revert_configuration_changes')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    loading.value.isRevertingChanges = false
    await uciChangesStore.getChanges()
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    size="lg"
    :title="t('standalone.uci_changes.configuration_changes')"
    :primaryLabel="t('standalone.uci_changes.apply')"
    :secondaryLabel="t('standalone.uci_changes.revert')"
    :cancelLabel="t('common.close')"
    :primaryButtonDisabled="loading.isApplyingChanges || loading.isRevertingChanges"
    :primaryButtonLoading="loading.isApplyingChanges"
    secondaryButtonKind="danger"
    :secondaryButtonDisabled="loading.isApplyingChanges || loading.isRevertingChanges"
    :secondaryButtonLoading="loading.isRevertingChanges"
    :closeAriaLabel="t('common.close')"
    @close="onClose"
    @primaryClick="applyChanges"
    @secondaryClick="revertChanges"
  >
    <div class="space-y-2">
      <NeExpandable
        v-for="config in Object.keys(uciChangesStore.changes)"
        :key="config"
        :label="`/etc/config/${config} (${uciChangesStore.changes[config].length})`"
        :isExpanded="expandedChanges[config]"
        @setExpanded="(ev: boolean) => setExpanded(config, ev)"
        fullWidth
      >
        <div class="-mt-4">
          <div
            v-for="(change, index) of uciChangesStore.changes[config]"
            :key="index"
            class="flex items-center border-b border-gray-300 px-2 py-1.5 dark:border-gray-500"
          >
            <font-awesome-icon
              :icon="['fas', getChangeIcon(change)]"
              :class="`mr-2 h-5 w-5 ${getChangeColor(change)}`"
              aria-hidden="true"
            />
            <div class="break-all">{{ getChangeTemplate(config, change) }}</div>
          </div>
        </div>
      </NeExpandable>
      <NeInlineNotification
        v-if="error.notificationTitle"
        kind="error"
        :title="error.notificationTitle"
        :description="error.notificationDescription"
      />
    </div>
  </NeModal>
</template>
