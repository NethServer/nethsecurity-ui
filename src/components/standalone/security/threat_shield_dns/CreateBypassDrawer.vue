<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  getAxiosErrorMessage,
  NeSideDrawer,
  NeTextInput,
  focusElement
} from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { MessageBag, validateIpOrCidr, validateRequired } from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const props = defineProps<{
  isShown: boolean
}>()

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const bypass = ref('')
const bypassRef = ref()
const errorBag = ref(new MessageBag())

const loading = ref({
  dnsAddBypass: false
})

const error = ref({
  dnsAddBypass: '',
  dnsAddBypassDetails: ''
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()
      focusElement(bypassRef)
      bypass.value = ''
    }
  }
)

function closeDrawer() {
  emit('close')
}

function clearErrors() {
  errorBag.value.clear()
  error.value.dnsAddBypass = ''
  error.value.dnsAddBypassDetails = ''
}

function validate() {
  let isValidationOk = true

  const requiredValidator = validateRequired(bypass.value)
  if (!requiredValidator.valid) {
    errorBag.value.set('address', [requiredValidator.errMessage as string])
    if (isValidationOk) {
      focusElement(bypassRef)
      isValidationOk = false
    }
  } else {
    const ipOrCidrValidator = validateIpOrCidr(bypass.value)
    if (!ipOrCidrValidator.valid) {
      errorBag.value.set('address', [ipOrCidrValidator.errMessage as string])
      if (isValidationOk) {
        focusElement(bypassRef)
        isValidationOk = false
      }
    }
  }
  return isValidationOk
}

async function saveBypass() {
  clearErrors()

  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }
  loading.value.dnsAddBypass = true

  try {
    await ubusCall('ns.threatshield', 'dns-add-bypass', { address: bypass.value })
    uciChangesStore.getChanges()
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)

    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    } else {
      error.value.dnsAddBypass = t(getAxiosErrorMessage(err))
      error.value.dnsAddBypassDetails = err.toString()
    }
  } finally {
    loading.value.dnsAddBypass = false
  }
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="t('standalone.threat_shield_dns.add_bypass')"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form @submit.prevent>
      <div class="space-y-6">
        <NeTextInput
          :label="t('standalone.threat_shield_dns.ip_address_or_network_cidr')"
          v-model.trim="bypass"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('address'))"
          :disabled="loading.dnsAddBypass"
          ref="bypassRef"
        />
        <!-- dns-add-bypass error notification -->
        <NeInlineNotification
          v-if="error.dnsAddBypass"
          kind="error"
          :title="t('error.cannot_create_bypass')"
          :description="error.dnsAddBypass"
        >
          <template #details v-if="error.dnsAddBypassDetails">
            {{ error.dnsAddBypassDetails }}
          </template>
        </NeInlineNotification>
      </div>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton
          kind="tertiary"
          size="lg"
          @click.prevent="closeDrawer"
          :disabled="loading.dnsAddBypass"
          class="mr-3"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="saveBypass"
          :disabled="loading.dnsAddBypass"
          :loading="loading.dnsAddBypass"
        >
          {{ t('standalone.threat_shield_dns.add_bypass') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
