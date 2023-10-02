<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeSideDrawer,
  NeToggle,
  NeTextInput,
  NeCombobox,
  NeButton,
  NeSkeleton,
  NeInlineNotification,
  NeTooltip,
  type NeComboboxOption,
  getAxiosErrorMessage
} from '@nethserver/vue-tailwind-lib'
import { toRefs, ref, onMounted } from 'vue'
import type {
  CreateEditPortForwardPayload,
  PortForward
} from '@/views/standalone/firewall/PortForward.vue'
import { watchEffect } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { ZoneType, useFirewallStore } from '@/stores/standalone/useFirewallStore'
import { computed } from 'vue'

const props = defineProps<{
  isShown: boolean
  initialItem: PortForward | null
}>()
const { isShown } = toRefs(props)

const emit = defineEmits(['close', 'add-edit-port-forward'])

const firewallConfig = useFirewallStore()

const showAdvancedSettings = ref(false)
const loading = ref(true)
const isSubmittingRequest = ref(false)
const error = ref({
  notificationTitle: '',
  notificationDescription: ''
})

// Options
const supportedProtocols = ref<NeComboboxOption[]>([])
const supportedReflectionZones = ref<NeComboboxOption[]>([])
const wanInterfaces = ref<NeComboboxOption[]>([])
const supportedDestinationZones = computed<NeComboboxOption[]>(() => {
  if (firewallConfig.loading) return []
  else {
    return [
      ...firewallConfig.zones
        .filter((zone) => zone.type() != ZoneType.WAN)
        .map((zone) => ({
          id: zone.name,
          label: zone.name.toUpperCase()
        })),
      { id: 'any', label: t('standalone.port_forward.any_zone') }
    ]
  }
})

// Form fields
const id = ref('')
const name = ref('')
const sourcePort = ref('')
const destinationIP = ref('')
const destinationPort = ref('')
const wan = ref('')
const enabled = ref(false)
const restrict = ref<string[]>([])
const protocols = ref<NeComboboxOption[]>([])
const log = ref(false)
const reflection = ref(false)
const reflectionZones = ref<NeComboboxOption[]>([])
const destinationZone = ref('')

function resetForm() {
  id.value = props.initialItem?.id ?? ''
  name.value = props.initialItem?.name ?? ''
  sourcePort.value = props.initialItem?.source_port ?? ''
  destinationIP.value = props.initialItem?.dest_ip ?? ''
  destinationPort.value = props.initialItem?.destination_port ?? ''
  wan.value = props.initialItem?.wan ?? 'any'
  enabled.value = props.initialItem?.enabled ?? false
  restrict.value = props.initialItem?.restrict ?? []
  protocols.value =
    props.initialItem?.protocol.map((proto: string) => ({
      id: proto,
      label: proto.toUpperCase()
    })) ?? []
  log.value = props.initialItem?.log ?? false
  reflection.value = props.initialItem?.reflection ?? false
  reflectionZones.value =
    props.initialItem?.reflection_zone.map((reflectionZone) => ({
      id: reflectionZone,
      label: reflectionZone.toUpperCase()
    })) ?? []
  destinationZone.value = props.initialItem?.dest ?? 'any'
}

const { t } = useI18n()

async function fetchOptions() {
  try {
    loading.value = true
    supportedProtocols.value = (
      await ubusCall('ns.redirects', 'list-protocols')
    ).data.protocols.map((proto: string) => ({
      id: proto,
      label: proto.toUpperCase()
    }))
    supportedReflectionZones.value = (await ubusCall('ns.redirects', 'list-zones')).data.zones.map(
      (zone: string) => ({
        id: zone,
        label: zone.toUpperCase()
      })
    )
    wanInterfaces.value = [
      ...(await ubusCall('ns.redirects', 'list-wans')).data.wans.map(
        (iface: { device: string; ipaddr: string }) => ({
          id: iface.ipaddr,
          label: iface.ipaddr
        })
      ),
      { id: 'any', label: t('standalone.port_forward.any') }
    ]
    loading.value = false
  } catch (err: any) {
    error.value.notificationTitle = t('error.generic_error')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  }
}

watchEffect(() => {
  resetForm()
})

function close() {
  resetForm()
  emit('close')
}

onMounted(() => {
  fetchOptions()
  firewallConfig.fetch()
})

function deleteRestrictedIP(restrictedIP: string) {
  restrict.value = restrict.value.filter((elem) => elem !== restrictedIP)
}

function addRestrictedIP() {
  restrict.value.push('')
}

function validate(): boolean {
  //TODO: implement validation
  return true
}

async function performRequest() {
  const isEditing = id.value != ''

  try {
    isSubmittingRequest.value = true
    const requestType = isEditing ? 'edit-redirect' : 'add-redirect'

    if (validate()) {
      const payload: CreateEditPortForwardPayload = {
        dest_ip: destinationIP.value,
        proto: protocols.value.map((protoObj) => protoObj.id),
        src_dport: sourcePort.value,
        dest_port: destinationPort.value,
        name: name.value,
        src_dip: wan.value === 'any' ? '' : wan.value,
        enabled: enabled.value ? '1' : '0',
        log: log.value ? '1' : '0',
        reflection: reflection.value ? '1' : '0',
        restrict: restrict.value,
        dest: destinationZone.value === 'any' ? '' : destinationZone.value,
        reflection_zone: reflectionZones.value.map((reflectionZone) => reflectionZone.id)
      }

      if (isEditing) payload.id = id.value

      await ubusCall('ns.redirects', requestType, payload)
      emit('add-edit-port-forward')
      close()
    }
  } catch (err: any) {
    error.value.notificationTitle = isEditing
      ? t('standalone.port_forward.cannot_edit_port_forward')
      : t('standalone.port_forward.cannot_add_port_forward')

    error.value.notificationDescription = t(getAxiosErrorMessage(err))
  } finally {
    isSubmittingRequest.value = false
  }
}
</script>

<template>
  <NeSideDrawer
    :is-shown="isShown"
    @close="close()"
    :closeAriaLabel="t('standalone.shell.close_side_drawer')"
    :title="
      id
        ? t('standalone.port_forward.edit_port_forward')
        : t('standalone.port_forward.add_port_forward')
    "
  >
    <NeInlineNotification
      v-if="error.notificationTitle"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="mb-6"
      kind="error"
    />
    <NeSkeleton v-if="loading || firewallConfig.loading" :lines="10" />
    <div v-else class="flex flex-col gap-y-6">
      <NeToggle :label="t('standalone.port_forward.status')" v-model="enabled" />
      <div>
        <p class="mb-2 text-sm">{{ t('standalone.port_forward.source_zone') }}</p>
        <p class="text-sm">WAN</p>
      </div>
      <NeCombobox
        :label="t('standalone.port_forward.protocols')"
        :placeholder="t('standalone.port_forward.choose_protocol')"
        :multiple="true"
        :options="supportedProtocols"
        v-model="protocols"
      />
      <NeTextInput :label="t('standalone.port_forward.source_port')" v-model="sourcePort" />
      <NeTextInput
        :label="t('standalone.port_forward.destination_address')"
        v-model="destinationIP"
      >
        <template #tooltip
          ><NeTooltip
            ><template #content>{{
              t('standalone.port_forward.destination_address_tooltip')
            }}</template></NeTooltip
          ></template
        >
      </NeTextInput>
      <NeCombobox
        :label="t('standalone.port_forward.destination_zone')"
        :placeholder="t('standalone.port_forward.choose_zone')"
        :options="supportedDestinationZones"
        :selected-label="t('standalone.port_forward.any_zone')"
        v-model="destinationZone"
      />
      <NeTextInput
        :label="t('standalone.port_forward.destination_port')"
        v-model="destinationPort"
      />
      <div>
        <NeButton kind="tertiary" @click="showAdvancedSettings = !showAdvancedSettings">
          {{ t('standalone.port_forward.advanced_settings') }}
          <template #suffix>
            <font-awesome-icon
              :icon="['fas', showAdvancedSettings ? 'angle-up' : 'angle-down']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
        </NeButton>
      </div>
      <template v-if="showAdvancedSettings">
        <NeCombobox
          :label="t('standalone.port_forward.wan_ip')"
          :options="wanInterfaces"
          v-model="wan"
        />

        <!-- TODO: isolate into separate component -->
        <div>
          <div>
            <p
              class="mb-2 mr-2 inline-block text-sm font-medium leading-6 text-gray-700 dark:text-gray-200"
            >
              {{ t('standalone.port_forward.restrict_access_to') }}
            </p>
            <NeTooltip
              ><template #content>{{
                t('standalone.port_forward.restrict_access_to_tooltip')
              }}</template></NeTooltip
            >
          </div>

          <div class="space-y-6">
            <div class="space-y-4">
              <div v-for="(restrictedIP, i) in restrict" :key="i" class="flex items-center gap-2">
                <NeTextInput v-model.trim="restrict[i]" class="grow" />
                <NeButton kind="tertiary" size="md" @click="deleteRestrictedIP(restrictedIP)">
                  <font-awesome-icon
                    :icon="['fas', 'trash']"
                    class="h-4 w-4 py-1"
                    aria-hidden="true"
                  />
                </NeButton>
              </div>
              <NeButton size="md" @click="addRestrictedIP">
                <template #prefix>
                  <font-awesome-icon :icon="['fas', 'plus']" class="h-4 w-4" aria-hidden="true" />
                </template>
                {{ t('standalone.port_forward.add_ip_address') }}
              </NeButton>
            </div>
          </div>
        </div>

        <NeToggle :label="t('standalone.port_forward.log')" v-model="log" />
        <NeToggle :label="t('standalone.port_forward.hairpin_nat')" v-model="reflection" />
        <NeCombobox
          v-if="reflection"
          :label="t('standalone.port_forward.hairpin_nat_zones')"
          :placeholder="t('standalone.port_forward.choose_zone')"
          :options="supportedReflectionZones"
          v-model="reflectionZones"
        />
      </template>
      <hr />
      <div class="flex justify-end">
        <NeButton kind="tertiary" class="mr-4" @click="close()">{{ t('common.cancel') }}</NeButton>
        <NeButton
          kind="primary"
          @click="performRequest()"
          :disabled="isSubmittingRequest"
          :loading="isSubmittingRequest"
          >{{
            id
              ? t('standalone.port_forward.edit_port_forward')
              : t('standalone.port_forward.add_port_forward')
          }}</NeButton
        >
      </div>
    </div>
  </NeSideDrawer>
</template>
