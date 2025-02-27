<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeModal, NeExpandable } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import ObjectUsages from './ObjectUsages.vue'
import { ref } from 'vue'

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

const isExpandedShowUsages = ref(false)

function closeModal() {
  isExpandedShowUsages.value = false
  emit('close')
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.objects.cannot_delete_object_name', { name: objectName })"
    kind="warning"
    :primary-label="t('common.close')"
    cancel-label=""
    :close-aria-label="t('common.close')"
    @close="closeModal"
    @primary-click="closeModal"
  >
    <div class="space-y-4">
      <div>
        {{ t('standalone.objects.cannot_delete_object_description', { name: objectName }) }}
      </div>
      <NeExpandable
        :label="t('standalone.objects.show_usages')"
        :is-expanded="isExpandedShowUsages"
        @set-expanded="(ev: boolean) => (isExpandedShowUsages = ev)"
      >
        <ObjectUsages :usage-ids="usageIds" :show-go-to-objects-button="showGoToObjectsButton" />
      </NeExpandable>
    </div>
  </NeModal>
</template>
