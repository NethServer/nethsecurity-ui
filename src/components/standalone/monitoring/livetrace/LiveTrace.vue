<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { isAxiosError } from 'axios'
import * as v from 'valibot'
import {
  byteFormat1024,
  getAxiosErrorMessage,
  NeBadgeV2,
  NeButton,
  NeCombobox,
  NeDropdownFilterV2,
  NeEmptyState,
  NeHeading,
  NeInlineNotification,
  NeLink,
  NePaginator,
  NeSkeleton,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTextInput,
  NeTooltip,
  useItemPagination,
  type NeDropdownFilterV2Option,
  type NeComboboxOption
} from '@nethesis/vue-components'
import { faBan, faShieldHalved, faTriangleExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { MessageBag, validateIpAddress, validatePort } from '@/lib/validation'
import { formatRate } from '@/composables/useFlows'
import { getStandaloneRoutePrefix } from '@/lib/router'
import type { FirewallRule, RuleHost } from '@/stores/standalone/firewall'

type Blocked = {
  protocol: string
  source: string
  destination: string
  destination_port?: string
  layer: string
  table?: string
  chain?: string
  rule?: string
  in_interface?: string
  out_interface?: string
  application?: string
  host?: string
  count: number
  first_seen: number
  last_seen: number
}

type DnsQuery = {
  name: string
  type: string
  result: string
  filtered: boolean
  count: number
  last_seen: number
}

type Connection = {
  id: string
  protocol: string
  source: string
  source_port?: string
  destination: string
  destination_port?: string
  state?: string
  unreplied?: boolean
  labels?: string[]
  source_stats?: { packets: number; bytes: number }
  destination_stats?: { packets: number; bytes: number }
  in_interface?: string
  out_interface?: string
  rule?: string
  application?: string
  dpi_protocol?: string
  host?: string
}

type Allowed = {
  protocol: string
  source: string
  destination: string
  destination_port?: string
  in_interface?: string
  out_interface?: string
  rule?: string
  count: number
  source_ports?: string[]
}

type Status = {
  running: boolean
  ip: string
  duration: number
  port?: number
  protocol?: string
  remaining: number
  blocked: Blocked[]
  dns: DnsQuery[]
  connections?: Connection[]
  allowed?: Allowed[]
  failure?: string
  truncated?: boolean
}

type ConnectionRow = Connection & { download: number; upload: number }

const { t } = useI18n()
const queryClient = useQueryClient()

const durationOptions: NeComboboxOption[] = [1, 2, 5, 10].map((minutes) => ({
  id: String(minutes * 60),
  label: t('standalone.live_trace.minutes', { n: minutes }, minutes)
}))

const protocolOptions: NeComboboxOption[] = [
  { id: 'any', label: t('common.any') },
  { id: 'tcp', label: 'TCP' },
  { id: 'udp', label: 'UDP' }
]

const layerLabels: Record<string, string> = {
  firewall: t('standalone.live_trace.layer_firewall'),
  threat_shield_ip: t('standalone.live_trace.layer_threat_shield_ip'),
  dpi: t('standalone.live_trace.layer_dpi'),
  ips: t('standalone.live_trace.layer_ips'),
  dns_filter: t('standalone.live_trace.layer_dns_filter'),
  mac_binding: t('standalone.live_trace.layer_mac_binding'),
  routing: t('standalone.live_trace.layer_routing')
}

const ip = ref('')
const duration = ref('120')
const port = ref('')
const protocol = ref('any')
const filter = ref('')
const applicationFilter = ref<NeDropdownFilterV2Option[]>([])
const protocolFilter = ref<NeDropdownFilterV2Option[]>([])
const sourceFilter = ref<NeDropdownFilterV2Option[]>([])
const destinationFilter = ref<NeDropdownFilterV2Option[]>([])
const statusFilter = ref<NeDropdownFilterV2Option[]>([])
const validationBag = ref(new MessageBag())

const STATUS_KEY = ['livetrace', 'status']

// poll every 2s while running, the poll that sees running=false is the final status
const { data, error, isPending } = useQuery({
  queryKey: STATUS_KEY,
  queryFn: () => ubusCall<{ data: Status }>('ns.livetrace', 'status'),
  select: (res) => res.data,
  refetchInterval: (query) => (query.state.data?.data.running ? 2000 : false)
})

const refreshStatus = () => queryClient.invalidateQueries({ queryKey: STATUS_KEY })

const start = useMutation({
  mutationFn: () => {
    const portValue = String(port.value).trim()
    return ubusCall<{ data: unknown }>('ns.livetrace', 'start', {
      ip: ip.value.trim(),
      duration: Number(duration.value),
      ...(portValue ? { port: Number(portValue) } : {}),
      ...(protocol.value != 'any' ? { protocol: protocol.value } : {})
    })
  },
  onMutate: () => {
    validationBag.value.clear()
    stop.reset()
  },
  onSuccess: refreshStatus,
  onError: (e: Error) => {
    if (e instanceof ValidationError) {
      validationBag.value = e.errorBag
    }
    refreshStatus()
  }
})

const stop = useMutation({
  mutationFn: () => ubusCall<{ data: unknown }>('ns.livetrace', 'stop'),
  onMutate: () => start.reset(),
  onSuccess: refreshStatus
})

// the backend treats port 0 as no filter, an empty port means no filter
const formSchema = v.object({
  ip: v.pipe(
    v.string(),
    v.check((value) => validateIpAddress(value.trim()).valid, 'error.invalid_ip_address')
  ),
  port: v.pipe(
    v.string(),
    v.check(
      (value) => value.trim() == '' || (/^\d+$/.test(value.trim()) && validatePort(value).valid),
      'error.invalid_port'
    )
  )
})

function validate(): boolean {
  validationBag.value.clear()
  const result = v.safeParse(formSchema, { ip: ip.value, port: String(port.value) })
  if (!result.success) {
    for (const issue of result.issues) {
      const field = issue.path?.[0]?.key
      if (typeof field == 'string' && !validationBag.value.has(field)) {
        validationBag.value.set(field, issue.message)
      }
    }
  }
  return result.success
}

function startTrace() {
  if (validate()) {
    start.mutate()
  }
}

// drop stale errors once the value changes
watch(ip, () => validationBag.value.delete('ip'))
watch(port, () => validationBag.value.delete('port'))

const actionError = computed(() =>
  start.error.value instanceof ValidationError ? null : (start.error.value ?? stop.error.value)
)

// start error codes with their own message
const errorKeys: Record<string, string> = {
  session_busy: 'error.session_busy',
  collector_not_started: 'error.collector_not_started'
}
const errorDescription = computed(() => {
  const e = error.value ?? actionError.value
  const code = isAxiosError<{ message?: string }>(e) ? (e.response?.data?.message ?? '') : ''
  return t(errorKeys[code] ?? getAxiosErrorMessage(e))
})

const hasResults = computed(
  () =>
    !!data.value &&
    (data.value.running ||
      data.value.blocked.length + data.value.dns.length + (data.value.allowed?.length ?? 0) > 0)
)

// traced ip followed by the optional filter, e.g. "10.10.10.50, TCP port 443"
const traceTarget = computed(() => {
  const status = data.value
  const service = [
    status?.protocol?.toUpperCase(),
    status?.port ? t('standalone.live_trace.port_n', { port: status.port }) : ''
  ]
    .filter(Boolean)
    .join(' ')
  return [status?.ip, service].filter(Boolean).join(', ')
})

// allowed traffic that left through the WAN on the default route, not blocked
const isRouteWarning = (item: Blocked) => item.layer == 'routing' && item.rule == 'private_to_wan'

// each blocked row aggregates several attempts
const blockedAttempts = computed(() =>
  (data.value?.blocked ?? [])
    .filter((item) => !isRouteWarning(item))
    .reduce((sum, item) => sum + item.count, 0)
)

const remaining = computed(() => {
  const seconds = data.value?.remaining ?? 0
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})

// stats are missing when conntrack accounting is off
const totalBytes = (c: Connection) =>
  Number(c.source_stats?.bytes ?? 0) + Number(c.destination_stats?.bytes ?? 0)

// rates come from byte deltas between two consecutive polls
const connections = ref<ConnectionRow[]>([])
let lastPoll = 0
watch(
  data,
  (status) => {
    if (!status) return
    const now = Date.now()
    const seconds = (now - lastPoll) / 1000
    const previous = new Map(connections.value.map((c) => [c.id, c]))
    const rate = (bytes = 0, old?: number) =>
      old == undefined ? 0 : Math.max(0, Number(bytes) - Number(old)) / seconds
    connections.value = (status.connections ?? [])
      .map((c) => {
        const old = previous.get(c.id)
        const original = rate(c.source_stats?.bytes, old && (old.source_stats?.bytes ?? 0))
        const reply = rate(c.destination_stats?.bytes, old && (old.destination_stats?.bytes ?? 0))
        // connections opened towards the traced ip download in the original direction
        const inbound = c.source != status.ip
        return {
          ...c,
          download: inbound ? original : reply,
          upload: inbound ? reply : original
        }
      })
      // stable order across polls, so rows do not jump between pages
      .sort((a, b) => totalBytes(b) - totalBytes(a) || a.id.localeCompare(b.id))
    lastPoll = now
  },
  { immediate: true }
)

// same precedence as the status column
const connectionStatus = (c: Connection) =>
  c.labels?.includes('netify-blocked')
    ? 'netify-blocked'
    : c.unreplied
      ? 'unreplied'
      : c.state || ''
const statusLabels: Record<string, string> = {
  'netify-blocked': t('standalone.live_trace.blocked_by_dpi'),
  unreplied: t('standalone.live_trace.no_reply')
}

// options from the current connections, plus selected values no longer present
const filterOptions = (
  values: (string | undefined)[],
  selected: NeDropdownFilterV2Option[],
  label = (value: string) => value
): NeDropdownFilterV2Option[] =>
  [...new Set([...values, ...selected.map((o) => o.id)])]
    .filter((value): value is string => !!value)
    .sort()
    .map((value) => ({ id: value, label: label(value) }))

const applications = computed(() =>
  filterOptions(
    connections.value.map((c) => c.application || c.dpi_protocol),
    applicationFilter.value
  )
)
// shared filters apply to connections while running, to allowed connections after
const filterRows = computed(() =>
  data.value?.running ? connections.value : (data.value?.allowed ?? [])
)
const protocols = computed(() =>
  filterOptions(
    filterRows.value.map((c) => c.protocol),
    protocolFilter.value,
    (value) => value.toUpperCase()
  )
)
const sourceIps = computed(() =>
  filterOptions(
    filterRows.value.map((c) => c.source),
    sourceFilter.value
  )
)
const destinationIps = computed(() =>
  filterOptions(
    filterRows.value.map((c) => c.destination),
    destinationFilter.value
  )
)
const statuses = computed(() =>
  filterOptions(
    connections.value.map(connectionStatus),
    statusFilter.value,
    (value) => statusLabels[value] ?? value
  )
)

const dropdownProps = {
  kind: 'checkbox' as const,
  showOptionsFilter: true,
  clearFilterLabel: t('ne_dropdown_filter.clear_selection'),
  clearSearchLabel: t('ne_dropdown_filter.clear_search'),
  moreOptionsHiddenLabel: t('ne_dropdown_filter.more_options_hidden'),
  noOptionsLabel: t('ne_dropdown_filter.no_options'),
  openMenuAriaLabel: t('ne_dropdown_filter.open_filter')
}

// OR within a filter, AND across filters
const matches = (selected: NeDropdownFilterV2Option[], value?: string) =>
  selected.length == 0 || selected.some((o) => o.id == (value ?? ''))

const textMatch = (values: (string | undefined)[]) =>
  values.join(' ').toLowerCase().includes(filter.value.trim().toLowerCase())

const filteredConnections = computed(() =>
  connections.value.filter(
    (c) =>
      matches(applicationFilter.value, c.application || c.dpi_protocol) &&
      matches(protocolFilter.value, c.protocol) &&
      matches(sourceFilter.value, c.source) &&
      matches(destinationFilter.value, c.destination) &&
      matches(statusFilter.value, connectionStatus(c)) &&
      textMatch([
        c.protocol,
        c.source,
        c.source_port,
        c.destination,
        c.destination_port,
        c.in_interface,
        c.out_interface,
        c.application,
        c.host
      ])
  )
)

const totalDownload = computed(() =>
  filteredConnections.value.reduce((sum, c) => sum + c.download, 0)
)
const totalUpload = computed(() => filteredConnections.value.reduce((sum, c) => sum + c.upload, 0))

// one row per connection
const allowedRows = computed<(Allowed & { source_port?: string })[]>(() =>
  (data.value?.allowed ?? []).flatMap((a) =>
    a.source_ports?.length ? a.source_ports.map((port) => ({ ...a, source_port: port })) : [a]
  )
)

const filteredAllowed = computed(() =>
  allowedRows.value.filter(
    (a) =>
      matches(protocolFilter.value, a.protocol) &&
      matches(sourceFilter.value, a.source) &&
      matches(destinationFilter.value, a.destination) &&
      textMatch([
        a.protocol,
        a.source,
        a.source_port,
        a.destination,
        a.destination_port,
        a.in_interface,
        a.out_interface
      ])
  )
)

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => filteredConnections.value, {
  itemsPerPage: pageSize
})
const allowedPageSize = ref(10)
const { currentPage: allowedPage, paginatedItems: paginatedAllowed } = useItemPagination(
  () => filteredAllowed.value,
  { itemsPerPage: allowedPageSize }
)
watch(
  [filter, applicationFilter, protocolFilter, sourceFilter, destinationFilter, statusFilter],
  () => {
    if (currentPage.value != 1) {
      currentPage.value = 1
    }
    if (allowedPage.value != 1) {
      allowedPage.value = 1
    }
  }
)

function resetFilters() {
  filter.value = ''
  applicationFilter.value = []
  protocolFilter.value = []
  sourceFilter.value = []
  destinationFilter.value = []
  statusFilter.value = []
}

const formatTime = (timestamp: number) => new Date(timestamp * 1000).toLocaleTimeString()
const endpoint = (address: string, port?: string) =>
  port ? (address.includes(':') ? `[${address}]:${port}` : `${address}:${port}`) : address

const dnsResults: Record<string, string> = {
  '': t('standalone.live_trace.no_reply'),
  NOERROR: t('standalone.live_trace.dns_success'),
  NXDOMAIN: t('standalone.live_trace.dns_not_found'),
  SERVFAIL: t('standalone.live_trace.dns_server_failure'),
  REFUSED: t('standalone.live_trace.dns_refused')
}
const dnsResult = (result: string) => dnsResults[result] ?? result

// fw4 default policy, hit by traffic from an interface in no zone
const isDefaultPolicy = (item: Blocked) =>
  item.layer == 'firewall' &&
  ['input', 'forward'].includes(item.chain ?? '') &&
  ['jump handle_reject', 'policy drop'].includes(item.rule ?? '')

// plain description of the blocking rule
const blockedRule = (item: Blocked) => {
  const zone = item.chain?.match(/^(?:drop|reject)_(?:from|to)_(.+)$/)?.[1]
  if (item.layer == 'firewall' && zone) {
    return t('standalone.live_trace.zone_policy', { zone })
  }
  if (isDefaultPolicy(item)) {
    return t('standalone.live_trace.default_policy')
  }
  if (item.layer == 'threat_shield_ip' && item.rule) {
    return t('standalone.live_trace.ip_list', { name: item.rule })
  }
  if (item.layer == 'routing') {
    if (item.rule == 'private_to_wan') {
      return t('standalone.live_trace.private_to_wan')
    }
    return t('standalone.live_trace.no_route')
  }
  if (item.layer == 'dpi') {
    return item.application || t('standalone.live_trace.blocked_by_dpi')
  }
  return item.rule
}

// user rules are named after the fw4 comment, zone policies have their own text
const isUserRule = (item: Blocked) =>
  item.layer == 'firewall' &&
  !isDefaultPolicy(item) &&
  !/^(?:drop|reject)_(?:from|to)_/.test(item.chain ?? '')

const { data: firewallRules } = useQuery({
  queryKey: ['livetrace', 'firewall-rules'],
  queryFn: async () => {
    const responses = await Promise.all(
      ['list-forward-rules', 'list-input-rules', 'list-output-rules'].map((method) =>
        ubusCall<{ data: { rules: FirewallRule[] } }>('ns.firewall', method)
      )
    )
    const rules = new Map<string, FirewallRule>()
    for (const rule of responses.flatMap((res) => res.data.rules)) {
      if (!rules.has(rule.name)) rules.set(rule.name, rule)
    }
    return rules
  },
  staleTime: 60_000,
  enabled: computed(() => !!data.value?.blocked.some(isUserRule))
})

const firewallRule = (item: Blocked): FirewallRule | undefined =>
  isUserRule(item) && item.rule ? firewallRules.value?.get(item.rule) : undefined

const ruleEndpoint = (zone?: string, hosts: (string | RuleHost)[] = []) =>
  [
    zone == '*' ? t('common.any') : zone,
    hosts.map((host) => (typeof host == 'string' ? host : host.label || host.value)).join(', ')
  ]
    .filter(Boolean)
    .join(' ') || '-'

const ruleService = (rule: FirewallRule) => {
  if (rule.ns_service && !['*', 'custom'].includes(rule.ns_service)) return rule.ns_service
  const service = [rule.proto.join(', '), rule.dest_port.join(', ')].filter(Boolean).join(' ')
  return service || t('common.any')
}

const ruleDetails = (rule: FirewallRule): [string, string][] => [
  ['standalone.firewall_rules.action', rule.target],
  ['standalone.live_trace.source', ruleEndpoint(rule.src, rule.src_ip)],
  ['standalone.live_trace.destination', ruleEndpoint(rule.dest, rule.dest_ip)],
  ['standalone.firewall_rules.service', ruleService(rule)],
  ['common.status', t(rule.enabled ? 'common.enabled' : 'common.disabled')]
]
</script>

<template>
  <div class="space-y-8">
    <p class="max-w-2xl text-tertiary-neutral">
      {{ t('standalone.live_trace.description') }}
    </p>
    <NeInlineNotification
      v-if="error || actionError"
      kind="error"
      :title="t('standalone.live_trace.error')"
      :description="errorDescription"
    />
    <NeInlineNotification
      v-if="data && !data.running && data.failure"
      kind="error"
      :title="t('standalone.live_trace.failure')"
      :show-details-label="t('notifications.show_details')"
    >
      <template #details>{{ data.failure }}</template>
    </NeInlineNotification>
    <NeSkeleton v-if="isPending" :lines="5" />
    <NeInlineNotification
      v-else-if="data?.running"
      kind="info"
      :title="t('standalone.live_trace.running', { ip: traceTarget })"
      :description="t('standalone.live_trace.remaining', { time: remaining })"
      :primary-button-label="t('standalone.live_trace.stop')"
      @primary-click="stop.mutate()"
    />
    <form v-else class="flex flex-wrap items-start gap-4" @submit.prevent="startTrace">
      <NeTextInput
        v-model="ip"
        class="max-w-xs"
        :label="t('standalone.live_trace.client_ip')"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('ip'))"
        :disabled="start.isPending.value"
      />
      <NeTextInput
        v-model="port"
        class="max-w-40"
        type="number"
        :label="t('common.port')"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('port'))"
        :disabled="start.isPending.value"
        optional
        :optional-label="t('common.optional')"
      >
        <template #tooltip>
          <NeTooltip>
            <template #content>
              {{ t('standalone.live_trace.filter_helper') }}
            </template>
          </NeTooltip>
        </template>
      </NeTextInput>
      <NeCombobox
        v-model="protocol"
        class="max-w-40"
        :label="t('standalone.live_trace.protocol')"
        :options="protocolOptions"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('protocol'))"
        :disabled="start.isPending.value"
        :no-results-label="t('ne_combobox.no_results')"
        :limited-options-label="t('ne_combobox.limited_options_label')"
        :no-options-label="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        optional
        :optional-label="t('common.optional')"
      />
      <NeCombobox
        v-model="duration"
        class="max-w-xs"
        :label="t('standalone.live_trace.duration')"
        :options="durationOptions"
        :invalid-message="t(validationBag.getFirstI18nKeyFor('duration'))"
        :disabled="start.isPending.value"
        :no-results-label="t('ne_combobox.no_results')"
        :limited-options-label="t('ne_combobox.limited_options_label')"
        :no-options-label="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optional-label="t('common.optional')"
      />
      <NeButton
        class="sm:mt-8"
        kind="primary"
        type="submit"
        :disabled="start.isPending.value || !ip"
        :loading="start.isPending.value"
      >
        {{ t('standalone.live_trace.start') }}
      </NeButton>
    </form>
    <NeEmptyState
      v-if="data && !data.running && data.ip && !data.failure && !hasResults"
      :title="t('standalone.live_trace.no_traffic_last_session', { ip: traceTarget })"
      :icon="faShieldHalved"
    />
    <template v-else-if="data && hasResults">
      <p v-if="!data.running" class="text-sm text-tertiary-neutral">
        {{ t('standalone.live_trace.last_session_results', { ip: traceTarget }) }}
      </p>
      <NeInlineNotification
        v-if="data.truncated"
        kind="warning"
        :title="t('standalone.live_trace.truncated')"
        :description="t('standalone.live_trace.truncated_description')"
      />
      <!-- blocked traffic -->
      <section class="space-y-4">
        <NeHeading tag="h5">{{ t('standalone.live_trace.blocked_traffic') }}</NeHeading>
        <NeEmptyState
          v-if="data.blocked.length == 0"
          :title="
            data.running
              ? t('standalone.live_trace.no_blocked_traffic')
              : t('standalone.live_trace.no_blocked_traffic_last_session')
          "
          :description="
            data.running ? t('standalone.live_trace.no_blocked_traffic_description') : ''
          "
          :icon="faShieldHalved"
        />
        <template v-else>
          <NeInlineNotification
            v-if="blockedAttempts > 0"
            kind="error"
            :title="t('standalone.live_trace.blocked_detected', { n: blockedAttempts })"
          />
          <NeTable :aria-label="t('standalone.live_trace.blocked_traffic')" card-breakpoint="xl">
            <NeTableHead>
              <NeTableHeadCell>{{ t('standalone.live_trace.last_seen') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.protocol') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.source') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.destination') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.blocked_by') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.interfaces') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.attempts') }}</NeTableHeadCell>
            </NeTableHead>
            <NeTableBody>
              <NeTableRow v-for="(item, index) in data.blocked" :key="index">
                <NeTableCell :data-label="t('standalone.live_trace.last_seen')">
                  {{ formatTime(item.last_seen) }}
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.protocol')">
                  {{ item.protocol.toUpperCase() }}
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.source')">
                  {{ item.source || '-' }}
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.destination')">
                  {{ endpoint(item.destination, item.destination_port) }}
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.blocked_by')">
                  <div class="space-y-1">
                    <NeBadgeV2 :kind="isRouteWarning(item) ? 'amber' : 'rose'">
                      <FontAwesomeIcon
                        :icon="isRouteWarning(item) ? faTriangleExclamation : faBan"
                        class="size-4"
                        aria-hidden="true"
                      />
                      {{ layerLabels[item.layer] ?? item.layer }}
                    </NeBadgeV2>
                    <p v-if="item.rule" class="font-medium">
                      <!-- a button opens it with Enter, focus on the inner element does not -->
                      <NeTooltip v-if="firewallRule(item)" trigger-event="mouseenter click">
                        <template #trigger>
                          <button
                            type="button"
                            class="cursor-help text-left underline decoration-dotted"
                          >
                            {{ blockedRule(item) }}
                          </button>
                        </template>
                        <template #content>
                          <dl class="space-y-1 text-left font-normal">
                            <div
                              v-for="[label, value] in ruleDetails(firewallRule(item)!)"
                              :key="label"
                            >
                              <dt class="mr-1 inline font-medium">{{ t(label) }}</dt>
                              <dd class="inline">{{ value }}</dd>
                            </div>
                          </dl>
                          <RouterLink
                            v-slot="{ href, navigate }"
                            :to="`${getStandaloneRoutePrefix($route)}/firewall/rules`"
                            custom
                          >
                            <NeLink
                              class="mt-2 inline-block"
                              inverted-theme
                              :href="href"
                              @click="navigate"
                            >
                              {{ t('standalone.live_trace.go_to_rules') }}
                            </NeLink>
                          </RouterLink>
                        </template>
                      </NeTooltip>
                      <template v-else>{{ blockedRule(item) }}</template>
                    </p>
                    <p
                      v-if="item.layer == 'dpi' && item.host"
                      class="text-xs text-tertiary-neutral"
                    >
                      {{ item.host }}
                    </p>
                    <p v-else-if="item.chain" class="text-xs text-tertiary-neutral">
                      {{ [item.table, item.chain].filter(Boolean).join(' / ') }}
                    </p>
                  </div>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.interfaces')">
                  {{ item.in_interface || '-' }}
                  <template v-if="item.out_interface">&rarr; {{ item.out_interface }}</template>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.attempts')">
                  {{ item.count }}
                </NeTableCell>
              </NeTableRow>
            </NeTableBody>
          </NeTable>
        </template>
      </section>
      <!-- connections while running, allowed connections of the last session after -->
      <section v-if="data.running || data.allowed?.length" class="space-y-4">
        <NeHeading tag="h5">
          {{
            data.running
              ? t('standalone.live_trace.connections')
              : t('standalone.live_trace.allowed_connections')
          }}
        </NeHeading>
        <div class="flex flex-wrap items-center gap-6">
          <div class="mr-auto flex flex-wrap items-center gap-4">
            <NeTextInput
              v-model="filter"
              :placeholder="t('standalone.live_trace.filter_connections')"
              :clear-search-label="t('ne_dropdown_filter.clear_search')"
              is-search
            />
            <NeDropdownFilterV2
              v-if="data.running"
              v-model="applicationFilter"
              v-bind="dropdownProps"
              :label="t('standalone.live_trace.application')"
              :options="applications"
            />
            <NeDropdownFilterV2
              v-model="protocolFilter"
              v-bind="dropdownProps"
              :label="t('standalone.live_trace.protocol')"
              :options="protocols"
            />
            <NeDropdownFilterV2
              v-model="sourceFilter"
              v-bind="dropdownProps"
              :label="t('standalone.live_trace.source')"
              :options="sourceIps"
            />
            <NeDropdownFilterV2
              v-model="destinationFilter"
              v-bind="dropdownProps"
              :label="t('standalone.live_trace.destination')"
              :options="destinationIps"
            />
            <NeDropdownFilterV2
              v-if="data.running"
              v-model="statusFilter"
              v-bind="dropdownProps"
              :label="t('common.status')"
              :options="statuses"
            />
            <NeButton kind="tertiary" @click="resetFilters">
              {{ t('common.reset_filters') }}
            </NeButton>
          </div>
          <template v-if="data.running">
            <span>{{ t('common.download') }} {{ formatRate(totalDownload) }}</span>
            <span>{{ t('common.upload') }} {{ formatRate(totalUpload) }}</span>
          </template>
        </div>
        <NeEmptyState
          v-if="(data.running ? filteredConnections : filteredAllowed).length == 0"
          :title="
            filterRows.length
              ? t('standalone.live_trace.no_connections_found')
              : t('standalone.live_trace.no_connections')
          "
          :description="filterRows.length ? t('common.try_changing_search_filters') : ''"
        >
          <NeButton v-if="filterRows.length" kind="tertiary" @click="resetFilters">
            {{ t('common.reset_filters') }}
          </NeButton>
        </NeEmptyState>
        <NeTable
          v-else-if="data.running"
          :aria-label="t('standalone.live_trace.connections')"
          card-breakpoint="xl"
        >
          <NeTableHead>
            <NeTableHeadCell>{{ t('standalone.live_trace.protocol') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.source') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.destination') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.application') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.interfaces') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.download_rate') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.upload_rate') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.total_traffic') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('common.status') }}</NeTableHeadCell>
          </NeTableHead>
          <NeTableBody>
            <NeTableRow v-for="item in paginatedItems" :key="item.id">
              <NeTableCell :data-label="t('standalone.live_trace.protocol')">
                {{ item.protocol.toUpperCase() }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.source')">
                {{ endpoint(item.source, item.source_port) }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.destination')">
                {{ endpoint(item.destination, item.destination_port) }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.application')">
                <p>{{ item.application || item.dpi_protocol || '-' }}</p>
                <p v-if="item.host" class="text-xs text-tertiary-neutral">
                  {{ item.host }}
                </p>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.interfaces')">
                <template v-if="item.in_interface || item.out_interface">
                  <p>
                    {{ item.in_interface || '-' }}
                    <template v-if="item.out_interface">&rarr; {{ item.out_interface }}</template>
                  </p>
                  <p v-if="item.rule" class="text-xs text-tertiary-neutral">
                    {{ item.rule }}
                  </p>
                </template>
                <span v-else class="text-tertiary-neutral">
                  {{ t('standalone.live_trace.not_traced') }}
                </span>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.download_rate')">
                {{ formatRate(item.download) }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.upload_rate')">
                {{ formatRate(item.upload) }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.total_traffic')">
                {{ byteFormat1024(totalBytes(item)) }}
              </NeTableCell>
              <NeTableCell :data-label="t('common.status')">
                <NeBadgeV2 v-if="item.labels?.includes('netify-blocked')" kind="rose">
                  {{ t('standalone.live_trace.blocked_by_dpi') }}
                </NeBadgeV2>
                <NeBadgeV2 v-else-if="item.unreplied" kind="amber">
                  {{ t('standalone.live_trace.no_reply') }}
                </NeBadgeV2>
                <template v-else>{{ item.state || '-' }}</template>
              </NeTableCell>
            </NeTableRow>
          </NeTableBody>
          <template #paginator>
            <NePaginator
              :current-page="currentPage"
              :total-rows="filteredConnections.length"
              :page-size="pageSize"
              :nav-pagination-label="t('ne_table.pagination')"
              :next-label="t('ne_table.go_to_next_page')"
              :previous-label="t('ne_table.go_to_previous_page')"
              :range-of-total-label="t('ne_table.of')"
              :page-size-label="t('ne_table.show')"
              @select-page="(page: number) => (currentPage = page)"
              @select-page-size="(size: number) => (pageSize = size)"
            />
          </template>
        </NeTable>
        <NeTable
          v-else
          :aria-label="t('standalone.live_trace.allowed_connections')"
          card-breakpoint="xl"
        >
          <NeTableHead>
            <NeTableHeadCell>{{ t('standalone.live_trace.protocol') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.source') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.destination') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.interfaces') }}</NeTableHeadCell>
          </NeTableHead>
          <NeTableBody>
            <NeTableRow v-for="(item, index) in paginatedAllowed" :key="index">
              <NeTableCell :data-label="t('standalone.live_trace.protocol')">
                {{ item.protocol.toUpperCase() }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.source')">
                {{ endpoint(item.source, item.source_port) }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.destination')">
                {{ endpoint(item.destination, item.destination_port) }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.interfaces')">
                <p>
                  {{ item.in_interface || '-' }}
                  <template v-if="item.out_interface">&rarr; {{ item.out_interface }}</template>
                </p>
                <p v-if="item.rule" class="text-xs text-tertiary-neutral">
                  {{ item.rule }}
                </p>
              </NeTableCell>
            </NeTableRow>
          </NeTableBody>
          <template #paginator>
            <NePaginator
              :current-page="allowedPage"
              :total-rows="filteredAllowed.length"
              :page-size="allowedPageSize"
              :nav-pagination-label="t('ne_table.pagination')"
              :next-label="t('ne_table.go_to_next_page')"
              :previous-label="t('ne_table.go_to_previous_page')"
              :range-of-total-label="t('ne_table.of')"
              :page-size-label="t('ne_table.show')"
              @select-page="(page: number) => (allowedPage = page)"
              @select-page-size="(size: number) => (allowedPageSize = size)"
            />
          </template>
        </NeTable>
      </section>
      <!-- dns queries -->
      <section class="space-y-4">
        <NeHeading tag="h5">{{ t('standalone.live_trace.dns_queries') }}</NeHeading>
        <NeEmptyState
          v-if="data.dns.length == 0"
          :title="
            data.running
              ? t('standalone.live_trace.no_dns')
              : t('standalone.live_trace.no_dns_last_session')
          "
        />
        <NeTable v-else :aria-label="t('standalone.live_trace.dns_queries')" card-breakpoint="xl">
          <NeTableHead>
            <NeTableHeadCell>{{ t('common.name') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('common.type') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.result') }}</NeTableHeadCell>
            <NeTableHeadCell>{{ t('standalone.live_trace.count') }}</NeTableHeadCell>
          </NeTableHead>
          <NeTableBody>
            <NeTableRow v-for="(item, index) in data.dns" :key="index">
              <NeTableCell :data-label="t('common.name')">
                {{ item.name }}
              </NeTableCell>
              <NeTableCell :data-label="t('common.type')">
                {{ item.type }}
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.result')">
                <span class="flex flex-wrap items-center gap-2">
                  {{ dnsResult(item.result) }}
                  <NeBadgeV2 v-if="item.filtered" kind="rose">
                    {{ t('standalone.live_trace.blocked_by_dns_filter') }}
                  </NeBadgeV2>
                </span>
              </NeTableCell>
              <NeTableCell :data-label="t('standalone.live_trace.count')">
                {{ item.count }}
              </NeTableCell>
            </NeTableRow>
          </NeTableBody>
        </NeTable>
      </section>
    </template>
  </div>
</template>
