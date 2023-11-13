<script setup lang="ts">
import { onUnmounted, ref } from 'vue'
import { NeProgressBar, NeModal } from '@nethserver/vue-tailwind-lib'
import { useI18n } from 'vue-i18n'
import { watch } from 'vue'

const REBOOT_WAIT_TIME = 45000

const { t } = useI18n()

const props = defineProps<{
  visible: boolean
}>()

const rebootProgress = ref(0)
const rebootIntervalRef = ref<number | undefined>()
const rebootTimeoutRef = ref<number | undefined>()

function setRebootTimer() {
  rebootTimeoutRef.value = setTimeout(() => {
    location.reload()
  }, REBOOT_WAIT_TIME)

  rebootIntervalRef.value = setInterval(() => {
    rebootProgress.value += 0.5
  }, REBOOT_WAIT_TIME / 200)
}

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      setRebootTimer()
    }
  }
)

onUnmounted(() => {
  if (rebootTimeoutRef.value) clearTimeout(rebootTimeoutRef.value)
  if (rebootIntervalRef.value) clearInterval(rebootIntervalRef.value)
})
</script>

<template>
  <NeModal
    :visible="visible"
    :title="t('standalone.update.system_update')"
    :primary-button-disabled="true"
    :primary-button-loading="true"
    :primary-label="t('standalone.update.title')"
    kind="info"
    :cancel-label="''"
  >
    <p>
      {{ t('standalone.update.system_update_in_progress_message') }}
    </p>
    <NeProgressBar class="mt-4" :progress="rebootProgress" />
  </NeModal>
</template>
