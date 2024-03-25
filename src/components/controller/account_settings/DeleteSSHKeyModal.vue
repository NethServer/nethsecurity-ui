<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeInlineNotification } from '@nethesis/vue-components'
import { NeModal } from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccountsStore } from '@/stores/controller/accounts'
import { NeExpandable, getAxiosErrorMessage, NeSkeleton } from '@nethesis/vue-components'
import { useUnitsStore } from '@/stores/controller/units'
import { watch } from 'vue'

const { t } = useI18n()
const accountsStore = useAccountsStore()
const showUnits = ref(false)
const unitsStore = useUnitsStore()

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['close', 'key-deleted'])

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const isDeleting = ref(false)

async function deleteSshKey() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  isDeleting.value = true
  try {
    await accountsStore.deleteSshKeys()
    emit('key-deleted')
    close()
  } catch (err: any) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isDeleting.value = false
  }
}

function close() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  emit('close')
}

watch(
  () => props.visible,
  async () => {
    if (props.visible) {
      await unitsStore.getUnits()
    }
  }
)
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    :title="t('controller.account_settings.remove_key')"
    :primaryLabel="t('controller.account_settings.remove_key')"
    :primaryButtonDisabled="isDeleting"
    :primaryButtonLoading="isDeleting"
    primary-button-kind="danger"
    @primaryClick="deleteSshKey()"
    @close="close()"
  >
    <NeSkeleton v-if="unitsStore.loadingListUnits" :lines="5" />
    <template v-else
      ><p class="mb-2">{{ t('controller.account_settings.remove_key_description') }}</p>
      <NeExpandable
        :label="t('controller.account_settings.view_unit_list')"
        :isExpanded="showUnits"
        @setExpanded="(ev: boolean) => (showUnits = ev)"
      >
        <ul>
          <li class="list-inside list-disc" v-for="unit in unitsStore.units" :key="unit.id">
            {{ unit.id }}
          </li>
        </ul>
      </NeExpandable></template
    >
    <NeInlineNotification
      v-if="unitsStore.errorListUnits || error.notificationDescription"
      kind="error"
      :title="t('error.cannot_delete_ssh_key')"
      :description="
        unitsStore.errorListUnits ? unitsStore.errorListUnits : error.notificationDescription
      "
      class="my-2"
    >
      <template v-if="unitsStore.errorListUnitsDetails || error.notificationDetails" #details>
        {{
          unitsStore.errorListUnitsDetails
            ? unitsStore.errorListUnitsDetails
            : error.notificationDetails
        }}
      </template>
    </NeInlineNotification>
  </NeModal>
</template>
