<script setup>
import { useI18n } from 'vue-i18n'
import { NeTitle } from '@nethserver/vue-tailwind-lib'

const { t } = useI18n()
</script>

<template>
  <NeTitle>{{ t('standalone.ipsec_tunnel.title') }}</NeTitle>
</template>
