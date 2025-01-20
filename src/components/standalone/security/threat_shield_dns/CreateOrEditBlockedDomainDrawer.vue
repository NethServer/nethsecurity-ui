<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  type NeComboboxOption,
  NeButton,
  NeSideDrawer,
  NeTextInput,
  focusElement
} from '@nethesis/vue-components'
import { ref, type PropType, watch } from 'vue'
import { ValidationError } from '@/lib/standalone/ubus'
import { MessageBag, validateDomainName, validateRequired } from '@/lib/validation'
import { useThreatShieldStore, type DnsBlockedDomain } from '@/stores/standalone/threatShield'

const props = defineProps({
  isShown: { type: Boolean, default: false },
  currentDomain: {
    type: Object as PropType<DnsBlockedDomain>
  },
  recordOptions: {
    type: Array as PropType<NeComboboxOption[]>
  }
})

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const tsStore = useThreatShieldStore()
const domain = ref('')
const domainRef = ref()
const description = ref('')
const descriptionRef = ref()
const errorBag = ref(new MessageBag())

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()

      if (props.currentDomain) {
        // editing domain
        domain.value = props.currentDomain.address
        description.value = props.currentDomain?.description || ''
        focusElement(descriptionRef)
      } else {
        // creating domain, reset form to defaults
        domain.value = ''
        description.value = ''
        focusElement(domainRef)
      }
    }
  }
)

function closeDrawer() {
  emit('close')
}

function clearErrors() {
  errorBag.value.clear()
  tsStore.errorSaveDnsBlockedDomain = ''
  tsStore.errorSaveDnsBlockedDomainDetails = ''
}

function validate() {
  clearErrors()
  let isValidationOk = true

  const requiredValidator = validateRequired(domain.value)
  if (!requiredValidator.valid) {
    errorBag.value.set('address', [requiredValidator.errMessage as string])
    if (isValidationOk) {
      focusElement(domainRef)
      isValidationOk = false
    }
  } else {
    const domainValidator = validateDomainName(domain.value)
    if (!domainValidator.valid) {
      errorBag.value.set('address', [domainValidator.errMessage as string])
      if (isValidationOk) {
        focusElement(domainRef)
        isValidationOk = false
      }
    }
  }
  return isValidationOk
}

async function saveBlockedDomain() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }

  const payload: any = {
    address: domain.value
  }

  if (description.value) {
    payload.description = description.value
  }

  const isEditing = props.currentDomain ? true : false

  try {
    await tsStore.saveDnsBlockedDomain(payload, isEditing)
    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)

    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    }
  }
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="
      currentDomain
        ? t('standalone.threat_shield_dns.edit_domain')
        : t('standalone.threat_shield_dns.add_domain')
    "
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form @submit.prevent>
      <div class="space-y-6">
        <!-- domain -->
        <NeTextInput
          :label="t('standalone.threat_shield_dns.domain')"
          v-model.trim="domain"
          :invalidMessage="t(errorBag.getFirstI18nKeyFor('address'))"
          :disabled="tsStore.loadingSaveDnsBlockedDomain || !!currentDomain"
          ref="domainRef"
        />
        <!-- description -->
        <NeTextInput
          :label="t('standalone.threat_shield_dns.description')"
          v-model.trim="description"
          :disabled="tsStore.loadingSaveDnsBlockedDomain"
          optional
          :optionalLabel="t('common.optional')"
          ref="descriptionRef"
        />
        <!-- save error -->
        <NeInlineNotification
          v-if="tsStore.errorSaveDnsBlockedDomain"
          kind="error"
          :title="t('error.cannot_save_blocked_domain')"
          :description="tsStore.errorSaveDnsBlockedDomain"
        >
          <template #details v-if="tsStore.errorSaveDnsBlockedDomainDetails">
            {{ tsStore.errorSaveDnsBlockedDomainDetails }}
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
          :disabled="tsStore.loadingSaveDnsBlockedDomain"
          class="mr-3"
        >
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="saveBlockedDomain"
          :disabled="tsStore.loadingSaveDnsBlockedDomain"
          :loading="tsStore.loadingSaveDnsBlockedDomain"
        >
          {{
            currentDomain
              ? t('standalone.threat_shield_dns.save_domain')
              : t('standalone.threat_shield_dns.add_domain')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
