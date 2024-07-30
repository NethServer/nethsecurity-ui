import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import type { IpVersion } from '@/composables/useObjects'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosResponse } from 'axios'

export type NsObject = {
  id: string
  name: string
  family?: IpVersion
  used?: boolean
  matches?: string[]
}

export type HostSet = NsObject & {
  ipaddr: string[]
  singleton: boolean
  subtype: string
  children?: HostSet[]
}

export type DomainSet = NsObject & {
  domain: string[]
  timeout: string
}

export const useObjectStore = defineStore('objects', () => {
  const loading = ref(true)
  const hostSets = ref<HostSet[]>([])
  const domainSets = ref<DomainSet[]>([])
  const error = ref<Error>()

  /**
   * Load the data from the backend
   */
  function load() {
    loading.value = true
    Promise.all([
      // fetch host sets
      ubusCall('ns.objects', 'list-hosts').then((res: AxiosResponse<{ values: HostSet[] }>) => {
        hostSets.value = res.data.values.map((hostSet) => {
          return {
            ...hostSet,
            children: hostSet.ipaddr
              .filter((addr) => res.data.values.findIndex((hostSet) => hostSet.id == addr) != -1)
              .map((addr) => {
                return res.data.values.find((hostSet) => hostSet.id == addr) as HostSet
              })
          }
        })
      }),
      // fetch domain sets
      ubusCall('ns.objects', 'list-domain-sets').then(
        (res: AxiosResponse<{ values: DomainSet[] }>) => {
          domainSets.value = res.data.values
        }
      )
    ])
      .catch((err) => {
        error.value = err
      })
      .then(() => {
        loading.value = false
      })
  }

  const objects = computed<Array<HostSet | DomainSet>>(() => {
    return [...hostSets.value, ...domainSets.value]
  })

  // loading objects on store usage
  load()

  return { loading, load, hostSets, error, objects }
})
