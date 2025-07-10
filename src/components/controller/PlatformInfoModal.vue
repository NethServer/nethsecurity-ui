<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeInlineNotification, NeModal, NeSkeleton } from '@nethesis/vue-components'
import { getControllerApiEndpoint } from '@/lib/config'
import { useLoginStore } from '@/stores/controller/controllerLogin'
import axios from 'axios'

const props = defineProps<{
  visible: boolean
}>()

const emit = defineEmits(['close'])
const platformInfo = ref<Record<string, string | number>>({})
const platformInfoError = ref<string | null>(null)
const isLoading = ref(false)
const loginStore = useLoginStore()

const { t } = useI18n()

function close() {
  emit('close')
}

async function loadPlatformInfo() {
  try {
    isLoading.value = true
    platformInfoError.value = null

    const { data } = await axios.get(`${getControllerApiEndpoint()}/platform`, {
      headers: {
        Authorization: `Bearer ${loginStore.token}`
      }
    })
    platformInfo.value = data.data
  } catch (err: any) {
    platformInfoError.value = err?.message || t('error.generic_error')
  } finally {
    isLoading.value = false
  }
}

// Watch the visible prop and load platform info when it becomes true
watch(
  () => props.visible,
  (isVisible) => {
    if (isVisible) {
      loadPlatformInfo()
    }
  },
  { immediate: true }
)

// Also load on component mount as a fallback
onMounted(() => {
  if (props.visible) {
    loadPlatformInfo()
  }
})
</script>

<template>
  <NeModal
    :visible="visible"
    kind="info"
    :title="t('common.shell.platform_info')"
    :primary-label="t('common.close')"
    :primary-action="close"
    :close-aria-label="t('common.close')"
    @close="close"
    @primary-click="close"
  >
    <div class="d-flex flex-column align-items-center my-3">
      <div v-if="isLoading" class="w-100">
        <NeSkeleton v-if="isLoading" :lines="4" />
      </div>
      <NeInlineNotification
        v-else-if="platformInfoError"
        kind="error"
        :title="t('error.generic_error')"
        :description="platformInfoError"
        class="my-2"
      />
      <div v-else class="w-100">
        <table class="table-sm table">
          <tbody>
            <tr v-for="(value, key) in platformInfo" :key="key">
              <th class="pe-3">{{ t(`common.platform.${key}`, key) }}</th>
              <td>{{ value }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  </NeModal>
</template>
