<script lang="ts" setup>
import {
  getAxiosErrorMessage,
  NeButton,
  NeFileInput,
  NeInlineNotification,
  NeSideDrawer
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, watchEffect } from 'vue'
import { MessageBag } from '@/lib/validation.ts'
import * as v from 'valibot'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'

const { t } = useI18n()

const { isShown } = defineProps<{
  isShown: boolean
}>()

const emit = defineEmits(['success', 'close'])

const configFile = ref<File>()
const loading = ref(false)
const error = ref<Error>()
const validationErrors = ref(new MessageBag())

function validate(): boolean {
  validationErrors.value.clear()

  const validator = v.object({
    config: v.file('error.required')
  })
  type validatorSchema = typeof validator

  const result = v.safeParse(validator, {
    config: configFile.value
  })
  if (!result.success) {
    const flatted = v.flatten<validatorSchema>(result.issues).nested
    for (const key in flatted) {
      validationErrors.value.set(key, flatted[key as v.IssueDotPath<validatorSchema>]![0])
    }
  }

  return validationErrors.value.size == 0
}

async function importConfiguration(): Promise<unknown> {
  if (!validate()) {
    return
  }
  loading.value = true
  error.value = undefined
  const config = await configFile.value!.text()
  return ubusCall('ns.wireguard', 'import-configuration', {
    config: btoa(config)
  })
    .then(() => emit('success'))
    .catch((err) => {
      if (err instanceof ValidationError) {
        validationErrors.value = err.errorBag
      } else {
        error.value = err
      }
    })
    .finally(() => (loading.value = false))
}

watchEffect(() => {
  if (isShown) {
    configFile.value = undefined
    validationErrors.value.clear()
    error.value = undefined
  }
})
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    :title="t('standalone.wireguard_peers.import_peer_tunnel')"
    @close="emit('close')"
  >
    <div class="space-y-6">
      <NeInlineNotification
        v-if="error != undefined"
        :description="t(getAxiosErrorMessage(error))"
        :title="t('standalone.wireguard_peers.error_importing_peer_tunnel_description')"
        kind="error"
      />
      <NeFileInput
        v-model="configFile"
        :disabled="loading"
        :dropzone-label="t('ne_file_input.dropzone_label')"
        :label="t('standalone.wireguard_peers.wireguard_config_file')"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('config'))"
      />
      <hr />
      <div class="flex justify-end">
        <NeButton class="mr-4" kind="tertiary" @click="emit('close')">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          :disabled="loading"
          :loading="loading"
          kind="primary"
          @click="importConfiguration()"
        >
          {{ t('standalone.openvpn_tunnel.import') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
