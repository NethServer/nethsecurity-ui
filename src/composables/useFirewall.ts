import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'
import { onBeforeMount, ref } from 'vue'

/**
 * Root response of `uci get config firewall`
 */
interface FirewallResponse {
  values: {
    [name: string]: BaseObjectResponse
  }
}

/**
 * Every response in `values` have this base fields.
 */
interface BaseObjectResponse {
  '.anonymous': boolean
  '.index': number
  '.name': string
  '.type': 'zone' | 'forwarding'
}

/**
 * Zone fields in response.
 */
interface ZoneResponse extends BaseObjectResponse {
  '.type': 'zone'
  name: string
  input: string
  forward: string
  output: string
  log: number
  network: Array<string>
}

/**
 * Forward fields in response.
 */
interface ForwardResponse extends BaseObjectResponse {
  '.type': 'forwarding'
  dest: string
  src: string
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

/**
 * Zone is a factory class that parses the response given by api.
 */
export class Zone {
  private constructor(
    public readonly name: string,
    public readonly label: string,
    public readonly input: TrafficPolicy,
    public readonly output: TrafficPolicy,
    public readonly forward: TrafficPolicy,
    public readonly interfaces: Array<string>,
    public readonly logging: boolean
  ) {}

  public type(): ZoneType {
    switch (this.name) {
      case 'ns_wan':
        return ZoneType.WAN
      case 'ns_lan':
        return ZoneType.LAN
      case 'ns_guests':
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
        throw new Error(`No policy could be parsed with "${policy}".`)
    }
  }

  /**
   * Factory method that produces a Zone class, beware of the difference between
   * @param apiResponse
   */
  static factory(apiResponse: ZoneResponse): Zone {
    return new Zone(
      apiResponse['.name'],
      apiResponse.name,
      this.trafficPolicyParser(apiResponse.input),
      this.trafficPolicyParser(apiResponse.output),
      this.trafficPolicyParser(apiResponse.forward),
      apiResponse.network,
      Boolean(apiResponse.log)
    )
  }
}

export class Forward {
  private constructor(public readonly source: Zone, public readonly destination: Zone) {}

  static factory(apiResponse: ForwardResponse, zones: Array<Zone>): Forward {
    return new Forward(
      zones.find((item) => item.label == apiResponse.src)!,
      zones.find((item) => item.label == apiResponse.dest)!
    )
  }
}

export function useFirewall() {
  const loading = ref(false)
  const error = ref<Error>()

  const zones = ref<Array<Zone>>([])
  const forwards = ref<Array<Forward>>([])

  function fetch() {
    ubusCall('uci', 'get', {
      config: 'firewall'
    })
      .then((response: AxiosResponse<FirewallResponse>) => {
        // Zone Parser
        zones.value = Object.values(response.data.values)
          .filter((item: BaseObjectResponse) => item['.type'] == 'zone')
          .map((item) => item as ZoneResponse)
          .map((zone) => Zone.factory(zone))
        // Forward Parser
        forwards.value = Object.values(response.data.values)
          .filter((item: BaseObjectResponse) => item['.type'] == 'forwarding')
          .map((item) => item as ForwardResponse)
          .map((forward) => Forward.factory(forward, zones.value))
      })
      .catch((exception: Error) => (error.value = exception))
      .finally(() => (loading.value = false))
  }

  onBeforeMount(() => {
    loading.value = true
    fetch()
  })

  return { loading, error, zones, forwards }
}
