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
  '.type': 'globals' | 'interface' | 'route'
}

/**
 * Global response configuration.
 */
interface GlobalsResponse extends GenericValueResponse {}

/**
 * Interface response.
 */
interface IFaceResponse extends GenericValueResponse {
  //count: string
}

/**
 * Route response.
 */
interface RouteResponse extends GenericValueResponse {
  //dest_ip: string
}

/**
 * Parsed response for interface.
 */
export interface IFace {
  name: string
}

/**
 * Parsed routes, only name is needed.
 */
export interface Route {
  name: string
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
export function useRoutesConfig() {
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
  /*function baseFilter<T extends GenericValueResponse>(
    type: GenericValueResponse['.type']
  ): Array<T> {
    return Object.values(data.value?.values ?? [])
      .filter((value) => value['.type'] == type)
      .sort(genericValueComparator)
      .map((value) => value as T)
  }*/

  const globals = computed<Array<GlobalsResponse>>(() => {
    //return baseFilter<GlobalsResponse>('globals')
  })

  const interfaces = computed<Array<IFace>>(() => {
    /*return baseFilter<IFaceResponse>('interface').map((value) => {
      return {
        name: value['.name']
      }
    })*/
  })

  const routes = computed<Array<Route>>(() => {
    /*return baseFilter<RouteResponse>('Route').map((value) => {
      return {
        name: value['.name']
      }
    })*/

    return []
  })

  /**
   * Fetches the data from the API, and sets the reactive values.
   */
  const fetch = function () {
    ubusCall('ns.routes', 'list-routes', {
      protocol: 'ipv4'
    })
      .then((response: AxiosResponse<Response>) => {
        console.log(response.data)
        return (data.value = response.data)}
      )
      .catch((exception: AxiosError) => (error.value = exception))
      .finally(() => (loading.value = false))
  }

  onMounted(() => {
    loading.value = true
    fetch()
  })

  return { data, error, loading, globals, interfaces, routes, fetch }
}
