<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useUnitsStore } from '@/stores/controller/units'
import {
  NeInlineNotification,
  NeLink,
  NeTooltip,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeModal } from '@nethserver/vue-tailwind-lib'
import { ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { v4 as uuid } from '@lukeed/uuid'

const props = defineProps({
  visible: {
    type: Boolean
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()
const unitsStore = useUnitsStore()
const justCopied = ref(false)
const joinCode = ref('')
const error = ref({
  addUnit: ''
})

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      getJoinCode()
    }
  }
)

async function getJoinCode() {
  // generate a random uuid
  const unitId = uuid()

  try {
    joinCode.value = await unitsStore.addUnit(unitId)
  } catch (err: any) {
    error.value.addUnit = t(getAxiosErrorMessage(err))
  }
}

function copyJoinCode() {
  if (!joinCode.value) {
    return
  }
  navigator.clipboard.writeText(joinCode.value)
  justCopied.value = true

  setTimeout(() => {
    justCopied.value = false
  }, 3000)
}
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('controller.units.add_unit')"
    kind="info"
    :primaryLabel="t('common.close')"
    cancelLabel=""
    :closeAriaLabel="t('common.close')"
    size="lg"
    @close="emit('close')"
    @primaryClick="emit('close')"
  >
    <!-- addUnit error notification -->
    <NeInlineNotification
      v-if="error.addUnit"
      kind="error"
      :title="t('error.cannot_retrieve_join_code')"
      :description="error.addUnit"
      class="mb-4"
    />
    <ol class="list-inside list-decimal space-y-2">
      <li>
        <NeTooltip v-if="justCopied" triggerEvent="mouseenter focus" placement="top-start">
          <template #trigger>
            <NeLink @click="copyJoinCode">
              {{ t('controller.units.add_unit_step_1') }}
            </NeLink>
          </template>
          <template #content>
            {{ t('common.copied') }}
          </template>
        </NeTooltip>
        <NeLink v-else @click="copyJoinCode">
          {{ t('controller.units.add_unit_step_1') }}
        </NeLink>
      </li>
      <li>{{ t('controller.units.add_unit_step_2') }}</li>
      <li>{{ t('controller.units.add_unit_step_3') }}</li>
      <li>{{ t('controller.units.add_unit_step_4') }}</li>
    </ol>
  </NeModal>
</template>
