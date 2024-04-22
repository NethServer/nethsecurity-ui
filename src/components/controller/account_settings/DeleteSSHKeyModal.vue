<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeInlineNotification } from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAccountsStore } from '@/stores/controller/accounts'
import { NeExpandable, getAxiosErrorMessage, NeSkeleton } from '@nethesis/vue-components'
import { useUnitsStore, type Unit } from '@/stores/controller/units'
import { watch } from 'vue'
import { useNotificationsStore } from '@/stores/notifications'
import { ubusCallFromController } from '@/lib/standalone/ubus'

const { t } = useI18n()
const accountsStore = useAccountsStore()
const notificationsStore = useNotificationsStore()
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
const isRevoking = ref(false)

const connectedUnits = computed(() => {
  // show only connected units
  return unitsStore.units.filter((unit) => unit.connected)
})

function revokeAndDeleteSshKey() {
  revokeSshKey()
  deleteSshKey()
}

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
      showUnits.value = false
      unitsStore.getUnits()
    }
  }
)

function revokeSshKey() {
  isRevoking.value = true
  const promises = []

  for (const unit of connectedUnits.value) {
    promises.push(revokeSshKeyFromUnit(unit))
  }

  Promise.allSettled(promises).then((results) => {
    isRevoking.value = false
    const failedUnits = results.filter((result) => result.status === 'rejected')

    if (failedUnits.length > 0) {
      setTimeout(() => {
        notificationsStore.createNotification({
          title: t('controller.units.cannot_revoke_ssh_key_from_n_units', failedUnits.length),
          kind: 'error'
        })
      }, 500)
    }
  })
}

async function revokeSshKeyFromUnit(unit: Unit) {
  const pubKey = accountsStore.sshKeys.key_pub

  return ubusCallFromController(
    'ns.controller',
    'remove-ssh-key',
    {
      ssh_key: pubKey
    },
    unit.id,
    { timeout: 5000 }
  )
}
</script>

<template>
  <NeModal
    :visible="visible"
    kind="warning"
    size="lg"
    :title="t('controller.account_settings.remove_key')"
    :primaryLabel="t('controller.account_settings.remove_key')"
    :primaryButtonDisabled="isDeleting || isRevoking"
    :primaryButtonLoading="isDeleting || isRevoking"
    primary-button-kind="danger"
    :close-aria-label="t('common.close')"
    @primaryClick="revokeAndDeleteSshKey"
    @close="close()"
  >
    <NeSkeleton v-if="unitsStore.loadingListUnits" :lines="3" />
    <template v-else>
      <p class="mb-4">
        {{ t('controller.account_settings.remove_key_description') }}
      </p>
      <NeExpandable
        v-if="connectedUnits.length > 0"
        :label="t('controller.account_settings.show_connected_units')"
        :isExpanded="showUnits"
        @setExpanded="(ev: boolean) => (showUnits = ev)"
      >
        <ul>
          <li class="list-inside list-disc" v-for="unit in connectedUnits" :key="unit.id">
            {{ unit.info.unit_name ? `${unit.info.unit_name} (${unit.id})` : unit.id }}
          </li>
        </ul>
      </NeExpandable>
    </template>
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
