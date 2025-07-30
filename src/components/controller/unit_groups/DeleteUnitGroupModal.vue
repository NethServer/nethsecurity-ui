<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeInlineNotification, getAxiosErrorMessage } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { useUnitGroupsStore, type UnitGroup } from '@/stores/controller/unit_groups'

const props = defineProps<{
  visible: boolean
  itemToDelete?: UnitGroup
}>()

const emit = defineEmits(['group-deleted'])
const unitGroupsStore = useUnitGroupsStore()

const { t } = useI18n()

const error = ref<Error>()
const isDeleting = ref(false)

async function deleteUnitGroup() {
  if (props.itemToDelete) {
    error.value = undefined
    isDeleting.value = true
    try {
      await unitGroupsStore.deleteUnitGroup(props.itemToDelete.id)
      emit('group-deleted')
    } catch (err: unknown) {
      if (err instanceof Error) {
        error.value = err
      } else {
        throw err
      }
    } finally {
      isDeleting.value = false
    }
  }
}

function close() {
  error.value = undefined
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('controller.unit_groups.delete')"
    :primary-label="t('common.delete')"
    :primary-button-disabled="isDeleting"
    :primary-button-loading="isDeleting"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @primary-click="deleteUnitGroup()"
    @close="close()"
  >
    {{
      t('controller.unit_groups.delete_confirm', {
        name: itemToDelete?.name ?? ''
      })
    }}
    <NeInlineNotification
      v-if="error"
      kind="error"
      :title="t('controller.unit_groups.cannot_delete_unit_group')"
      :description="t(getAxiosErrorMessage(error))"
      class="my-2"
    >
      <template #details>
        {{ error.toString() }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
