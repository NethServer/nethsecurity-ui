<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import {
  MessageBag,
  validateHostname,
  validateIpAddress,
  validateMacAddress,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import { onMounted } from 'vue'
import { watchEffect } from 'vue'
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ValidationError, ubusCall } from '@/lib/standalone/ubus'
import type { StaticLease } from './StaticLeases.vue'
import type { DynamicLease } from './DynamicLeases.vue'
import type { ScanResult } from './ScanNetwork.vue'

const props = defineProps<{
  isShown: boolean
  itemToEdit?: StaticLease
  importDynamicLease?: DynamicLease
  importScanResult?: ScanResult
}>()

const { t } = useI18n()

const emit = defineEmits(['close', 'add-edit-lease'])

const isSavingChanges = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

// Form fields
const id = ref('')
const hostname = ref('')
const ipAddress = ref('')
const macAddress = ref('')
const reservationName = ref('')

function resetForm() {
  if (props.importDynamicLease) {
    id.value = ''
    hostname.value = props.importDynamicLease.hostname
    ipAddress.value = props.importDynamicLease.ipaddr
    macAddress.value = props.importDynamicLease.macaddr
    reservationName.value = ''
  } else if (props.importScanResult) {
    id.value = ''
    hostname.value = props.importScanResult.hostname || ''
    ipAddress.value = props.importScanResult.ip
    macAddress.value = props.importScanResult.mac
    reservationName.value = ''
  } else {
    id.value = props.itemToEdit?.lease ?? ''
    hostname.value = props.itemToEdit?.hostname ?? ''
    ipAddress.value = props.itemToEdit?.ipaddr ?? ''
    macAddress.value = props.itemToEdit?.macaddr ?? ''
    reservationName.value = props.itemToEdit?.description ?? ''
  }
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      validationErrorBag.value.set(label, [validator.errMessage as string])
    }
  }

  return validators.every((validator) => validator.valid)
}

function validate() {
  validationErrorBag.value.clear()

  const validators: [validationOutput[], string][] = [
    [[validateRequired(hostname.value), validateHostname(hostname.value)], 'hostname'],
    [[validateRequired(ipAddress.value), validateIpAddress(ipAddress.value)], 'ipaddr'],
    [[validateRequired(macAddress.value), validateMacAddress(macAddress.value)], 'mac']
  ]

  return validators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)
}

async function createOrEditStaticLease() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  const isEditing = id.value != ''

  try {
    isSavingChanges.value = true
    const requestType = isEditing ? 'edit-static-lease' : 'add-static-lease'

    if (validate()) {
      let payload: {
        lease?: string
        hostname: string
        ipaddr: string
        description: string
        macaddr: string
      } = {
        hostname: hostname.value,
        ipaddr: ipAddress.value,
        description: reservationName.value,
        // ensure MAC address uses colons instead of dashes
        macaddr: macAddress.value.replace(/-/g, ':')
      }

      if (isEditing) {
        payload.lease = id.value
      }

      await ubusCall('ns.dhcp', requestType, payload)
      emit('add-edit-lease')
      close()
    }
  } catch (err: any) {
    if (err instanceof ValidationError) {
      validationErrorBag.value = err.errorBag
    } else {
      error.value.notificationTitle = isEditing
        ? t('error.cannot_edit_reservation')
        : t('error.cannot_create_reservation')

      error.value.notificationDescription =
        err.response.data.message == 'lease_not_found'
          ? t('standalone.dns_dhcp.lease_not_found')
          : t(getAxiosErrorMessage(err))

      error.value.notificationDetails = err.toString()
    }
  } finally {
    isSavingChanges.value = false
  }
}

function close() {
  validationErrorBag.value.clear()
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  resetForm()
  emit('close')
}

watchEffect(() => {
  resetForm()
})

onMounted(() => {
  resetForm()
})

function getReservationLocation() {
  const networkTitle = t('standalone.network.title')
  const dnsDhcpTitle = t('standalone.dns_dhcp.title')
  const staticLeasesTitle = t('standalone.dns_dhcp.tabs.static_leases')
  return `${networkTitle} > ${dnsDhcpTitle} > ${staticLeasesTitle}`
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="
      id ? t('standalone.dns_dhcp.edit_reservation') : t('standalone.dns_dhcp.add_reservation')
    "
  >
    <!-- info notification if we are adding a static lease from dynamic leases or scan network pages -->
    <NeInlineNotification
      v-if="importDynamicLease || importScanResult"
      kind="info"
      :closeAriaLabel="t('common.close')"
      class="mb-6"
    >
      <template #description>
        <div>
          {{ t('standalone.dns_dhcp.reservation_location_info_description') }}
        </div>
        <div class="font-semibold">
          {{ getReservationLocation() }}
        </div>
      </template>
    </NeInlineNotification>
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <div class="flex flex-col gap-y-6">
      <NeTextInput
        v-model="hostname"
        :label="t('standalone.dns_dhcp.hostname')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('hostname'))"
      />
      <NeTextInput
        v-model="ipAddress"
        :label="t('standalone.dns_dhcp.ip_address')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('ipaddr'))"
      />
      <NeTextInput
        v-model="macAddress"
        :label="t('standalone.dns_dhcp.mac_address')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('mac'))"
      />
      <NeTextInput
        v-model="reservationName"
        :label="t('standalone.dns_dhcp.reservation_name')"
        :optional="true"
        :optional-label="t('common.optional')"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="createOrEditStaticLease()"
          :disabled="isSavingChanges"
          :loading="isSavingChanges"
          >{{ t('common.save') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
</template>
