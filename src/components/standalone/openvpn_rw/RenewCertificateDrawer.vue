<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  MessageBag,
  validatePositiveInteger,
  validateRequired,
  type validationOutput
} from '@/lib/validation'
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethesis/vue-components'
import type { RWAccount } from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { ubusCall } from '@/lib/standalone/ubus'

const props = defineProps<{
  isShown: boolean
  account?: RWAccount
  instanceName: string
}>()

const emit = defineEmits(['close', 'renew-certificate'])

const { t } = useI18n()

const showConfirmModal = ref(false)
const isRenewingCertificate = ref(false)
const modalError = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const validationErrorBag = ref(new MessageBag())

const username = ref('')
const certificateExpiration = ref('')

async function resetForm() {
  username.value = props.account?.name ?? ''
  certificateExpiration.value = ''
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
  return runValidators(
    [
      validateRequired(certificateExpiration.value),
      validatePositiveInteger(certificateExpiration.value)
    ],
    'expiration'
  )
}

async function renewUserCertificate() {
  isRenewingCertificate.value = true
  try {
    await ubusCall('ns.ovpnrw', 'regenerate-user-certificate', {
      instance: props.instanceName,
      username: username.value,
      expiration: certificateExpiration.value
    })
    isRenewingCertificate.value = false
    emit('renew-certificate')
    closeConfirmModal()
  } catch (err: any) {
    modalError.value.notificationDescription = t(getAxiosErrorMessage(err))
    modalError.value.notificationDetails = err.toString()
    isRenewingCertificate.value = false
  }
}

function closeDrawer() {
  emit('close')
}

function closeConfirmModal() {
  if (!isRenewingCertificate.value) {
    modalError.value.notificationDescription = ''
    modalError.value.notificationDetails = ''
    showConfirmModal.value = false
  }
}

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      resetForm()
    }
  }
)
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="closeDrawer()"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    :title="t('standalone.openvpn_rw.renew_certificate')"
  >
    <div class="flex flex-col gap-y-6">
      <NeTextInput
        v-model="username"
        :disabled="true"
        :label="t('standalone.openvpn_rw.username')"
      />
      <NeTextInput
        v-model="certificateExpiration"
        type="number"
        :label="t('standalone.openvpn_rw.certificate_expiration_days')"
        :invalid-message="t(validationErrorBag.getFirstI18nKeyFor('expiration'))"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="closeDrawer()">{{
          t('common.cancel')
        }}</NeButton>
        <NeButton
          kind="primary"
          @click="
            () => {
              if (validate()) {
                showConfirmModal = true
                closeDrawer()
              }
            }
          "
          >{{ t('standalone.openvpn_rw.renew_certificate') }}</NeButton
        >
      </div>
    </div></NeSideDrawer
  >
  <NeModal
    :visible="showConfirmModal"
    kind="warning"
    :title="t('standalone.openvpn_rw.renew_certificate')"
    :primaryLabel="t('standalone.openvpn_rw.renew')"
    :primaryButtonDisabled="isRenewingCertificate"
    :primaryButtonLoading="isRenewingCertificate"
    :close-aria-label="t('common.close')"
    @primaryClick="renewUserCertificate()"
    @close="closeConfirmModal()"
  >
    {{ t('standalone.openvpn_rw.renew_certificate_confirm_message', { username: username }) }}
    <NeInlineNotification
      v-if="modalError.notificationDescription"
      kind="error"
      :title="t('error.cannot_renew_certificate')"
      :description="modalError.notificationDescription"
      class="my-2"
      ><template #details v-if="modalError.notificationDetails">
        {{ modalError.notificationDetails }}
      </template></NeInlineNotification
    >
  </NeModal>
</template>
