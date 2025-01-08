//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

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
  log?: string
  log_limit?: string
  device?: Array<string>
  subnet?: Array<string>
  extra?: string
  extra_src?: string
  extra_dest?: string
  custom_chains?: boolean
  // helper
}

interface ForwardingResponse {
  name?: string
  src: string
  dest: string
  family?: string
  enabled?: boolean
  ipset?: string
}

export type FirewallRuleAction = 'DROP' | 'REJECT' | 'ACCEPT'
export type NatRuleAction = 'SNAT' | 'MASQUERADE' | 'ACCEPT'

export interface FirewallRule {
  id?: string // rule id
  name: string // rule name
  src?: string // source zone
  src_ip?: string[] | RuleHost[] // source addresses
  ns_src?: string // source address object
  dest?: string // destination zone
  dest_ip?: string[] | RuleHost[] // destination addresses
  ns_dst?: string // destination address object
  proto: string[] // service protocols
  dest_port: string[] // service ports
  target: FirewallRuleAction // 'DROP' | 'REJECT' | 'ACCEPT'
  ns_service: string // service name or '*' or 'custom'
  enabled: boolean // rule enabled
  log: boolean // logging
  ns_tag: string[] // tags
  add_to_top: boolean // add rule to top?
  system_rule: boolean // system rule?
  active_zone?: boolean // zone exists?
}

export interface NatRule {
  id?: string
  name: string
  src: string
  src_ip: string
  dest_ip: string
  target: NatRuleAction
  snat_ip?: string
}

export interface NetmapRule {
  id?: string
  name: string
  src: string
  dest: string
  device_in: string[]
  device_out: string[]
  map_from: string
  map_to: string
}

export interface NetmapDevice {
  device: string
  interface?: string
}

export type NetmapType = 'src' | 'dest'

export interface NatHelper {
  name: string
  enabled: boolean
  loaded: boolean
  params?: Record<string, string>
}

export interface RuleService {
  id: string
  proto: string[]
  port: number | string
}

export interface RuleHost {
  value: string
  label: string
  type: string
}

export type RuleType = 'forward' | 'input' | 'output'

/**
 * Different policies for traffic flow, they have additional string values for localization.
 */
export enum TrafficPolicy {
  ACCEPT = 'accept',
  REJECT = 'reject',
  DROP = 'drop'
}

export enum SpecialZones {
  GUEST = 'guest',
  LAN = 'lan',
  WAN = 'wan',
  DMZ = 'dmz',
  HOTSPOT = 'hotspot',
  OPENVPN = 'openvpn',
  RWOPENVPN = 'rwopenvpn',
  IPSEC = 'ipsec'
}

/**
 * Possible zone types.
 */
export enum ZoneType {
  LAN,
  WAN,
  GUEST,
  DMZ,
  HOTSPOT,
  OPENVPN,
  RWOPENVPN,
  IPSEC,
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
  public readonly configName: string
  public readonly name: string
  public readonly input: TrafficPolicy
  public readonly output: TrafficPolicy
  public readonly forward: TrafficPolicy
  public readonly interfaces: Array<string> = []
  public readonly logging: boolean = false

  constructor(configName: string, zoneResponse: ZoneResponse) {
    this.configName = configName
    this.name = zoneResponse.name
    this.input = Zone.trafficPolicyParser(zoneResponse.input ?? 'DROP')
    this.output = Zone.trafficPolicyParser(zoneResponse.output ?? 'DROP')
    this.forward = Zone.trafficPolicyParser(zoneResponse.forward ?? 'DROP')
    this.interfaces = zoneResponse.network ?? []
    this.logging = zoneResponse.log === '1'
  }

  public type(): ZoneType {
    switch (this.name.toUpperCase()) {
      case 'WAN':
        return ZoneType.WAN
      case 'LAN':
        return ZoneType.LAN
      case 'GUEST':
        return ZoneType.GUEST
      case 'DMZ':
        return ZoneType.DMZ
      case 'HOTSPOT':
        return ZoneType.HOTSPOT
      case 'OPENVPN':
        return ZoneType.OPENVPN
      case 'RWOPENVPN':
        return ZoneType.RWOPENVPN
      case 'IPSEC':
        return ZoneType.IPSEC
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

export const zonesSorting = (zone1: any, zone2: any) => {
  const zonesRanking = ['lan', 'wan', 'guest', 'dmz', 'hotspot', 'openvpn', 'rwopenvpn', 'ipsec']
  let rank1 = zonesRanking.indexOf(zone1.name)
  let rank2 = zonesRanking.indexOf(zone2.name)

  if (rank1 == -1) {
    rank1 = 99
  }

  if (rank2 == -1) {
    rank2 = 99
  }

  if (rank1 < rank2) {
    return -1
  }
  if (rank1 > rank2) {
    return 1
  }
  return 0
}

export const useFirewallStore = defineStore('firewall', () => {
  const error = ref<Error>()
  const zones = ref<Array<Zone>>([])
  const forwardings = ref<Array<Forwarding>>([])
  const zonesWithoutAliases = ref<Array<Zone>>([])
  const loading = ref(true)

  function fetch() {
    Promise.all([
      ubusCall('ns.firewall', 'list_zones').then(
        (response: AxiosResponse<BaseResponse<ZoneResponse>>) => {
          zones.value = Object.entries(response.data)
            .map(([name, zoneResponse]) => new Zone(name, zoneResponse))
            .sort(zonesSorting)
        }
      ),
      ubusCall('ns.firewall', 'list_forwardings').then(
        (response: AxiosResponse<BaseResponse<ForwardingResponse>>) => {
          forwardings.value = Object.entries(response.data).map(
            ([name, forwardingResponse]) => new Forwarding(name, forwardingResponse)
          )
        }
      ),
      ubusCall('ns.firewall', 'list_zones_no_aliases').then(
        (response: AxiosResponse<BaseResponse<ZoneResponse>>) => {
          zonesWithoutAliases.value = Object.entries(response.data)
            .map(([name, zoneResponse]) => new Zone(name, zoneResponse))
            .sort(zonesSorting)
        }
      )
    ])
      .catch((exception: Error) => (error.value = exception))
      .then(() => (loading.value = false))
  }

  return { loading, error, zones, forwardings, zonesWithoutAliases, fetch }
})
