<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeButton,
  NeSideDrawer,
  NeTextInput,
  focusElement
} from '@nethesis/vue-components'
import { ref, watch } from 'vue'
import { ValidationError } from '@/lib/standalone/ubus'
import { MessageBag, validateIpOrCidr, validateRequired } from '@/lib/validation'
import { useThreatShieldStore } from '@/stores/standalone/threatShield'

const props = defineProps<{
  isShown: boolean
}>()

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const tsStore = useThreatShieldStore()
const bypass = ref('')
const bypassRef = ref()
const errorBag = ref(new MessageBag())

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

function validate() {
  clearErrors()
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
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }

  try {
    await tsStore.addDnsBypass(bypass.value)
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)

    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    }
  }
}

function clearErrors() {
  errorBag.value.clear()
  tsStore.errorAddDnsBypass = ''
  tsStore.errorAddDnsBypassDetails = ''
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
          :disabled="tsStore.loadingAddDnsBypass"
          ref="bypassRef"
        />
        <!-- dns-add-bypass error notification -->
        <NeInlineNotification
          v-if="tsStore.errorAddDnsBypass"
          kind="error"
          :title="t('error.cannot_create_bypass')"
          :description="tsStore.errorAddDnsBypass"
        >
          <template #details v-if="tsStore.errorAddDnsBypassDetails">
            {{ tsStore.errorAddDnsBypassDetails }}
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
          :disabled="tsStore.loadingAddDnsBypass"
          class="mr-3"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="saveBypass"
          :disabled="tsStore.loadingAddDnsBypass"
          :loading="tsStore.loadingAddDnsBypass"
        >
          {{ t('standalone.threat_shield_dns.add_bypass') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
