import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

/**
 * Wrapper for ZoneResponse.
 */
interface BaseResponse<T> {
  [confName: string]: T
}

/**
 * Api Response for 'firewall'.'zone'.
 */
interface ZoneResponse {
  name: string
  network?: Array<string>
  masq?: boolean
  masq6?: boolean
  //masq_src
  //masq_dest
  masq_allow_invalid?: boolean
  mtu_fix?: boolean
  input?: string
  forward?: string
  output?: string
  family?: string
  log?: number
  log_limit?: string
  device?: Array<string>
  subnet?: Array<string>
  extra?: string
  extra_src?: string
  extra_dest?: string
  custom_chains?: boolean
  // helper
  forwardings?: BaseResponse<ZoneResponse>
}

interface ForwardingResponse {
  name?: string
  src: string
  dest: string
  family?: string
  enabled?: boolean
  ipset?: string
}

/**
 * Different policies for traffic flow, they have additional string values for localization.
 */
export enum TrafficPolicy {
  ACCEPT = 'accept',
  REJECT = 'reject',
  DROP = 'drop'
}

/**
 * Possible zone types.
 */
export enum ZoneType {
  LAN,
  WAN,
  GUEST,
  CUSTOM
}

export class InvalidConfigurationError extends Error {
  constructor() {
    super('Invalid configuration loaded from API, have you manually edited the configs?')
  }
}

/**
 * Zone is a factory class that parses the response given by api.
 */
export class Zone {
  public readonly confName: string
  public readonly name: string
  public readonly input: TrafficPolicy
  public readonly output: TrafficPolicy
  public readonly forward: TrafficPolicy
  public readonly interfaces: Array<string> = []
  public readonly logging: boolean = false
  public readonly forwardings: Array<Zone> = []

  constructor(configName: string, zoneResponse: ZoneResponse) {
    this.confName = configName
    this.name = zoneResponse.name
    this.input = Zone.trafficPolicyParser(zoneResponse.input ?? 'DROP')
    this.output = Zone.trafficPolicyParser(zoneResponse.output ?? 'DROP')
    this.forward = Zone.trafficPolicyParser(zoneResponse.forward ?? 'DROP')
    this.interfaces = zoneResponse.network ?? []
    this.logging = Boolean(zoneResponse.log ?? 0)
    this.forwardings = Object.entries(zoneResponse.forwardings ?? []).map(
      ([name, zoneResponse]) => new Zone(name, zoneResponse)
    )
  }

  public type(): ZoneType {
    switch (this.name.toUpperCase()) {
      case 'WAN':
        return ZoneType.WAN
      case 'LAN':
        return ZoneType.LAN
      case 'GUESTS':
        return ZoneType.GUEST
      default:
        return ZoneType.CUSTOM
    }
  }

  private static trafficPolicyParser(policy: string): TrafficPolicy {
    switch (policy) {
      case 'ACCEPT':
        return TrafficPolicy.ACCEPT
      case 'REJECT':
        return TrafficPolicy.REJECT
      case 'DROP':
        return TrafficPolicy.DROP
      default:
        throw new InvalidConfigurationError()
    }
  }
}

export class Forwarding {
  public readonly name: string
  public readonly label?: string
  public readonly source: string
  public readonly destination: string
  public readonly protocolFamily: string
  public readonly enabled: boolean
  public readonly ipSet?: string

  constructor(name: string, forwardingResponse: ForwardingResponse) {
    this.name = name
    this.label = forwardingResponse.name
    this.source = forwardingResponse.src
    this.destination = forwardingResponse.dest
    this.protocolFamily = forwardingResponse.family ?? 'any'
    this.enabled = forwardingResponse.enabled ?? true
    this.ipSet = forwardingResponse.ipset
  }
}

export const useFirewallStore = defineStore('firewall', () => {
  const error = ref<Error>()
  const zones = ref<Array<Zone>>([])
  const forwardings = ref<Array<Forwarding>>([])
  const loading = ref(true)

  function fetch() {
    Promise.all([
      ubusCall('ns.firewall', 'list_zones').then(
        (response: AxiosResponse<BaseResponse<ZoneResponse>>) => {
          zones.value = Object.entries(response.data).map(
            ([name, zoneResponse]) => new Zone(name, zoneResponse)
          )
        }
      ),
      ubusCall('ns.firewall', 'list_forwardings').then(
        (response: AxiosResponse<BaseResponse<ForwardingResponse>>) => {
          forwardings.value = Object.entries(response.data).map(
            ([name, forwardingResponse]) => new Forwarding(name, forwardingResponse)
          )
        }
      )
    ])
      .catch((exception: Error) => (error.value = exception))
      .then(() => (loading.value = false))
  }

  return { loading, error, zones, forwardings, fetch }
})
