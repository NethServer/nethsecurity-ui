<script lang="ts" setup>
import { NeModal, NeTextInput } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, useTemplateRef, watch } from 'vue'
import { useSudoStore } from '@/stores/sudo'

const sudoStore = useSudoStore()
const { t } = useI18n()

const password = ref('')
const passwordInput = useTemplateRef<HTMLInputElement>('password-input')
const twoFa = ref('')
const twoFaInput = useTemplateRef<HTMLInputElement>('two-fa-input')

function closeHandler() {
  if (!sudoStore.loading) {
    sudoStore.askingSudo = false
  }
}

watch(
  () => sudoStore.invalidText,
  (value) => {
    if (value != undefined) {
      if (sudoStore.needs2fa) {
        twoFaInput.value?.focus()
      } else {
        passwordInput.value?.focus()
      }
    }
  }
)

watch(
  () => sudoStore.askingSudo,
  (value) => {
    if (value) {
      password.value = ''
      twoFa.value = ''
    }
  }
)

function handlePrimary() {
  if (sudoStore.needs2fa) {
    sudoStore.askTwoFaSudoToken(twoFa.value)
  } else {
    sudoStore.askPasswordSudoToken(password.value)
  }
}
</script>

<template>
  <NeModal
    :cancel-label="t('common.cancel')"
    :close-aria-label="t('common.close')"
    :primary-label="t('common.confirm')"
    :title="t('common.password_confirmation_required')"
    :visible="sudoStore.askingSudo"
    kind="info"
    @close="closeHandler()"
    @primaryClick="handlePrimary()"
  >
    <div class="space-y-4">
      <p>{{ t('common.password_confirmation_required_description') }}</p>
      <NeTextInput
        v-if="sudoStore.needs2fa"
        ref="two-fa-input"
        v-model="twoFa"
        :disabled="sudoStore.loading"
        :invalid-message="sudoStore.invalidText ? t(sudoStore.invalidText) : ''"
      />
      <NeTextInput
        v-else
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
