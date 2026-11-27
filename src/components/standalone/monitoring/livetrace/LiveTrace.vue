<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useIntervalFn } from '@vueuse/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/vue-query'
import { isAxiosError } from 'axios'
import * as v from 'valibot'
import {
  byteFormat1024,
  focusElement,
  getAxiosErrorMessage,
  NeButton,
  NeCard,
  NeCombobox,
  NeDropdownFilterV2,
  NeEmptyState,
  NeInlineNotification,
  NeListbox,
  NePaginator,
  NeTooltip,
  NeSideDrawer,
  NeSpinner,
  NeTable,
  NeTableBody,
  NeTableCell,
  NeTableHead,
  NeTableHeadCell,
  NeTableRow,
  NeTabs,
  NeTextInput,
  useItemPagination,
  type NeComboboxOption,
  type NeDropdownFilterV2Option,
  type NeListboxOption
} from '@nethesis/vue-components'
import {
  faArrowRight,
  faBan,
  faCircleCheck,
  faCircleXmark,
  faCopy,
  faEye,
  faMagnifyingGlass,
  faPlay,
  faStop,
  faTriangleExclamation
} from '@fortawesome/free-solid-svg-icons'
import { faEmptySet } from '@nethesis/nethesis-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRoute, useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { ubusCall, ValidationError } from '@/lib/standalone/ubus'
import { MessageBag, validateIpAddress, validatePort } from '@/lib/validation'
import { formatRate } from '@/composables/useFlows'
import type { FirewallRule, RuleHost } from '@/stores/standalone/firewall'
import type { DynamicLease } from '@/components/standalone/dns_dhcp/DynamicLeases.vue'
import type { StaticLease } from '@/components/standalone/dns_dhcp/StaticLeases.vue'

type Blocked = {
  protocol: string
  source: string
  destination: string
  destination_name?: string
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
  addresses?: string[]
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
  destination_name?: string
  destination_port?: string
  source_nat?: string
  source_nat_port?: string
  destination_nat?: string
  destination_nat_port?: string
  timeout?: string
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
  truncated?: boolean
  device_interfaces?: Record<string, string>
}

type ConnectionRow = Connection & { download: number; upload: number }

const { t, te, locale } = useI18n()
const queryClient = useQueryClient()
const route = useRoute()
const router = useRouter()

const durationOptions: NeListboxOption[] = [1, 2, 5, 10].map((minutes) => ({
  id: String(minutes * 60),
  label: t('standalone.live_trace.minutes', { n: minutes }, minutes)
}))

const protocolOptions: NeListboxOption[] = [
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
const duration = ref('60')
const port = ref('')
const protocol = ref('any')
const filter = ref('')
const applicationFilter = ref<NeDropdownFilterV2Option[]>([])
const protocolFilter = ref<NeDropdownFilterV2Option[]>([])
const sourceFilter = ref<NeDropdownFilterV2Option[]>([])
const destinationFilter = ref<NeDropdownFilterV2Option[]>([])
const statusFilter = ref<NeDropdownFilterV2Option[]>([])
const dnsFilter = ref('')
const dnsTypeFilter = ref<NeDropdownFilterV2Option[]>([])
const dnsResultFilter = ref<NeDropdownFilterV2Option[]>([])
const validationBag = ref(new MessageBag())
const ipRef = ref()
const portRef = ref()
const startButton = ref<InstanceType<typeof NeButton>>()
const stopButton = ref<InstanceType<typeof NeButton>>()
const connectionsFilterRef = ref<InstanceType<typeof NeTextInput>>()
const dnsFilterRef = ref<InstanceType<typeof NeTextInput>>()

const STATUS_KEY = ['livetrace', 'status']

// poll every 2s while running, the poll that sees running=false is the final status
const {
  data: lastStatus,
  error,
  isPending
} = useQuery({
  queryKey: STATUS_KEY,
  queryFn: () => ubusCall<{ data: Status }>('ns.livetrace', 'status'),
  select: (res) => res.data,
  refetchInterval: (query) => (query.state.data?.data.running ? 2000 : false)
})

// the backend keeps nothing after the session: the page keeps the last status it saw running
const lastRunning = ref<Status>()
watch(
  lastStatus,
  (status) => {
    if (status?.running) lastRunning.value = status
  },
  { immediate: true }
)
const data = computed(() => {
  const status = lastStatus.value
  if (!status || status.running || !lastRunning.value) return status
  return { ...lastRunning.value, running: false, remaining: 0 }
})

// show the traced values while running and on the first load
watch(
  data,
  (status, old) => {
    if (status?.ip && (status.running || !old)) {
      ip.value = status.ip
      port.value = status.port ? String(status.port) : ''
      protocol.value = status.protocol || 'any'
      // a session started from the API can have a duration that is not in the list
      if (durationOptions.some((option) => option.id == String(status.duration))) {
        duration.value = String(status.duration)
      }
    }
  },
  { immediate: true }
)

const refreshStatus = () => queryClient.invalidateQueries({ queryKey: STATUS_KEY })

// after a start or stop from this page, focus the button that replaced the clicked one
async function refreshAndFocus() {
  await refreshStatus()
  await nextTick()
  ;(data.value?.running ? stopButton : startButton).value?.$el.focus()
}

// DHCP client names by ip, the active lease name first; without them the field takes any ip
const { data: clientNames } = useQuery({
  queryKey: ['livetrace', 'dhcp-leases'],
  queryFn: async () => {
    const [active, reserved] = await Promise.all([
      ubusCall<{ data: { leases: DynamicLease[] } }>('ns.dhcp', 'list-active-leases'),
      ubusCall<{ data: { leases: StaticLease[] } }>('ns.dhcp', 'list-static-leases')
    ])
    const names = new Map<string, string>()
    for (const lease of [...active.data.leases, ...reserved.data.leases]) {
      if (lease.ipaddr && !names.get(lease.ipaddr)) names.set(lease.ipaddr, lease.hostname)
    }
    return names
  },
  staleTime: 60_000
})

const clientName = (address?: string) => (address && clientNames.value?.get(address)) || ''

// device with its network interface, e.g. eth1 (wan)
function deviceLabel(device?: string) {
  if (!device) {
    return ''
  }
  const networkInterface = data.value?.device_interfaces?.[device]
  if (!networkInterface) {
    return device
  }
  return `${device} (${networkInterface})`
}

const clientOptions = computed<NeComboboxOption[]>(() =>
  [...(clientNames.value ?? [])]
    .map(([address, name]) => ({ id: address, label: address, description: name }))
    .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
)

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
  onSuccess: () => {
    // a session ending before the first poll must not show the previous one
    lastRunning.value = undefined
    return refreshAndFocus()
  },
  onError: (e: Error) => {
    if (e instanceof ValidationError) {
      // show the page texts for the server codes it has, e.g. invalid_ip_address
      const bag = new MessageBag()
      e.errorBag.forEach((codes, field) =>
        bag.set(
          field,
          codes.map((code) =>
            te(`standalone.live_trace.${code}`) ? `standalone.live_trace.${code}` : code
          )
        )
      )
      validationBag.value = bag
    }
    refreshStatus()
  }
})

const stop = useMutation({
  mutationFn: () => ubusCall<{ data: unknown }>('ns.livetrace', 'stop'),
  onMutate: () => start.reset(),
  onSuccess: refreshAndFocus
})

// the backend treats port 0 as no filter, an empty port means no filter
const formSchema = v.object({
  ip: v.pipe(
    v.string(),
    v.check(
      (value) => validateIpAddress(value.trim()).valid,
      'standalone.live_trace.invalid_ip_address'
    )
  ),
  port: v.pipe(
    v.string(),
    v.check(
      (value) => value.trim() == '' || (/^\d+$/.test(value.trim()) && validatePort(value).valid),
      'standalone.live_trace.invalid_port'
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
    focusFirstError()
  }
  return result.success
}

// ip comes before port in the form
function focusFirstError() {
  if (validationBag.value.has('ip')) {
    focusElement(ipRef)
  } else if (validationBag.value.has('port')) {
    focusElement(portRef)
  }
}

// server errors arrive while the form is still disabled, focus once it is enabled
watch(
  start.isPending,
  (pending) => {
    if (!pending && start.error.value instanceof ValidationError) {
      focusFirstError()
    }
  },
  { flush: 'post' }
)

function startTrace() {
  // a typed hostname of a known client becomes its address
  const typed = ip.value.trim().toLowerCase()
  const known = [...(clientNames.value ?? [])].find(([, name]) => name.toLowerCase() == typed)
  if (typed && known) {
    ip.value = known[0]
  }
  if (validate()) {
    start.mutate()
  }
}

const formDisabled = computed(() => start.isPending.value || !!data.value?.running)

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
const errorTitle = computed(() =>
  error.value
    ? t('standalone.live_trace.cannot_retrieve_status')
    : stop.error.value
      ? t('standalone.live_trace.cannot_stop')
      : t('standalone.live_trace.cannot_start')
)
const errorDescription = computed(() => {
  const e = error.value ?? actionError.value
  const code = isAxiosError<{ message?: string }>(e) ? (e.response?.data?.message ?? '') : ''
  return t(errorKeys[code] ?? getAxiosErrorMessage(e))
})

const hasResults = computed(
  () =>
    !!data.value &&
    (data.value.running ||
      data.value.blocked.length + data.value.dns.length + connections.value.length > 0)
)

// traced ip followed by the optional filter, e.g. "10.10.10.50, TCP port 443"
const traceTarget = computed(() => {
  const status = data.value
  const key = status?.protocol
    ? status.port
      ? 'standalone.live_trace.target_ip_protocol_port'
      : 'standalone.live_trace.target_ip_protocol'
    : status?.port
      ? 'standalone.live_trace.target_ip_port'
      : 'standalone.live_trace.target_ip'
  const name = clientName(status?.ip)
  return t(key, {
    ip: name ? t('standalone.live_trace.target_ip_name', { ip: status?.ip, name }) : status?.ip,
    protocol: status?.protocol?.toUpperCase(),
    port: status?.port
  })
})

// announce session start and end to screen readers, not on the first load
const announcement = ref('')
watch(
  () => data.value?.running,
  (running, old) => {
    if (running != undefined && old != undefined && running != old) {
      announcement.value = running
        ? t('standalone.live_trace.trace_started')
        : t('standalone.live_trace.trace_ended')
    }
  }
)

// allowed traffic that left through the WAN on the default route, not blocked
const isRouteWarning = (item: Blocked) => item.layer == 'routing' && item.rule == 'private_to_wan'

const routeWarnings = computed(() => (data.value?.blocked ?? []).filter(isRouteWarning))

// newest first, route warnings are shown apart
const blockedRows = computed(() =>
  (data.value?.blocked ?? [])
    .filter((item) => !isRouteWarning(item))
    .sort((a, b) => b.last_seen - a.last_seen)
)

const blockedKey = (item: Blocked) =>
  [
    item.protocol,
    item.source,
    item.destination,
    item.destination_port,
    item.layer,
    item.table,
    item.chain,
    item.rule
  ].join('|')

// blocks new or with more attempts since the previous poll, not those of the first load
type BlockSeen = { count: number; at: number }
let blockSeen = new Map<string, BlockSeen>()
const pollTime = ref(0)
watch(
  data,
  (status, old) => {
    pollTime.value = Date.now()
    blockSeen = new Map(
      blockedRows.value.map((item): [string, BlockSeen] => {
        const key = blockedKey(item)
        const seen = blockSeen.get(key)
        return [
          key,
          seen && seen.count == item.count
            ? seen
            : { count: item.count, at: old ? pollTime.value : 0 }
        ]
      })
    )
  },
  { immediate: true }
)
const isNewBlock = (item: Blocked) =>
  !!data.value?.running && pollTime.value - (blockSeen.get(blockedKey(item))?.at ?? 0) < 4000

// keep the end instant across polls, so the shown minute does not flicker
const endsAt = ref(0)
watch(
  data,
  (status) => {
    const end = Date.now() + (status?.remaining ?? 0) * 1000
    if (status?.running && Math.abs(end - endsAt.value) > 5000) {
      endsAt.value = end
    }
  },
  { immediate: true }
)
const endsAtTime = computed(() =>
  new Date(endsAt.value).toLocaleTimeString(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23'
  })
)

// count down every second between polls, while a session runs
const now = ref(Date.now())
const ticker = useIntervalFn(() => (now.value = Date.now()), 1000, {
  immediate: false,
  immediateCallback: true
})
watch(
  () => !!data.value?.running,
  (running) => (running ? ticker.resume() : ticker.pause()),
  { immediate: true }
)
const remaining = computed(() => {
  const seconds = Math.max(0, Math.round((endsAt.value - now.value) / 1000))
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
})

// stats are missing when conntrack accounting is off
const totalBytes = (c: Connection) =>
  Number(c.source_stats?.bytes ?? 0) + Number(c.destination_stats?.bytes ?? 0)

// rates come from byte deltas between two consecutive polls
const connections = ref<ConnectionRow[]>([])
let lastPoll = 0
let liveShown = false
watch(
  data,
  (status) => {
    if (!status) return
    // after the stop keep the rows shown last, a reload starts empty
    if (!status.running && liveShown) return
    liveShown = status.running
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
      // conntrack id order is stable across polls, so rows do not jump between pages
      .sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }))
    lastPoll = now
  },
  { immediate: true }
)

const connectionStatus = (c: Connection) =>
  c.labels?.includes('netify-blocked')
    ? 'netify-blocked'
    : c.unreplied
      ? 'unreplied'
      : c.state || 'replied'
// conntrack states, unknown ones as they are; UDP/ICMP with a reply is "replied"
const statusLabels: Record<string, string> = {
  'netify-blocked': t('standalone.live_trace.blocked_by_dpi'),
  unreplied: t('standalone.live_trace.no_reply'),
  replied: t('standalone.live_trace.replied'),
  SYN_SENT: t('standalone.live_trace.state_syn_sent'),
  SYN_SENT2: t('standalone.live_trace.state_syn_sent'),
  SYN_RECV: t('standalone.live_trace.state_syn_recv'),
  ESTABLISHED: t('standalone.live_trace.state_established'),
  FIN_WAIT: t('standalone.live_trace.state_fin_wait'),
  CLOSE_WAIT: t('standalone.live_trace.state_close_wait'),
  LAST_ACK: t('standalone.live_trace.state_last_ack'),
  TIME_WAIT: t('standalone.live_trace.state_time_wait'),
  CLOSE: t('standalone.live_trace.state_close')
}
const statusLabel = (value: string) => statusLabels[value] ?? value

// options from the current connections, plus selected values no longer present;
// with none, rows without a value get the "-" option
const filterOptions = (
  values: (string | undefined)[],
  selected: NeDropdownFilterV2Option[],
  label = (value: string) => value,
  none = false
): NeDropdownFilterV2Option[] =>
  [...new Set([...values.map((value) => value ?? ''), ...selected.map((o) => o.id)])]
    .filter((value) => none || !!value)
    .sort()
    .map((value) => ({ id: value, label: value ? label(value) : '-' }))

const applications = computed(() =>
  filterOptions(
    connections.value.map((c) => c.application || c.dpi_protocol),
    applicationFilter.value,
    undefined,
    true
  )
)
const protocols = computed(() =>
  filterOptions(
    connections.value.map((c) => c.protocol),
    protocolFilter.value,
    (value) => value.toUpperCase()
  )
)
const sourceIps = computed(() =>
  filterOptions(
    connections.value.map((c) => c.source),
    sourceFilter.value
  )
)
const destinationIps = computed(() =>
  filterOptions(
    connections.value.map((c) => c.destination),
    destinationFilter.value
  )
)
const statuses = computed(() =>
  filterOptions(connections.value.map(connectionStatus), statusFilter.value, statusLabel, true)
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

const textMatch = (values: (string | undefined)[], text = filter.value) =>
  values.join(' ').toLowerCase().includes(text.trim().toLowerCase())

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
        clientName(c.source),
        c.source_port,
        c.destination,
        c.destination_name,
        c.destination_port,
        c.source_nat,
        c.destination_nat,
        deviceLabel(c.in_interface),
        deviceLabel(c.out_interface),
        c.application,
        c.host
      ])
  )
)

const totalDownload = computed(() =>
  filteredConnections.value.reduce((sum, c) => sum + c.download, 0)
)
const totalUpload = computed(() => filteredConnections.value.reduce((sum, c) => sum + c.upload, 0))

const pageSize = ref(10)
const { currentPage, paginatedItems } = useItemPagination(() => filteredConnections.value, {
  itemsPerPage: pageSize
})
watch(
  [filter, applicationFilter, protocolFilter, sourceFilter, destinationFilter, statusFilter],
  () => {
    currentPage.value = 1
  }
)

const hasFilters = computed(
  () =>
    !!filter.value ||
    [applicationFilter, protocolFilter, sourceFilter, destinationFilter, statusFilter].some(
      (selected) => selected.value.length > 0
    )
)

function resetFilters() {
  filter.value = ''
  applicationFilter.value = []
  protocolFilter.value = []
  sourceFilter.value = []
  destinationFilter.value = []
  statusFilter.value = []
}

// the reset button gets disabled, move focus to the text filter
function resetFiltersAndFocus() {
  resetFilters()
  connectionsFilterRef.value?.focus()
}

const formatTime = (timestamp: number) =>
  new Date(timestamp * 1000).toLocaleTimeString(locale.value, {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })

const DURATION_UNITS = [
  ['day', 86400],
  ['hour', 3600],
  ['minute', 60],
  ['second', 1]
] as const

// at most two units in the UI language, e.g. "2 ore 4 minuti" or "40 secondi"
const expiresIn = (seconds: number) => {
  const start = DURATION_UNITS.findIndex(([, size]) => seconds >= size)
  let rest = seconds
  return DURATION_UNITS.slice(start, start + 2)
    .map(([unit, size]) => {
      const value = Math.floor(rest / size)
      rest %= size
      return value
        ? new Intl.NumberFormat(locale.value, { style: 'unit', unit, unitDisplay: 'long' }).format(
            value
          )
        : ''
    })
    .filter(Boolean)
    .join(' ')
}
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

// result options are the shown labels, plus one for queries blocked by the DNS filter
const dnsBlocked = t('standalone.live_trace.blocked_by_dns_filter')
const dnsTypes = computed(() =>
  filterOptions(
    (data.value?.dns ?? []).map((q) => q.type),
    dnsTypeFilter.value
  )
)
const dnsResultOptions = computed(() =>
  filterOptions(
    (data.value?.dns ?? []).flatMap((q) => [dnsResult(q.result), q.filtered ? dnsBlocked : '']),
    dnsResultFilter.value
  )
)
const filteredDns = computed(() =>
  (data.value?.dns ?? []).filter(
    (q) =>
      matches(dnsTypeFilter.value, q.type) &&
      (matches(dnsResultFilter.value, dnsResult(q.result)) ||
        (q.filtered && matches(dnsResultFilter.value, dnsBlocked))) &&
      textMatch(
        [q.name, q.type, dnsResult(q.result), q.filtered ? dnsBlocked : '', ...(q.addresses ?? [])],
        dnsFilter.value
      )
  )
)
const dnsPageSize = ref(10)
const { currentPage: dnsPage, paginatedItems: paginatedDns } = useItemPagination(
  () => filteredDns.value,
  { itemsPerPage: dnsPageSize }
)
watch([dnsFilter, dnsTypeFilter, dnsResultFilter], () => {
  dnsPage.value = 1
})

const hasDnsFilters = computed(
  () => !!dnsFilter.value || dnsTypeFilter.value.length > 0 || dnsResultFilter.value.length > 0
)

function resetDnsFilters() {
  dnsFilter.value = ''
  dnsTypeFilter.value = []
  dnsResultFilter.value = []
}

// the reset button gets disabled, move focus to the text filter
function resetDnsFiltersAndFocus() {
  resetDnsFilters()
  dnsFilterRef.value?.focus()
}

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

const { data: firewallRules, error: firewallRulesError } = useQuery({
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
  ['common.name', rule.name],
  ['standalone.firewall_rules.action', rule.target],
  ['standalone.live_trace.source', ruleEndpoint(rule.src, rule.src_ip)],
  ['standalone.live_trace.destination', ruleEndpoint(rule.dest, rule.dest_ip)],
  ['standalone.firewall_rules.service', ruleService(rule)]
]

const ruleDrawerShown = ref(false)
const selectedRule = ref<FirewallRule>()
function showRule(rule: FirewallRule) {
  selectedRule.value = rule
  ruleDrawerShown.value = true
}

// pages that manage the blocks of the other layers
const layerPages: Record<string, { title: string; path: string }> = {
  threat_shield_ip: {
    title: 'standalone.threat_shield.title',
    path: 'security/threat-shield-ip?tab=blocklist'
  },
  dpi: { title: 'standalone.dpi.title', path: 'security/dpi?tab=rules' },
  dns_filter: {
    title: 'standalone.threat_shield_dns.title',
    path: 'security/threat-shield-dns?tab=blocklistSources'
  }
}

const goTo = (path: string) => router.push(`${getStandaloneRoutePrefix(route)}/${path}`)

// same split as the backend: no destination zone is input, no source zone is output
const ruleTab = (rule: FirewallRule) =>
  !rule.dest ? 'inputRules' : !rule.src ? 'outputRules' : 'forwardRules'

const tabLabel = (key: string, n: number) =>
  t('standalone.live_trace.tab_count', { name: t(key), n })

const resultsTab = ref('blocked')
const resultsTabs = computed(() => [
  {
    name: 'blocked',
    label: tabLabel('standalone.live_trace.blocked_traffic', blockedRows.value.length)
  },
  {
    name: 'connections',
    label: tabLabel('standalone.live_trace.connections', connections.value.length)
  },
  {
    name: 'dns',
    label: tabLabel('standalone.live_trace.dns_queries', data.value?.dns.length ?? 0)
  }
])

// a new session opens on its blocked traffic, filters and pages restart when a session starts or ends
watch(
  () => data.value?.running,
  (running, old) => {
    if (running && old === false) {
      resultsTab.value = 'blocked'
    }
    if (running != undefined && old != undefined && running != old) {
      resetFilters()
      resetDnsFilters()
      currentPage.value = 1
      dnsPage.value = 1
    }
  }
)

const attempts = (n: number) => t('standalone.live_trace.n_attempts', { n }, n)

// plain text summary, to paste in a ticket or a chat
function resultsText() {
  const status = data.value
  if (!status) return ''
  const minutes = Math.round(status.duration / 60)
  const duration = t('standalone.live_trace.minutes', { n: minutes }, minutes)
  return [
    t('standalone.live_trace.title'),
    t('standalone.live_trace.summary_client', { client: traceTarget.value }),
    status.running
      ? t('standalone.live_trace.summary_duration_running', { duration })
      : t('standalone.live_trace.summary_duration', { duration }),
    '',
    tabLabel('standalone.live_trace.blocked_traffic', blockedRows.value.length),
    ...blockedRows.value.map((item) =>
      t('standalone.live_trace.summary_blocked_line', {
        time: formatTime(item.last_seen),
        protocol: item.protocol.toUpperCase(),
        source: item.source || '-',
        destination: [
          endpoint(item.destination, item.destination_port),
          item.destination_name && `(${item.destination_name})`
        ]
          .filter(Boolean)
          .join(' '),
        blocked_by: [layerLabels[item.layer] ?? item.layer, blockedRule(item)]
          .filter(Boolean)
          .join(', '),
        attempts: attempts(item.count)
      })
    ),
    ...routeWarnings.value.map((item) =>
      t('standalone.live_trace.summary_warning_line', {
        protocol: item.protocol.toUpperCase(),
        source: item.source,
        destination: endpoint(item.destination, item.destination_port),
        attempts: attempts(item.count)
      })
    ),
    '',
    tabLabel('standalone.live_trace.connections', connections.value.length),
    ...connections.value.map((c) => {
      const interfaces = c.out_interface
        ? `${deviceLabel(c.in_interface)} -> ${deviceLabel(c.out_interface)}`
        : deviceLabel(c.in_interface)
      const label = connectionStatus(c)
      return t('standalone.live_trace.summary_connection_line', {
        protocol: c.protocol.toUpperCase(),
        source: endpoint(c.source, c.source_port),
        destination: [
          endpoint(c.destination, c.destination_port),
          c.destination_name && `(${c.destination_name})`
        ]
          .filter(Boolean)
          .join(' '),
        details: [
          label && statusLabel(label),
          c.application || c.dpi_protocol,
          interfaces,
          c.rule,
          byteFormat1024(totalBytes(c))
        ]
          .filter(Boolean)
          .join(', ')
      })
    }),
    '',
    tabLabel('standalone.live_trace.dns_queries', status.dns.length),
    ...status.dns.map((q) =>
      t('standalone.live_trace.summary_dns_line', {
        name: q.name,
        type: q.type,
        result:
          [dnsResult(q.result), q.filtered ? t('standalone.live_trace.summary_dns_blocked') : '']
            .filter(Boolean)
            .join(', ') + (q.addresses?.length ? ` -> ${q.addresses.join(', ')}` : ''),
        count: q.count
      })
    )
  ].join('\n')
}

// text shown below the copy button for a while after copying
const justCopied = ref(false)
let copiedTimer: ReturnType<typeof setTimeout> | undefined
async function copyResults() {
  try {
    await navigator.clipboard.writeText(resultsText())
  } catch {
    // clipboard unavailable (e.g. plain http) or denied
    return
  }
  justCopied.value = true
  announcement.value = t('standalone.live_trace.copied_to_clipboard')
  clearTimeout(copiedTimer)
  copiedTimer = setTimeout(() => (justCopied.value = false), 2000)
}
</script>

<template>
  <div class="space-y-8">
    <p class="sr-only" role="status">{{ announcement }}</p>
    <p class="max-w-2xl text-tertiary-neutral">
      {{ t('standalone.live_trace.description') }}
    </p>
    <NeInlineNotification
      v-if="error || actionError"
      kind="error"
      :title="errorTitle"
      :description="errorDescription"
    />
    <!-- configuration -->
    <!-- the card clips its content, the client list must show below it -->
    <NeCard
      class="overflow-visible!"
      :title="t('standalone.live_trace.session')"
      :loading="isPending"
      :skeleton-lines="3"
    >
      <form class="flex flex-wrap items-start gap-4 2xl:flex-nowrap" @submit.prevent="startTrace">
        <!-- remount once the leases arrive, so an ip set before them is not listed twice -->
        <NeCombobox
          ref="ipRef"
          :key="clientNames ? 'leases' : 'no-leases'"
          v-model="ip"
          class="w-full sm:max-w-xs xl:max-w-sm 2xl:min-w-40"
          :label="t('standalone.live_trace.client_ip')"
          :placeholder="t('standalone.live_trace.client_ip_placeholder')"
          :options="clientOptions"
          :invalid-message="t(validationBag.getFirstI18nKeyFor('ip'))"
          :disabled="formDisabled"
          accept-user-input
          :optional-label="t('common.optional')"
          :no-results-label="t('ne_combobox.no_results')"
          :limited-options-label="t('ne_combobox.limited_options_label')"
          :no-options-label="t('ne_combobox.no_options_label')"
          :selected-label="t('ne_combobox.selected')"
          :user-input-label="t('ne_combobox.user_input_label')"
        />
        <NeTextInput
          ref="portRef"
          v-model="port"
          class="w-full sm:w-40 2xl:min-w-24"
          inputmode="numeric"
          :label="t('common.port')"
          :placeholder="t('common.eg_value', { value: 443 })"
          :invalid-message="t(validationBag.getFirstI18nKeyFor('port'))"
          :disabled="formDisabled"
          optional
          :optional-label="t('common.optional')"
        />
        <NeListbox
          v-model="protocol"
          class="w-full sm:w-40 2xl:min-w-24"
          :label="t('standalone.live_trace.protocol')"
          :options="protocolOptions"
          :invalid-message="t(validationBag.getFirstI18nKeyFor('protocol'))"
          :disabled="formDisabled"
          :no-options-label="t('ne_dropdown_filter.no_options')"
          :optional-label="t('common.optional')"
        />
        <NeListbox
          v-model="duration"
          class="w-full sm:w-40 2xl:min-w-24"
          :label="t('standalone.live_trace.duration')"
          :options="durationOptions"
          :invalid-message="t(validationBag.getFirstI18nKeyFor('duration'))"
          :disabled="formDisabled"
          :no-options-label="t('ne_dropdown_filter.no_options')"
          :optional-label="t('common.optional')"
        />
        <NeButton
          v-if="data?.running"
          ref="stopButton"
          class="w-full shrink-0 sm:mt-8 sm:w-auto"
          kind="primary"
          size="lg"
          :disabled="stop.isPending.value"
          :loading="stop.isPending.value"
          @click="stop.mutate()"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faStop" aria-hidden="true" />
          </template>
          {{ t('standalone.live_trace.stop') }}
        </NeButton>
        <NeButton
          v-else
          ref="startButton"
          class="w-full shrink-0 sm:mt-8 sm:w-auto"
          kind="primary"
          size="lg"
          type="submit"
          :disabled="start.isPending.value"
          :loading="start.isPending.value"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faPlay" aria-hidden="true" />
          </template>
          {{ t('standalone.live_trace.start') }}
        </NeButton>
        <!-- on the controls row from 2xl, where the fields shrink to make room -->
        <div
          v-if="data?.running"
          class="flex w-full items-center gap-3 2xl:mt-8 2xl:ml-auto 2xl:min-h-9 2xl:w-auto 2xl:shrink-0 2xl:whitespace-nowrap"
        >
          <NeSpinner size="5" aria-hidden="true" />
          <p>
            <span class="font-medium">{{ t('standalone.live_trace.running') }}</span>
            <span class="ml-2 text-tertiary-neutral tabular-nums">
              {{ t('standalone.live_trace.time_remaining', { time: remaining, end: endsAtTime }) }}
            </span>
          </p>
        </div>
      </form>
      <p v-if="String(port).trim() || protocol != 'any'" class="mt-4 text-sm text-tertiary-neutral">
        {{ t('standalone.live_trace.filter_helper') }}
      </p>
    </NeCard>
    <!-- results -->
    <NeCard
      v-if="data && (hasResults || data.ip)"
      :title="
        hasResults && !data.running
          ? t('standalone.live_trace.last_session_results', { ip: traceTarget })
          : t('standalone.live_trace.results')
      "
    >
      <template v-if="hasResults" #topRight>
        <div class="relative">
          <NeButton kind="secondary" @click="copyResults">
            <template #prefix>
              <FontAwesomeIcon :icon="faCopy" class="size-4" aria-hidden="true" />
            </template>
            {{ t('standalone.live_trace.copy_results') }}
          </NeButton>
          <!-- absolute, so the card header does not grow -->
          <p
            v-if="justCopied"
            class="absolute top-full right-0 mt-2 text-sm whitespace-nowrap text-secondary-neutral"
          >
            {{ t('standalone.live_trace.copied_to_clipboard') }}
          </p>
        </div>
      </template>
      <NeEmptyState
        v-if="!hasResults"
        :title="t('standalone.live_trace.no_traffic_last_session')"
        :description="
          t('standalone.live_trace.no_traffic_last_session_description', { ip: traceTarget })
        "
        :icon="faEmptySet"
      />
      <div v-else class="space-y-6">
        <NeInlineNotification
          v-if="data.truncated"
          kind="warning"
          :title="t('standalone.live_trace.truncated')"
          :description="t('standalone.live_trace.truncated_description')"
        />
        <NeInlineNotification
          v-if="routeWarnings.length"
          kind="warning"
          :title="t('standalone.live_trace.private_to_wan')"
        >
          <template #description>
            <span v-for="item in routeWarnings" :key="blockedKey(item)" class="block">
              {{
                t('standalone.live_trace.private_to_wan_line', {
                  source: item.source,
                  destination: endpoint(item.destination, item.destination_port),
                  protocol: item.protocol.toUpperCase(),
                  attempts: attempts(item.count)
                })
              }}
            </span>
            <span class="block">{{ t('standalone.live_trace.private_to_wan_description') }}</span>
          </template>
        </NeInlineNotification>
        <NeTabs
          :selected="resultsTab"
          :sr-select-tab-label="t('ne_tabs.select_a_tab')"
          :sr-tabs-label="t('ne_tabs.tabs')"
          :tabs="resultsTabs"
          @select-tab="resultsTab = $event"
        />
        <!-- blocked traffic -->
        <section v-if="resultsTab == 'blocked'" class="space-y-4">
          <NeEmptyState
            v-if="blockedRows.length == 0"
            :title="
              data.running
                ? t('standalone.live_trace.no_blocked_traffic')
                : t('standalone.live_trace.no_blocked_traffic_last_session')
            "
            :description="
              data.running ? t('standalone.live_trace.no_blocked_traffic_description') : ''
            "
            :icon="faEmptySet"
          />
          <template v-else>
            <NeInlineNotification
              v-if="firewallRulesError"
              kind="error"
              :title="t('error.cannot_retrieve_firewall_rules')"
              :description="t(getAxiosErrorMessage(firewallRulesError))"
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
                <NeTableHeadCell>
                  <!-- no header for actions -->
                </NeTableHeadCell>
              </NeTableHead>
              <NeTableBody>
                <NeTableRow
                  v-for="item in blockedRows"
                  :key="blockedKey(item)"
                  :class="{ 'bg-indigo-50 dark:bg-indigo-950': isNewBlock(item) }"
                >
                  <NeTableCell :data-label="t('standalone.live_trace.last_seen')">
                    <span class="tabular-nums">{{ formatTime(item.last_seen) }}</span>
                  </NeTableCell>
                  <NeTableCell :data-label="t('standalone.live_trace.protocol')">
                    {{ item.protocol.toUpperCase() }}
                  </NeTableCell>
                  <NeTableCell :data-label="t('standalone.live_trace.source')">
                    <div class="whitespace-nowrap">
                      <p>{{ item.source || '-' }}</p>
                      <p v-if="clientName(item.source)" class="text-xs text-tertiary-neutral">
                        {{ clientName(item.source) }}
                      </p>
                    </div>
                  </NeTableCell>
                  <NeTableCell :data-label="t('standalone.live_trace.destination')">
                    <div class="whitespace-nowrap">
                      <p>{{ endpoint(item.destination, item.destination_port) }}</p>
                      <p v-if="item.destination_name" class="text-xs text-tertiary-neutral">
                        {{ item.destination_name }}
                      </p>
                    </div>
                  </NeTableCell>
                  <NeTableCell :data-label="t('standalone.live_trace.blocked_by')">
                    <div class="space-y-1">
                      <p class="flex items-center gap-2 font-medium">
                        <FontAwesomeIcon
                          :icon="faBan"
                          class="size-4 shrink-0 text-danger"
                          aria-hidden="true"
                        />
                        {{ layerLabels[item.layer] ?? item.layer }}
                      </p>
                      <p v-if="blockedRule(item)" class="font-medium">
                        {{ blockedRule(item) }}
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
                    <span class="whitespace-nowrap">
                      {{ deviceLabel(item.in_interface) || '-' }}
                      <template v-if="item.out_interface"
                        >&rarr; {{ deviceLabel(item.out_interface) }}</template
                      >
                    </span>
                  </NeTableCell>
                  <NeTableCell :data-label="t('standalone.live_trace.attempts')">
                    <span class="tabular-nums">{{ item.count }}</span>
                  </NeTableCell>
                  <!-- rows without actions have no actions cell in cards -->
                  <NeTableCell
                    :data-label="t('common.actions')"
                    :class="{ 'max-xl:hidden': !firewallRule(item) && !layerPages[item.layer] }"
                  >
                    <div class="-ml-2.5 flex items-center gap-2 xl:ml-0 xl:justify-end">
                      <NeButton
                        v-if="firewallRule(item)"
                        kind="tertiary"
                        @click="showRule(firewallRule(item)!)"
                      >
                        <template #prefix>
                          <FontAwesomeIcon :icon="faEye" class="size-4" aria-hidden="true" />
                        </template>
                        {{ t('standalone.live_trace.details') }}
                        <span class="sr-only">{{ firewallRule(item)!.name }}</span>
                      </NeButton>
                      <NeButton
                        v-else-if="layerPages[item.layer]"
                        kind="tertiary"
                        @click="goTo(layerPages[item.layer]!.path)"
                      >
                        <template #prefix>
                          <FontAwesomeIcon :icon="faArrowRight" class="size-4" aria-hidden="true" />
                        </template>
                        {{ t('common.go_to_page', { page: t(layerPages[item.layer]!.title) }) }}
                      </NeButton>
                    </div>
                  </NeTableCell>
                </NeTableRow>
              </NeTableBody>
            </NeTable>
          </template>
        </section>
        <!-- live connections, kept as shown last after the stop -->
        <section v-else-if="resultsTab == 'connections'" class="space-y-4">
          <div class="flex flex-wrap items-center gap-6">
            <div class="mr-auto flex flex-wrap items-center gap-4">
              <NeTextInput
                ref="connectionsFilterRef"
                v-model="filter"
                class="w-full sm:w-80"
                :placeholder="t('standalone.live_trace.filter_connections')"
                :aria-label="t('standalone.live_trace.filter_connections')"
                :clear-search-label="t('ne_dropdown_filter.clear_search')"
                is-search
              />
              <NeDropdownFilterV2
                v-model="applicationFilter"
                v-bind="dropdownProps"
                :label="t('standalone.live_trace.application')"
                :options="applications"
                :options-filter-placeholder="t('standalone.live_trace.filter_applications')"
              />
              <NeDropdownFilterV2
                v-model="protocolFilter"
                v-bind="dropdownProps"
                :label="t('standalone.live_trace.protocol')"
                :options="protocols"
                :options-filter-placeholder="t('standalone.live_trace.filter_protocols')"
              />
              <NeDropdownFilterV2
                v-model="sourceFilter"
                v-bind="dropdownProps"
                :label="t('standalone.live_trace.source')"
                :options="sourceIps"
                :options-filter-placeholder="t('standalone.live_trace.filter_sources')"
              />
              <NeDropdownFilterV2
                v-model="destinationFilter"
                v-bind="dropdownProps"
                :label="t('standalone.live_trace.destination')"
                :options="destinationIps"
                :options-filter-placeholder="t('standalone.live_trace.filter_destinations')"
              />
              <NeDropdownFilterV2
                v-model="statusFilter"
                v-bind="dropdownProps"
                :label="t('common.status')"
                :options="statuses"
                :options-filter-placeholder="t('standalone.live_trace.filter_statuses')"
              />
              <NeButton kind="tertiary" :disabled="!hasFilters" @click="resetFiltersAndFocus">
                {{ t('common.reset_filters') }}
              </NeButton>
            </div>
            <!-- fixed width values, so the labels do not move at each refresh -->
            <div class="flex gap-6 tabular-nums">
              <span class="text-tertiary-neutral">
                {{ t('common.download') }}
                <span class="ml-1 inline-block min-w-24 font-medium text-primary-neutral">{{
                  formatRate(totalDownload)
                }}</span>
              </span>
              <span class="text-tertiary-neutral">
                {{ t('common.upload') }}
                <span class="ml-1 inline-block min-w-24 font-medium text-primary-neutral">{{
                  formatRate(totalUpload)
                }}</span>
              </span>
            </div>
          </div>
          <NeEmptyState
            v-if="filteredConnections.length == 0"
            :title="
              hasFilters
                ? t('standalone.live_trace.no_connections_found')
                : t('standalone.live_trace.no_connections')
            "
            :description="hasFilters ? t('standalone.live_trace.try_changing_search_filters') : ''"
            :icon="hasFilters ? faMagnifyingGlass : faEmptySet"
          >
            <NeButton v-if="hasFilters" kind="tertiary" size="lg" @click="resetFiltersAndFocus">
              {{ t('common.reset_filters') }}
            </NeButton>
          </NeEmptyState>
          <NeTable v-else :aria-label="t('standalone.live_trace.connections')" card-breakpoint="xl">
            <NeTableHead>
              <NeTableHeadCell>{{ t('standalone.live_trace.protocol') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.source') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.destination') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.application') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.interfaces') }}</NeTableHeadCell>
              <NeTableHeadCell class="whitespace-nowrap">{{
                t('standalone.live_trace.download_rate')
              }}</NeTableHeadCell>
              <NeTableHeadCell class="whitespace-nowrap">{{
                t('standalone.live_trace.upload_rate')
              }}</NeTableHeadCell>
              <NeTableHeadCell class="whitespace-nowrap">{{
                t('standalone.live_trace.total_traffic')
              }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('common.status') }}</NeTableHeadCell>
            </NeTableHead>
            <NeTableBody>
              <NeTableRow v-for="item in paginatedItems" :key="item.id">
                <NeTableCell :data-label="t('standalone.live_trace.protocol')">
                  {{ item.protocol.toUpperCase() }}
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.source')">
                  <div class="whitespace-nowrap">
                    <p>{{ endpoint(item.source, item.source_port) }}</p>
                    <p v-if="clientName(item.source)" class="text-xs text-tertiary-neutral">
                      {{ clientName(item.source) }}
                    </p>
                    <p v-if="item.source_nat" class="text-xs text-tertiary-neutral">
                      {{
                        t('standalone.live_trace.translated_to', {
                          address: endpoint(item.source_nat, item.source_nat_port)
                        })
                      }}
                    </p>
                  </div>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.destination')">
                  <div class="whitespace-nowrap">
                    <p>{{ endpoint(item.destination, item.destination_port) }}</p>
                    <p v-if="item.destination_name" class="text-xs text-tertiary-neutral">
                      {{ item.destination_name }}
                    </p>
                    <p v-if="item.destination_nat" class="text-xs text-tertiary-neutral">
                      {{
                        t('standalone.live_trace.translated_to', {
                          address: endpoint(item.destination_nat, item.destination_nat_port)
                        })
                      }}
                    </p>
                  </div>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.application')">
                  <div>
                    <p>{{ item.application || item.dpi_protocol || '-' }}</p>
                    <p v-if="item.host" class="text-xs text-tertiary-neutral">
                      {{ item.host }}
                    </p>
                  </div>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.interfaces')">
                  <div v-if="item.in_interface || item.out_interface">
                    <p class="whitespace-nowrap">
                      {{ deviceLabel(item.in_interface) || '-' }}
                      <template v-if="item.out_interface"
                        >&rarr; {{ deviceLabel(item.out_interface) }}</template
                      >
                    </p>
                    <p v-if="item.rule" class="text-xs text-tertiary-neutral">
                      {{ item.rule }}
                    </p>
                  </div>
                  <span v-else class="text-tertiary-neutral">
                    {{ t('standalone.live_trace.not_traced') }}
                  </span>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.download_rate')">
                  <span class="tabular-nums">{{ formatRate(item.download) }}</span>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.upload_rate')">
                  <span class="tabular-nums">{{ formatRate(item.upload) }}</span>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.total_traffic')">
                  <span class="tabular-nums">{{ byteFormat1024(totalBytes(item)) }}</span>
                </NeTableCell>
                <NeTableCell :data-label="t('common.status')">
                  <div>
                    <p
                      v-if="connectionStatus(item)"
                      class="flex items-center gap-2 whitespace-nowrap"
                    >
                      <FontAwesomeIcon
                        v-if="connectionStatus(item) == 'netify-blocked'"
                        :icon="faBan"
                        class="size-4 shrink-0 text-danger"
                        aria-hidden="true"
                      />
                      <FontAwesomeIcon
                        v-else-if="connectionStatus(item) == 'unreplied'"
                        :icon="faTriangleExclamation"
                        class="size-4 shrink-0 text-amber-700 dark:text-amber-500"
                        aria-hidden="true"
                      />
                      {{ statusLabel(connectionStatus(item)) }}
                    </p>
                    <p v-else>-</p>
                    <p
                      v-if="Number(item.timeout) > 0"
                      class="text-xs text-tertiary-neutral tabular-nums"
                    >
                      {{
                        t('standalone.live_trace.expires_in', {
                          time: expiresIn(Number(item.timeout))
                        })
                      }}
                    </p>
                  </div>
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
        </section>
        <!-- dns queries -->
        <section v-else class="space-y-4">
          <NeEmptyState
            v-if="data.dns.length == 0"
            :title="
              data.running
                ? t('standalone.live_trace.no_dns')
                : t('standalone.live_trace.no_dns_last_session')
            "
            :icon="faEmptySet"
          />
          <div v-else class="flex flex-wrap items-center gap-4">
            <NeTextInput
              ref="dnsFilterRef"
              v-model="dnsFilter"
              class="w-full sm:w-80"
              :placeholder="t('standalone.live_trace.filter_dns_queries')"
              :aria-label="t('standalone.live_trace.filter_dns_queries')"
              :clear-search-label="t('ne_dropdown_filter.clear_search')"
              is-search
            />
            <NeDropdownFilterV2
              v-model="dnsTypeFilter"
              v-bind="dropdownProps"
              :label="t('common.type')"
              :options="dnsTypes"
              :options-filter-placeholder="t('standalone.live_trace.filter_types')"
            />
            <NeDropdownFilterV2
              v-model="dnsResultFilter"
              v-bind="dropdownProps"
              :label="t('standalone.live_trace.result')"
              :options="dnsResultOptions"
              :options-filter-placeholder="t('standalone.live_trace.filter_results')"
            />
            <NeButton kind="tertiary" :disabled="!hasDnsFilters" @click="resetDnsFiltersAndFocus">
              {{ t('common.reset_filters') }}
            </NeButton>
          </div>
          <NeEmptyState
            v-if="data.dns.length && filteredDns.length == 0"
            :title="t('standalone.live_trace.no_dns_found')"
            :description="t('standalone.live_trace.try_changing_search_filters')"
            :icon="faMagnifyingGlass"
          >
            <NeButton kind="tertiary" size="lg" @click="resetDnsFiltersAndFocus">
              {{ t('common.reset_filters') }}
            </NeButton>
          </NeEmptyState>
          <NeTable
            v-else-if="data.dns.length"
            :aria-label="t('standalone.live_trace.dns_queries')"
            card-breakpoint="xl"
          >
            <NeTableHead>
              <NeTableHeadCell>{{ t('common.name') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('common.type') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.result') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.addresses') }}</NeTableHeadCell>
              <NeTableHeadCell>{{ t('standalone.live_trace.count') }}</NeTableHeadCell>
            </NeTableHead>
            <NeTableBody>
              <NeTableRow v-for="item in paginatedDns" :key="`${item.name} ${item.type}`">
                <NeTableCell :data-label="t('common.name')">
                  {{ item.name }}
                </NeTableCell>
                <NeTableCell :data-label="t('common.type')">
                  {{ item.type }}
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.result')">
                  <span class="flex flex-wrap items-center gap-x-4 gap-y-1">
                    {{ dnsResult(item.result) }}
                    <span v-if="item.filtered" class="flex items-center gap-2">
                      <FontAwesomeIcon
                        :icon="faBan"
                        class="size-4 shrink-0 text-danger"
                        aria-hidden="true"
                      />
                      {{ t('standalone.live_trace.blocked_by_dns_filter') }}
                    </span>
                  </span>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.addresses')">
                  <span v-if="item.addresses?.length" class="flex flex-wrap items-center gap-x-2">
                    {{ item.addresses.slice(0, 2).join(', ') }}
                    <NeTooltip
                      v-if="item.addresses.length > 2"
                      interactive
                      placement="bottom"
                      trigger-event="mouseenter focus"
                    >
                      <template #trigger>
                        <NeButton size="sm" kind="tertiary" class="-mx-2">
                          {{
                            t('standalone.live_trace.plus_n_more', {
                              n: item.addresses.length - 2
                            })
                          }}
                        </NeButton>
                      </template>
                      <template #content>
                        <p v-for="address in item.addresses.slice(2)" :key="address">
                          {{ address }}
                        </p>
                      </template>
                    </NeTooltip>
                  </span>
                  <template v-else>-</template>
                </NeTableCell>
                <NeTableCell :data-label="t('standalone.live_trace.count')">
                  <span class="tabular-nums">{{ item.count }}</span>
                </NeTableCell>
              </NeTableRow>
            </NeTableBody>
            <template #paginator>
              <NePaginator
                :current-page="dnsPage"
                :total-rows="filteredDns.length"
                :page-size="dnsPageSize"
                :nav-pagination-label="t('ne_table.pagination')"
                :next-label="t('ne_table.go_to_next_page')"
                :previous-label="t('ne_table.go_to_previous_page')"
                :range-of-total-label="t('ne_table.of')"
                :page-size-label="t('ne_table.show')"
                @select-page="(page: number) => (dnsPage = page)"
                @select-page-size="(size: number) => (dnsPageSize = size)"
              />
            </template>
          </NeTable>
        </section>
      </div>
    </NeCard>
    <NeSideDrawer
      :is-shown="ruleDrawerShown"
      :title="t('standalone.live_trace.rule_details')"
      :close-aria-label="t('common.shell.close_side_drawer')"
      close-on-click-outside
      @close="ruleDrawerShown = false"
    >
      <div v-if="selectedRule" class="space-y-6">
        <dl class="divide-y divide-gray-200 text-sm dark:divide-gray-700">
          <div
            v-for="[label, value] in ruleDetails(selectedRule)"
            :key="label"
            class="flex items-center justify-between gap-6 py-4 first:pt-0"
          >
            <dt class="shrink-0 font-medium text-primary-neutral">{{ t(label) }}</dt>
            <dd class="text-right text-tertiary-neutral">{{ value }}</dd>
          </div>
          <div class="flex items-center justify-between gap-6 pt-4">
            <dt class="shrink-0 font-medium text-primary-neutral">{{ t('common.status') }}</dt>
            <dd class="flex items-center gap-2 text-tertiary-neutral">
              <FontAwesomeIcon
                :icon="selectedRule.enabled ? faCircleCheck : faCircleXmark"
                :class="['size-4', selectedRule.enabled ? 'text-enabled' : 'text-disabled']"
                aria-hidden="true"
              />
              {{ selectedRule.enabled ? t('common.enabled') : t('common.disabled') }}
            </dd>
          </div>
        </dl>
        <hr />
        <div class="flex justify-end">
          <NeButton
            kind="tertiary"
            class="mr-4"
            @click="goTo(`firewall/rules?tab=${ruleTab(selectedRule)}`)"
          >
            <template #prefix>
              <FontAwesomeIcon :icon="faArrowRight" class="size-4" aria-hidden="true" />
            </template>
            {{ t('common.go_to_page', { page: t('standalone.firewall_rules.title') }) }}
          </NeButton>
          <NeButton kind="primary" @click="ruleDrawerShown = false">
            {{ t('common.close') }}
          </NeButton>
        </div>
      </div>
    </NeSideDrawer>
  </div>
</template>
