<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeButton, NeRadioSelection, NeSideDrawer, NeTextInput } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { ref, watch } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { MessageBag } from '@/lib/validation'
import type {
  AddressType,
  Direction
} from '@/components/standalone/security/ips/IpsFilterBypass.vue'

const { t } = useI18n()

const { visible = false } = defineProps<{
  visible: boolean
}>()

const emit = defineEmits<{
  close: [void]
  save: [void]
}>()

// FIXME: export the type from the library
type RadioOption = {
  label: string
  id: string
}

watch(
  () => visible,
  (value) => {
    if (value) {
      protocol.value = 'ipv4'
      direction.value = 'src'
      ip.value = ''
      description.value = ''
      validationErrors.value.clear()
    }
  }
)

const protocolOptions: RadioOption[] = [
  { label: 'IPv4', id: 'ipv4' },
  { label: 'IPv6', id: 'ipv6' }
]

const directionOptions: RadioOption[] = [
  { label: t('standalone.ips.source_bypass'), id: 'src' },
  { label: t('standalone.ips.destination_bypass'), id: 'dst' }
]

const protocol = ref<AddressType>('ipv4')
const direction = ref<Direction>('src')
const ip = ref('')
const description = ref('')
const validationErrors = ref(new MessageBag())

const loading = ref(false)
const error = ref<Error>()

function save() {
  loading.value = true
  error.value = undefined
  validationErrors.value.clear()
  ubusCall('ns.snort', 'create-bypass', {
    protocol: protocol.value,
    direction: direction.value,
    ip: ip.value,
    description: description.value
  })
    .then(() => {
      emit('save')
    })
    .catch((reason: Error) => {
      if (reason instanceof ValidationError) {
        validationErrors.value = reason.errorBag
      } else {
        error.value = reason
      }
    })
    .finally(() => {
      loading.value = false
    })
}

function closeHandler() {
  if (!loading.value) {
    emit('close')
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="visible"
    :title="t('standalone.ips.create_bypass')"
    @close="closeHandler"
  >
    <form class="space-y-8" @submit.prevent="save">
      <NeRadioSelection
        v-model="protocol"
        :disabled="loading"
        :label="t('standalone.ips.address_type')"
        :options="protocolOptions"
      />
      <NeTextInput
        v-model="ip"
        :disabled="loading"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('ip'))"
        :label="t('standalone.ips.ip_address')"
      />
      <NeRadioSelection
        v-model="direction"
        :disabled="loading"
        :label="t('standalone.ips.direction')"
        :options="directionOptions"
      />
      <NeTextInput
        v-model="description"
        :disabled="loading"
        :label="t('standalone.ips.description')"
        optional
      />
      <hr />
      <div class="flex flex-wrap justify-end gap-6">
        <NeButton :disabled="loading" kind="tertiary" size="lg" @click="closeHandler">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="loading" :loading="loading" kind="primary" size="lg" type="submit">
          {{ t('standalone.ips.create_bypass') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
