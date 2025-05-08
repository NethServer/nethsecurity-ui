<script lang="ts" setup>
import {
  NeButton,
  NeEmptyState,
  NeFormItemLabel,
  NeInlineNotification,
  NeSideDrawer,
  NeSkeleton,
  NeTextInput
} from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCirclePlus, faSearch } from '@fortawesome/free-solid-svg-icons'
import { ref, watch, watchEffect } from 'vue'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus.ts'
import type { AxiosResponse } from 'axios'
import { MessageBag } from '@/lib/validation.ts'

const { t } = useI18n()

type BlockedIpResponse = { found: false } | { found: true; list: string }

const drawerOpen = ref(false)
const ip = ref('')

const searching = ref(false)
const error = ref<Error>()
const result = ref<BlockedIpResponse>()
const validationBag = ref(new MessageBag())

watch(ip, () => {
  result.value = undefined
  validationBag.value.clear()
})

watchEffect(() => {
  if (drawerOpen.value) {
    ip.value = ''
  }
})

function search() {
  searching.value = true
  error.value = undefined
  validationBag.value.clear()
  ubusCall('ns.threatshield', 'is-ip-blocked', {
    ip: ip.value
  })
    .then((response: AxiosResponse<BlockedIpResponse>) => {
      result.value = response.data
    })
    .catch((reason: Error) => {
      if (reason instanceof ValidationError) {
        validationBag.value = reason.errorBag
      }
      error.value = reason
    })
    .finally(() => {
      searching.value = false
    })
}

const unblocking = ref(false)
const errorUnblocking = ref<Error>()
const successUnblocking = ref(false)
watchEffect(() => {
  if (successUnblocking.value) {
    setTimeout(() => {
      successUnblocking.value = false
    }, 2000)
  }
})

function allowIp() {
  unblocking.value = true
  errorUnblocking.value = undefined
  ubusCall('ns.threatshield', 'add-allowed', {
    address: ip.value,
    description: ''
  })
    .then(() => {
      successUnblocking.value = true
    })
    .catch((reason: Error) => {
      if (reason instanceof ValidationError && reason.errorBag.has('address')) {
        successUnblocking.value = true
      }
      errorUnblocking.value = reason
    })
    .finally(() => {
      unblocking.value = false
    })
}
</script>

<template>
  <NeButton v-bind="$attrs" @click="drawerOpen = true">
    <template #prefix>
      <FontAwesomeIcon :icon="faSearch" aria-hidden="true" class="h-4 w-4" />
    </template>
    {{ t('standalone.threat_shield.search_ip_in_blocklists') }}
  </NeButton>
  <NeSideDrawer
    :close-aria-label="t('common.shell.close_side_drawer')"
    :is-shown="drawerOpen"
    :title="t('standalone.threat_shield.search_ip_in_blocklists')"
    @close="drawerOpen = false"
  >
    <div class="space-y-6">
      <div class="space-y-4">
        <div class="space-y-2">
          <NeFormItemLabel>{{ t('common.ip_address') }}</NeFormItemLabel>
          <form class="flex flex-col gap-2 sm:flex-row sm:items-start" @submit.prevent="search">
            <div class="flex-auto">
              <NeTextInput
                v-model.trim="ip"
                :helper-text="t('standalone.threat_shield.ipv4_or_ipv6_address')"
                :invalid-message="t(validationBag.getFirstI18nKeyFor('ip'))"
                is-search
                rqeuired
              />
            </div>
            <NeButton
              :disabled="searching"
              :loading="searching"
              kind="primary"
              size="lg"
              type="sumbit"
            >
              {{ t('common.search') }}
            </NeButton>
          </form>
        </div>
        <NeSkeleton v-if="searching" :lines="2" />
        <template v-else-if="result != undefined">
          <div v-if="result.found" class="space-y-4">
            <NeInlineNotification
              :title="t('standalone.threat_shield.ip_address_found')"
              kind="info"
            >
              <template #description>
                <p>
                  {{
                    t('standalone.threat_shield.ip_address_found_description', {
                      ip: ip,
                      blocklist: result.list
                    })
                  }}
                </p>
              </template>
            </NeInlineNotification>
            <div class="flex items-center gap-4">
              <NeButton
                :disabled="unblocking"
                :loading="unblocking"
                kind="secondary"
                size="lg"
                @click="allowIp"
              >
                <template #prefix>
                  <FontAwesomeIcon :icon="faCirclePlus" aria-hidden="true" />
                </template>
                {{ t('standalone.threat_shield.add_to_local_allowlist') }}
              </NeButton>
              <Transition name="fade">
                <p
                  v-if="successUnblocking"
                  class="rounded bg-gray-100 px-2.5 py-1.5 text-sm text-gray-900"
                >
                  {{ t('standalone.threat_shield.added_to_local_allowlist') }}
                </p>
              </Transition>
            </div>
          </div>
          <NeEmptyState
            v-else
            :description="
              t('standalone.threat_shield.the_ip_is_not_in_any_blocklist', {
                ip: ip
              })
            "
            :icon="faSearch"
            :title="t('standalone.threat_shield.ip_address_not_found')"
          />
        </template>
      </div>
      <hr />
      <div class="flex justify-end">
        <NeButton @click="drawerOpen = false">
          {{ t('common.close') }}
        </NeButton>
      </div>
    </div>
  </NeSideDrawer>
</template>
