<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeModal } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import ObjectUsages from './ObjectUsages.vue'

defineProps({
  visible: {
    type: Boolean,
    required: true
  },
  objectName: {
    type: String,
    required: true
  },
  usageIds: {
    type: Array<string>,
    required: true
  },
  showGoToObjectsButton: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.objects.name_usages', { name: objectName })"
    kind="info"
    :primary-label="t('common.close')"
    cancel-label=""
    :close-aria-label="t('common.close')"
    @close="emit('close')"
    @primary-click="emit('close')"
  >
    <ObjectUsages :usage-ids="usageIds" :show-go-to-objects-button="showGoToObjectsButton" />
  </NeModal>
</template>
