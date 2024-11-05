<script lang="ts" setup>
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import TwoFactorAuth from '@/components/standalone/account/two_fa/TwoFactorAuth.vue'

const { t } = useI18n()

const loading = ref(true)
</script>

<template>
  <FormLayout>
    <template #title>
      {{ t('standalone.two_fa.title') }}
    </template>
    <template #description>
      {{ t('standalone.two_fa.description') }}
    </template>
    <TwoFactorAuth />
  </FormLayout>
</template>
