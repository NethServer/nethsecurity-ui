<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { ref } from 'vue'
import NeMultiTextInput from '../NeMultiTextInput.vue'
import { useI18n } from 'vue-i18n'
import {
  NeInlineNotification,
  NeTooltip,
  NeButton,
  NeSkeleton,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { NeToggle } from '@nethesis/vue-components'
import { onMounted } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  MessageBag,
  validateDNSForwardingServer,
  validateHostname,
  validateRequired
} from '@/lib/validation'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()

const loading = ref(true)
const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const isUpdatingDnsConfig = ref(false)

// Form fields
const dnsDomain = ref('')
const dnsForwardingServers = ref<string[]>([])
const logDnsQueries = ref(false)

// Validation error state
const validationErrorBag = ref<MessageBag>(new MessageBag())
const dnsForwardingServersErrors = ref<string[]>([])

function clearDnsForwardingServersErrors() {
  dnsForwardingServersErrors.value = []
}

function validate() {
  validationErrorBag.value.clear()
  clearDnsForwardingServersErrors()

  dnsForwardingServers.value.forEach(() => {
    dnsForwardingServersErrors.value.push('')
  })

  let validForwardingServers = true
  for (let [index, server] of dnsForwardingServers.value.entries()) {
    for (let validator of [validateRequired(server), validateDNSForwardingServer(server)]) {
      if (!validator.valid) {
        dnsForwardingServersErrors.value[index] = t(validator.errMessage as string)
        validForwardingServers = false
        break
      }
    }
  }

  const dnsDomainValidation = [validateRequired(dnsDomain.value), validateHostname(dnsDomain.value)]
  dnsDomainValidation.forEach((validation) => {
    if (!validation.valid) {
      validationErrorBag.value.set('dnsDomain', [t(validation.errMessage as string)])
    }
  })

  return validForwardingServers && dnsDomainValidation.every((validator) => validator.valid)
}

async function fetchDnsConfig() {
  try {
    loading.value = true
    const dnsConfig = await ubusCall('ns.dns', 'get-config')
    dnsDomain.value = dnsConfig.data.domain
    dnsForwardingServers.value = dnsConfig.data.server
    logDnsQueries.value = dnsConfig.data.logqueries
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_retrieve_dns_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  }
}

async function updateDnsConfig() {
  error.value.notificationTitle = ''
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''

  if (!validate()) {
    return
  }

  try {
    isUpdatingDnsConfig.value = true
    await ubusCall('ns.dns', 'set-config', {
      domain: dnsDomain.value,
      logqueries: logDnsQueries.value,
      server: dnsForwardingServers.value
    })
    await uciChangesStore.getChanges()
  } catch (err: any) {
    error.value.notificationTitle = t('error.cannot_update_dns_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = err.toString()
  } finally {
    isUpdatingDnsConfig.value = false
  }
}

onMounted(() => {
  fetchDnsConfig()
})
</script>

<template>
  <div class="flex max-w-xl flex-col gap-y-8">
    <NeInlineNotification
      kind="error"
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
    >
      <template #details v-if="error.notificationDetails">
        {{ error.notificationDetails }}
      </template>
    </NeInlineNotification>
    <NeSkeleton v-if="loading" :lines="15" />
    <template v-else>
      <NeMultiTextInput
        v-model="dnsForwardingServers"
        :add-item-label="t('standalone.dns_dhcp.add_dns_server')"
        :title="t('standalone.dns_dhcp.dns_forwarding_servers')"
        :invalid-messages="dnsForwardingServersErrors"
        ><template #tooltip>
          <NeTooltip
            ><template #content>{{
              t('standalone.dns_dhcp.dns_forwarding_servers_tooltip')
            }}</template></NeTooltip
          >
        </template>
      </NeMultiTextInput>
      <NeTextInput
        :label="t('standalone.dns_dhcp.dns_domain')"
        v-model="dnsDomain"
        :invalid-message="validationErrorBag.getFirstFor('dnsDomain')"
      >
        <template #tooltip
          ><NeTooltip
            ><template #content>{{
              t('standalone.dns_dhcp.dns_domain_tooltip')
            }}</template></NeTooltip
          ></template
        >
      </NeTextInput>
      <NeToggle :label="t('standalone.dns_dhcp.log_dns_queries')" v-model="logDnsQueries" />
      <hr />
      <div class="flex justify-end">
        <NeButton
          kind="primary"
          @click="updateDnsConfig"
          :disabled="isUpdatingDnsConfig"
          :loading="isUpdatingDnsConfig"
          ><template #prefix>
            <font-awesome-icon
              :icon="['fas', 'floppy-disk']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('common.save') }}</NeButton
        >
      </div>
    </template>
  </div>
</template>
