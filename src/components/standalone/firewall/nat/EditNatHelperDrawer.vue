<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref } from 'vue'
import { MessageBag, validateRequired, type validationOutput } from '@/lib/validation'
import { watch } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import {
  NeInlineNotification,
  NeSideDrawer,
  NeButton,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import type { NatHelper } from '@/stores/standalone/firewall'
import { upperFirst } from 'lodash-es'
import { useNotificationsStore } from '@/stores/notifications'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'

type Param = {
  name: string
  value: string
}

const props = withDefaults(
  defineProps<{
    isShown: boolean
    natHelper?: NatHelper
  }>(),
  { isShown: false }
)

const emit = defineEmits(['close', 'reloadData'])

const { t } = useI18n()
const notificationsStore = useNotificationsStore()
const router = useRouter()

const module = ref('')
const enabled = ref(true)
const params = ref<Param[]>([])
const errorBag = ref(new MessageBag())

const loading = ref({
  editNatHelper: false
})

const error = ref({
  editNatHelper: '',
  editNatHelperDetails: ''
})

watch(
  () => props.isShown,
  () => {
    if (props.isShown) {
      clearErrors()

      if (props.natHelper) {
        module.value = props.natHelper.name
        enabled.value = props.natHelper.enabled
        const moduleParams = []

        if (props.natHelper.params) {
          for (let [paramName, paramValue] of Object.entries(props.natHelper.params)) {
            moduleParams.push({
              name: paramName,
              value: paramValue
            })
          }
          params.value = moduleParams
        }
      }
    }
  }
)

function clearErrors() {
  errorBag.value.clear()
  error.value.editNatHelper = ''
  error.value.editNatHelperDetails = ''
}

function runValidators(validators: validationOutput[], label: string): boolean {
  for (let validator of validators) {
    if (!validator.valid) {
      errorBag.value.set(label, [validator.errMessage as string])
    }
  }
  return validators.every((validator) => validator.valid)
}

function validate() {
  clearErrors()

  if (!enabled.value) {
    return true
  }

  // all parameters are required

  const paramValidators: [validationOutput[], string][] = []

  for (let param of params.value) {
    paramValidators.push([[validateRequired(param.value)], param.name])
  }

  return paramValidators
    .map(([validator, label]) => runValidators(validator, label))
    .every((result) => result)
}

async function editNatHelper() {
  const isValidationOk = validate()
  if (!isValidationOk) {
    return
  }

  loading.value.editNatHelper = true
  const natHelperName = props.natHelper?.name

  const payload = {
    name: natHelperName,
    enabled: enabled.value,
    // convert params array to object
    params: params.value.reduce((acc, param) => {
      acc[param.name] = param.value
      return acc
    }, {} as Record<string, string>)
  }

  try {
    const res = await ubusCall('ns.nathelpers', 'edit-nat-helper', payload)
    const isRebootNeeded = res.data.reboot_needed

    // show toast notification

    let toastTitle = ''
    let toastDescription = ''
    let toastKind = ''
    let toastAction: Function | undefined = undefined
    let toastActionLabel = ''

    if (isRebootNeeded) {
      // show warning toast
      toastTitle = t('standalone.nat_helpers.reboot_to_apply_changes')
      toastDescription = t('standalone.nat_helpers.reboot_to_apply_changes_description', {
        module: natHelperName
      })
      toastKind = 'warning'
      toastAction = () => {
        router.push(`${getStandaloneRoutePrefix()}/system/reboot-and-shutdown`)
      }
      toastActionLabel = t('common.go_to_page', { page: t('standalone.reboot_and_shutdown.title') })
    } else {
      // show success toast
      toastTitle = t('standalone.nat_helpers.nat_helper_name_saved', {
        module: natHelperName
      })
      toastKind = 'success'
    }

    setTimeout(() => {
      notificationsStore.createNotification({
        title: toastTitle,
        description: toastDescription,
        kind: toastKind,
        secondaryAction: toastAction,
        secondaryLabel: toastActionLabel
      })
    }, 500)

    emit('reloadData')
    closeDrawer()
  } catch (err: any) {
    console.error(err)

    if (err instanceof ValidationError) {
      errorBag.value = err.errorBag
    } else {
      error.value.editNatHelper = t(getAxiosErrorMessage(err))
      error.value.editNatHelperDetails = err.toString()
    }
  } finally {
    loading.value.editNatHelper = false
  }
}

function closeDrawer() {
  emit('close')
}

function getParamLabel(paramName: string) {
  return upperFirst(paramName.replace(/_/g, ' '))
}
</script>

<template>
  <NeSideDrawer
    :isShown="isShown"
    :title="t('standalone.nat_helpers.edit_nat_helper')"
    :closeAriaLabel="t('common.shell.close_side_drawer')"
    @close="closeDrawer()"
  >
    <form @submit.prevent>
      <div class="space-y-6">
        <NeTextInput v-model="module" :label="t('standalone.nat_helpers.module')" disabled />
        <NeToggle
          v-model="enabled"
          :topLabel="t('common.status')"
          :label="enabled ? t('common.enabled') : t('common.disabled')"
        />
        <template v-if="enabled">
          <!-- params -->
          <NeTextInput
            v-for="param in params"
            :key="param.name"
            v-model.trim="param.value"
            :label="getParamLabel(param.name)"
            :invalidMessage="t(errorBag.getFirstI18nKeyFor(param.name))"
          />
        </template>
        <!-- editNatHelper error notification -->
        <NeInlineNotification
          v-if="error.editNatHelper"
          kind="error"
          :title="t('error.cannot_save_nat_helper')"
          :description="error.editNatHelper"
        >
          <template #details v-if="error.editNatHelperDetails">
            {{ error.editNatHelperDetails }}
          </template>
        </NeInlineNotification>
        <!-- footer -->
        <hr class="my-8 border-gray-200 dark:border-gray-700" />
        <div class="flex justify-end">
          <NeButton
            kind="tertiary"
            size="lg"
            @click.prevent="closeDrawer"
            :disabled="loading.editNatHelper"
            class="mr-3"
          >
            {{ t('common.cancel') }}
          </NeButton>
          <NeButton
            kind="primary"
            size="lg"
            @click.prevent="editNatHelper"
            :disabled="loading.editNatHelper"
            :loading="loading.editNatHelper"
          >
            {{ t('common.save') }}
          </NeButton>
        </div>
      </div>
    </form>
  </NeSideDrawer>
</template>
