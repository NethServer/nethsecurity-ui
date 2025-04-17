<script lang="ts" setup>
import { useSudoStore } from '@/stores/standalone/sudo.ts'
import { NeModal, NeTextInput } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, useTemplateRef, watch } from 'vue'

const sudoStore = useSudoStore()
const { t } = useI18n()

const password = ref('')
const passwordInput = useTemplateRef<HTMLInputElement>('password-input')

function closeHandler() {
  if (!sudoStore.loading) {
    sudoStore.askingSudo = false
  }
}

watch(
  () => sudoStore.invalidText,
  (value) => {
    if (value != undefined) {
      passwordInput.value?.focus()
    }
  }
)

watch(
  () => sudoStore.askingSudo,
  (value) => {
    if (value) {
      password.value = ''
      // need to time out this, the modal has animation and it's not ready yet
      setTimeout(() => {
        passwordInput.value?.focus()
      }, 100)
    }
  }
)
</script>

<template>
  <NeModal
    :cancel-label="t('common.cancel')"
    :close-aria-label="t('common.close')"
    :primary-label="t('common.confirm')"
    :title="t('common.password_confirmation_required')"
    :visible="sudoStore.askingSudo"
    kind="info"
    :primary-button-disabled="sudoStore.loading"
    :primary-button-loading="sudoStore.loading"
    @close="closeHandler()"
    @primary-click="sudoStore.askSudoToken(password)"
  >
    <div class="space-y-4">
      <p>{{ t('common.password_confirmation_required_description') }}</p>
      <NeTextInput
        ref="password-input"
        v-model="password"
        :disabled="sudoStore.loading"
        autocomplete="current-password"
        is-password
        :invalid-message="sudoStore.invalidText ? t(sudoStore.invalidText) : ''"
      />
    </div>
  </NeModal>
</template>
