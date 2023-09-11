//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError, AxiosResponse } from 'axios'
import { computed, onMounted, ref } from 'vue'

/**
 * Interface for the root of the response.
 */
interface Response {
  values: {
    [name: string]: GenericValueResponse
  }
}

/**
 * Every value inside the response must have this fields.
 */
interface GenericValueResponse {
  '.anonymous': boolean
  '.index': number
  '.name': string
  '.type': 'globals' | 'interface' | 'member' | 'policy' | 'rule'
}

/**
 * Global response configuration.
 */
interface GlobalsResponse extends GenericValueResponse {}

/**
 * Interface response.
 */
interface IFaceResponse extends GenericValueResponse {
  count: string
  down: string
  enabled: string
  failure_interval: string
  family: string
  initial_state: string
  interval: string
  max_ttl: string
  recovery_interval: string
  reliability: string
  size: string
  timeout: string
  track_ip: Array<string>
  track_method: string
  up: string
}

/**
 * Member response.
 */
interface MemberResponse extends GenericValueResponse {
  interface: string
  metric: string
  weight: string
}

/**
 * Policy response.
 */
interface PolicyResponse extends GenericValueResponse {
  dest_ip: string
  last_resort: string
  proto: string
  src_ip: string
  sticky: string
  use_member: Array<string>
  use_policy: string
}

/**
 * Rule response.
 */
interface RuleResponse extends GenericValueResponse {
  dest_ip: string
  dest_port?: string
  proto: string
  src_ip: string
  sticky: string
  use_policy: string
}

/**
 * Parsed response for interface.
 */
export interface IFace {
  name: string
}

/**
 * Parsed members, in addition of the fields that are configured, contains interface object.
 */
export interface Member {
  name: string
  weight: number
  metric: number
  interface: IFace
}

/**
 * Parsed policies, only name is needed, array of members are set for ease of use.
 */
export interface Policy {
  name: string
  members: Array<Member>
}

/**
 * Parsed rules, referred policy is set for ease of use.
 */
export interface Rule {
  key: number
  name: string
  source: string
  destination: string
  destinationPort: string
  protocol: string
  sticky: string
  policy: Policy
}

/**
 * Comparator for GenericValueResponse interface.
 */
export function genericValueComparator(a: GenericValueResponse, b: GenericValueResponse): number {
  return a['.index'] - b['.index']
}

/**
 * Allows the usage of the calls to get the mwan3 configuration.
 */
export function useMwanConfig() {
  /**
   * Data got directly from the API.
   */
  const data = ref<Response>()
  /**
   * Axios error, if any.
   */
  const error = ref<Error>()
  /**
   * Loading state.
   */
  const loading = ref(false)

  /**
   * Utility function that does the base filtering and sorting.
   * @param type due to language limitation, additional field is needed to filter correct values
   */
  function baseFilter<T extends GenericValueResponse>(
    type: GenericValueResponse['.type']
  ): Array<T> {
    return Object.values(data.value?.values ?? [])
      .filter((value) => value['.type'] == type)
      .sort(genericValueComparator)
      .map((value) => value as T)
  }

  const globals = computed<Array<GlobalsResponse>>(() => {
    return baseFilter<GlobalsResponse>('globals')
  })

  const interfaces = computed<Array<IFace>>(() => {
    return baseFilter<IFaceResponse>('interface').map((value) => {
      return {
        name: value['.name']
      }
    })
  })

  const members = computed<Array<Member>>(() => {
    return baseFilter<MemberResponse>('member').map((value) => {
      return {
        name: value['.name'],
        weight: Number(value.weight),
        metric: Number(value.metric),
        interface: interfaces.value.filter((iface) => iface.name == value.interface)[0]
      }
    })
  })

  const policies = computed<Array<Policy>>(() => {
    return baseFilter<PolicyResponse>('policy').map((value) => {
      return {
        name: value['.name'],
        members: members.value.filter((member) => value.use_member.includes(member.name))
      }
    })
  })

  const rules = computed<Array<Rule>>(() => {
    return baseFilter<RuleResponse>('rule').map((value) => {
      return {
        key: value['.index'],
        name: value['.name'],
        source: value.src_ip,
        destination: value.dest_ip,
        destinationPort: value.dest_port ?? '',
        protocol: value.proto,
        sticky: value.sticky,
        policy: policies.value.filter((policy) => policy.name == value.use_policy)[0]
      }
    })
  })

  /**
   * Fetches the data from the API, and sets the reactive values.
   */
  const fetch = function () {
    ubusCall('uci', 'get', {
      config: 'mwan3'
    })
      .then((response: AxiosResponse<Response>) => (data.value = response.data))
      .catch((exception: AxiosError) => (error.value = exception))
      .finally(() => (loading.value = false))
  }

  onMounted(() => {
    loading.value = true
    fetch()
  })

  return { data, error, loading, globals, interfaces, members, policies, rules, fetch }
}
