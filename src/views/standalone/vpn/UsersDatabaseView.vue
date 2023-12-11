<script setup lang="ts">
import { NeTitle } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'

const { t } = useI18n()
</script>

<template>
  <NeTitle>{{ t('standalone.users_database.title') }}</NeTitle>
</template>
