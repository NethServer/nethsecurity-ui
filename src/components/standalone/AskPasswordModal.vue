<script lang="ts" setup>
import { NeModal, NeTextInput } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, useTemplateRef, watchEffect } from 'vue'

const { visible, invalidMessage } = defineProps<{
  visible: boolean
  loading: boolean
  invalidMessage?: string
}>()

defineEmits<{
  confirm: [password: string]
  close: []
}>()

const { t } = useI18n()

const password = ref('')
const passwordInput = useTemplateRef<HTMLInputElement>('password-input')

watchEffect(() => {
  if (visible) {
    password.value = ''
  }
  if (invalidMessage) {
    passwordInput.value?.focus()
  }
})
</script>

<template>
  <NeModal
    :cancel-label="t('common.cancel')"
    :close-aria-label="t('common.close')"
    :primary-label="t('common.confirm')"
    :title="t('common.password_confirmation_required')"
    :visible="visible"
    kind="info"
    @close="$emit('close')"
    @primary-click="$emit('confirm', password)"
  >
    <div class="space-y-4">
      <p>{{ t('common.password_confirmation_required_description') }}</p>
      <NeTextInput
        ref="password-input"
        v-model="password"
        :invalid-message="invalidMessage"
        autocomplete="current-password"
        is-password
      />
    </div>
  </NeModal>
</template>
