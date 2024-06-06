<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeCombobox,
  type NeComboboxOption,
  focusElement,
  NeSkeleton
} from '@nethesis/vue-components'
import { useUnitsStore } from '@/stores/controller/units'
import { computed, ref, watch, type Ref, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { MessageBag, validateRequiredOption, type validationOutput } from '@/lib/validation'
import { ubusCallFromController } from '@/lib/standalone/ubus'
import { useAccountsStore } from '@/stores/controller/accounts'
import router from '@/router'
import { getControllerRoutePrefix } from '@/lib/router'
import { useNotificationsStore } from '@/stores/notifications'
import type { SendOrRevokeAction } from '@/views/controller/UnitManagerView.vue'

const props = defineProps({
  isShown: {
    type: Boolean,
    required: true
  },
  action: {
    type: String as PropType<SendOrRevokeAction>,
    required: true
  }
})

const emit = defineEmits(['close'])

const { t } = useI18n()
const unitsStore = useUnitsStore()
const notificationsStore = useNotificationsStore()
const selectedUnits = ref<NeComboboxOption[]>([])
const selectedUnitsRef = ref()
const accountsStore = useAccountsStore()
const errorBag = ref(new MessageBag())
// contains the first invalid field ref
const firstErrorRef = ref()

const loading = ref({
  sendOrRevokeSshKey: false
})

const error = ref({
  sendOrRevokeSshKey: '',
  sshKeyUnits: [] as string[]
})

const unitsOptions = computed(() => {
  // show only connected units
  const connectedUnits = unitsStore.units.filter((unit) => unit.connected)
  return connectedUnits.map((unit) => {
    return {
      id: unit.id,
      label: unit.info?.unit_name || unit.id,
      description: unit.info?.unit_name ? unit.id : ''
    }
  })
})

const allUnitsSelected = computed(() => {
  return selectedUnits.value.length === unitsOptions.value.length
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      errorBag.value.clear()
      error.value.sendOrRevokeSshKey = ''
      selectedUnits.value = []
      accountsStore.loadSshKeys()
    }
  }
)

function closeDrawer() {
  emit('close')
}

function validate() {
  errorBag.value.clear()
  error.value.sendOrRevokeSshKey = ''
  error.value.sshKeyUnits = []

  const allValidators: [validationOutput[], string, Ref<any>][] = [
    // at least one unit selected
    [[validateRequiredOption(selectedUnits.value)], 'units', selectedUnitsRef]
  ]

  // reset firstErrorRef for focus management
  firstErrorRef.value = undefined

  const isValidationOk = allValidators
    .map(([validators, fieldName, fieldRef]) => runFieldValidators(validators, fieldName, fieldRef))
    .every((result) => result)

  if (firstErrorRef.value) {
    focusElement(firstErrorRef.value)
  }
  return isValidationOk
}

function runFieldValidators(
  validators: validationOutput[],
  fieldName: string,
  fieldRef: Ref<any>
): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      errorBag.value.set(fieldName, [validator.errMessage as string])

      // remember the first field with error for focus management
      if (!firstErrorRef.value) {
        firstErrorRef.value = fieldRef
      }
    }
  }
  return validators.every((validator) => validator.valid)
}

function sendOrRevokeSshKey() {
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }
  loading.value.sendOrRevokeSshKey = true
  const promises = []

  for (const unit of selectedUnits.value) {
    promises.push(sendOrRevokeSshKeyOnUnit(unit))
  }

  Promise.allSettled(promises).then((results) => {
    loading.value.sendOrRevokeSshKey = false
    const failedUnits = results.filter((result) => result.status === 'rejected')

    if (failedUnits.length > 0) {
      const i18nKey =
        props.action === 'send'
          ? 'controller.units.cannot_send_ssh_key_to_n_units'
          : 'controller.units.cannot_revoke_ssh_key_from_n_units'
      error.value.sendOrRevokeSshKey = t(i18nKey, failedUnits.length)
    } else {
      closeDrawer()

      // show toast notification
      setTimeout(() => {
        const i18nKey =
          props.action === 'send'
            ? 'controller.units.ssh_key_sent_to_n_units'
            : 'controller.units.ssh_key_revoked_from_n_units'

        notificationsStore.createNotification({
          title: t(i18nKey, selectedUnits.value.length),
          kind: 'success'
        })
      }, 500)
    }
  })
}

async function sendOrRevokeSshKeyOnUnit(unit: NeComboboxOption) {
  const pubKey = accountsStore.sshKeys.key_pub
  const apiMethod = props.action === 'send' ? 'add-ssh-key' : 'remove-ssh-key'

  try {
    await ubusCallFromController(
      'ns.controller',
      apiMethod,
      {
        ssh_key: pubKey
      },
      unit.id,
      { timeout: 5000 }
    )
  } catch (err: any) {
    error.value.sshKeyUnits.push(unit.label || unit.id)
    throw err
  }
}

function goToAccountSettings() {
  router.push(`${getControllerRoutePrefix()}/account`)
}

function selectAllUnits() {
  selectedUnits.value = unitsOptions.value
}

function deselectAllUnits() {
  selectedUnits.value = []
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="
      props.action === 'send'
        ? t('controller.units.send_ssh_public_key')
        : t('controller.units.revoke_ssh_public_key')
    "
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer"
  >
    <form @submit.prevent>
      <NeSkeleton v-if="accountsStore.listSshKeysLoading" size="lg" :lines="4" />
      <template v-else>
        <!-- no ssh key configured -->
        <NeInlineNotification
          v-if="!accountsStore.sshKeys.key_pub"
          kind="warning"
          :title="t('controller.units.ssh_key_not_generated')"
          :description="t('controller.units.ssh_key_not_generated_description')"
          :closeAriaLabel="t('common.close')"
          :showDetailsLabel="t('notifications.show_details')"
          :primaryButtonLabel="t('controller.units.go_to_account_settings')"
          @primaryClick="goToAccountSettings"
        />
        <!-- ssh key configured -->
        <div v-else class="space-y-6">
          <NeInlineNotification
            kind="info"
            :title="
              props.action === 'send'
                ? t('controller.units.send_ssh_public_key')
                : t('controller.units.revoke_ssh_public_key')
            "
            :description="
              props.action === 'send'
                ? t('controller.units.send_ssh_key_description')
                : t('controller.units.revoke_ssh_key_description')
            "
            :closeAriaLabel="t('common.close')"
            :showDetailsLabel="t('notifications.show_details')"
          />
          <div>
            <!-- select all / deselect all -->
            <NeButton
              v-if="allUnitsSelected"
              kind="tertiary"
              @click="deselectAllUnits"
              class="-mx-2"
            >
              {{ t('controller.units.deselect_all_units') }}
            </NeButton>
            <NeButton v-else kind="tertiary" @click="selectAllUnits" class="-mx-2">
              {{ t('controller.units.select_all_units') }}
            </NeButton>
            <!-- units -->
            <NeCombobox
              :label="t('controller.units.units')"
              v-model="selectedUnits"
              :options="unitsOptions"
              :placeholder="t('ne_combobox.choose_multiple')"
              multiple
              :invalidMessage="t(errorBag.getFirstI18nKeyFor('units'))"
              :disabled="loading.sendOrRevokeSshKey"
              :optionalLabel="t('common.optional')"
              :noResultsLabel="t('ne_combobox.no_results')"
              :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
              :noOptionsLabel="t('controller.units.no_unit_is_currently_connected')"
              :selected-label="t('ne_combobox.selected')"
              :user-input-label="t('ne_combobox.user_input_label')"
              ref="selectedUnitsRef"
              class="mt-2"
            />
          </div>
          <!-- sendOrRevokeSshKey error notification -->
          <NeInlineNotification
            v-if="error.sendOrRevokeSshKey"
            kind="error"
            :title="error.sendOrRevokeSshKey"
          >
            <template #details v-if="error.sshKeyUnits.length">
              <ul class="list-inside list-disc">
                <li v-for="unit in error.sshKeyUnits" :key="unit">
                  {{ unit }}
                </li>
              </ul>
            </template>
          </NeInlineNotification>
        </div>
      </template>
      <!-- footer -->
      <hr class="my-8 border-gray-200 dark:border-gray-700" />
      <div class="flex justify-end">
        <NeButton kind="tertiary" size="lg" @click.prevent="closeDrawer" class="mr-3">
          {{ t('common.cancel') }}
        </NeButton>
        <NeButton
          kind="primary"
          size="lg"
          @click.prevent="sendOrRevokeSshKey"
          :disabled="
            loading.sendOrRevokeSshKey ||
            accountsStore.listSshKeysLoading ||
            !accountsStore.sshKeys.key_pub
          "
          :loading="loading.sendOrRevokeSshKey"
          type="submit"
        >
          {{
            props.action === 'send'
              ? t('controller.units.send_ssh_key')
              : t('controller.units.revoke_ssh_key')
          }}
        </NeButton>
      </div>
    </form>
  </NeSideDrawer>
</template>
