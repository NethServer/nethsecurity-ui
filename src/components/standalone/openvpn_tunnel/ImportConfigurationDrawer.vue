<script setup lang="ts">
import { NeSideDrawer, NeButton } from '@nethserver/vue-tailwind-lib'
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps<{
  isShown: boolean
}>()

const { t } = useI18n()
const error = ref('')
const isImporting = ref(false)

const emit = defineEmits(['close', 'tunnel-imported'])

function close() {
  error.value = ''
  emit('close')
}

function importConfiguration() {}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="t('standalone.openvpn_tunnel.import_configuration')"
  >
    <div class="flex flex-col gap-y-6">
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="importConfiguration()"
          :disabled="isImporting"
          :loading="isImporting"
          >{{ t('standalone.openvpn_tunnel.import') }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
