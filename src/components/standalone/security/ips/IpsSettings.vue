<script lang="ts" setup>
import FormLayout from '@/components/standalone/FormLayout.vue'
import { useI18n } from 'vue-i18n'
import { type Policy, useIpsStore } from '@/stores/standalone/ips'
import {
  getAxiosErrorMessage,
  NeBadge,
  NeButton,
  NeInlineNotification,
  NeLink,
  NeRadioSelection,
  NeTextInput,
  NeToggle,
  NeTooltip
} from '@nethesis/vue-components'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCheck, faFloppyDisk } from '@fortawesome/free-solid-svg-icons'

const { t } = useI18n()
const options: Array<{
  id: Policy
  label: string
  description: string
}> = [
  {
    id: 'connectivity',
    label: t('standalone.ips.connectivity'),
    description: t('standalone.ips.connectivity_description')
  },
  {
    id: 'balanced',
    label: t('standalone.ips.balanced'),
    description: t('standalone.ips.balanced_description')
  },
  {
    id: 'security',
    label: t('standalone.ips.security'),
    description: t('standalone.ips.security_description')
  }
]

const ips = useIpsStore()
</script>

<template>
  <div class="max-w-3xl">
    <FormLayout
      :description="t('standalone.ips.ips_settings_description')"
      :title="t('standalone.ips.ips_status')"
    >
      <form class="space-y-8" @submit.prevent="ips.save">
        <NeInlineNotification
          v-if="ips.saveError"
          :description="t(getAxiosErrorMessage(ips.saveError))"
          :title="t('error.cannot_open_unit')"
          kind="error"
        />
        <NeToggle
          v-model="ips.enabled"
          :disabled="ips.saving"
          :label="ips.enabled ? t('common.enabled') : t('common.disabled')"
          :top-label="t('common.status')"
        />
        <template v-if="ips.enabled">
          <!-- If the value is not max-detect, show the radio selection -->
          <NeRadioSelection
            v-if="ips.policy != 'max-detect'"
            v-model="ips.policy"
            :disabled="ips.saving"
            :options="options"
          >
            <template #label>{{ t('standalone.ips.policy') }}</template>
          </NeRadioSelection>
          <!-- FIXME: If the value is max-detect, show a disabled input -->
          <div class="space-y-2">
            <NeTextInput
              v-model="ips.oinkcode"
              :disabled="ips.saving"
              :invalid-message="ips.invalidOinkcode ? t('standalone.ips.oinkcode_invalid') : ''"
              :label="t('standalone.ips.oinkcode')"
              autocomplete="off"
              is-password
            >
              <template #tooltip>
                <NeTooltip>
                  <template #content>
                    <i18n-t keypath="standalone.ips.oinkcode_tooltip" tag="p">
                      <NeLink href="https://www.snort.org/" target="_blank" inverted-theme>
                        https://www.snort.org
                      </NeLink>
                    </i18n-t>
                  </template>
                </NeTooltip>
              </template>
            </NeTextInput>
            <div class="flex items-center gap-4">
              <NeButton
                :disabled="ips.checkingOinkcode"
                :loading="ips.checkingOinkcode"
                @click="ips.checkOinkcode"
              >
                {{ t('standalone.ips.verify_oinkcode') }}
              </NeButton>
              <Transition name="fade">
                <NeBadge
                  v-if="ips.validOinkcode"
                  :icon="faCheck"
                  :text="t('standalone.ips.oinkcode_verified')"
                  kind="success"
                />
              </Transition>
            </div>
          </div>
        </template>
        <hr />
        <NeButton :disabled="ips.saving" :loading="ips.saving" kind="primary" type="submit">
          <template #prefix>
            <FontAwesomeIcon :icon="faFloppyDisk" />
          </template>
          {{ t('common.save') }}
        </NeButton>
      </form>
    </FormLayout>
  </div>
</template>
