<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { NeButton, NeSideDrawer, NeTextInput } from '@nethesis/vue-components'
import { ref, watchEffect } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageBag } from '@/lib/validation'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import type { Rule } from '@/components/standalone/security/ips/IpsDisabledRules.vue'

const { visible = false, rule } = defineProps<{
  visible: boolean
  rule?: Rule
}>()

const emit = defineEmits(['close', 'save'])

const { t } = useI18n()

const _gid = ref('')
const _sid = ref('')
const _description = ref('')
const validationErrors = ref(new MessageBag())
const loading = ref(false)
const error = ref<Error>()

function closeHandler() {
  if (!loading.value) {
    emit('close')
  }
}

function save() {
  loading.value = true
  error.value = undefined
  validationErrors.value.clear()
  ubusCall('ns.snort', 'disable-rule', {
    gid: _gid.value,
    sid: _sid.value,
    description: _description.value
  })
    .then(() => {
      emit('save')
    })
    .catch((reason) => {
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

watchEffect(() => {
  if (visible) {
    _gid.value = rule?.gid ?? ''
    _sid.value = rule?.sid ?? ''
    _description.value = rule?.description ?? ''
  }
})
</script>

<template>
  <NeSideDrawer :is-shown="visible" :title="t('standalone.ips.disable_rule')" @close="closeHandler">
    <form class="space-y-8" @submit.prevent="save">
      <NeTextInput
        v-model="_gid"
        :disabled="loading || rule != undefined"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('gid'))"
        :label="t('standalone.ips.rule_gid')"
        required
        type="number"
      />
      <NeTextInput
        v-model="_sid"
        :disabled="loading || rule != undefined"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('sid'))"
        :label="t('standalone.ips.rule_sid')"
        required
        type="number"
      />
      <NeTextInput
        v-model="_description"
        :disabled="loading"
        :invalid-message="t(validationErrors.getFirstI18nKeyFor('description'))"
        :label="t('standalone.ips.description')"
        required
      />
      <hr />
      <div class="flex flex-wrap justify-end gap-6">
        <NeButton :disabled="loading" kind="tertiary" size="lg" @click="closeHandler">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton :disabled="loading" :loading="loading" kind="primary" size="lg" type="submit">
          {{ t('standalone.ips.disable_rule') }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
