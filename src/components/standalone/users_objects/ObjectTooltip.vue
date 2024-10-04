<script lang="ts" setup>
import { type DomainSet, type HostSet, useObjectStore } from '@/stores/standalone/objects'
import { computed } from 'vue'
import { NeLink, NeTooltip } from '@nethesis/vue-components'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import {
  faAddressCard,
  faArrowsLeftRightToLine,
  faBoxArchive,
  faCircleQuestion,
  faCloud,
  faDesktop,
  faGlobe,
  faNetworkWired
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps<{
  objectId: string
}>()

const objects = useObjectStore()

const object = computed<HostSet | DomainSet | undefined>(() => {
  return objects.objects.find((o) => o.id === props.objectId)
})

const multipleEntries = computed<Boolean>(() => {
  if (object.value) {
    if (isHostSet(object.value)) {
      return object.value.ipaddr.length + object.value.children!.length > 1
    } else {
      return object.value.domain.length > 1
    }
  } else {
    return false
  }
})

const icon = computed<IconDefinition | undefined>(() => {
  if (object.value) {
    if (isHostSet(object.value)) {
      switch (object.value.subtype) {
        case 'host':
        case 'dns_record':
          return faDesktop
        case 'cidr':
          return faNetworkWired
        case 'range':
          return faArrowsLeftRightToLine
        case 'dhcp_static_lease':
          return faAddressCard
        case 'host_set':
          return faBoxArchive
        case 'vpn_user':
          return faGlobe
        case 'domain_set':
          return faCloud
        default:
          return faCircleQuestion
      }
    } else {
      return faCloud
    }
  } else {
    return undefined
  }
})

/**
 * Type guard needed for type checking, don't ask why `instanceof` doesn't work.
 * @param object
 * @link https://www.typescriptlang.org/docs/handbook/2/narrowing.html#using-type-predicates
 */
function isHostSet(object: HostSet | DomainSet): object is HostSet {
  return 'ipaddr' in object
}
</script>

<template>
  <template v-if="object">
    <NeTooltip class="shrink-0" placement="top">
      <template #trigger>
        <NeLink class="flex items-center gap-1.5">
          <FontAwesomeIcon v-if="icon" :icon="icon" aria-hidden="true" class="h-4 w-4" />
          {{ object.name }}
        </NeLink>
      </template>
      <template #content>
        <template v-if="isHostSet(object)">
          <ul class="space-y-1" :class="{ 'list-inside list-disc': multipleEntries }">
            <li v-for="ipaddr in object.ipaddr" :key="ipaddr">
              <span class="inline-flex items-center gap-1.5">
                <span v-if="ipaddr.includes('/ns_')">
                  <font-awesome-icon
                    :icon="objects.getObjectIcon(objects.getRecord(ipaddr)?.subtype || '')"
                    class="h-4 w-4"
                    aria-hidden="true"
                  />
                  {{ objects.getRecord(ipaddr)?.name || '-' }}
                </span>
                <span v-else>{{ ipaddr }}</span>
              </span>
            </li>
          </ul>
        </template>
        <template v-else>
          <ul class="space-y-1" :class="{ 'list-inside list-disc': multipleEntries }">
            <li v-for="domain in object.domain" :key="domain">
              {{ domain }}
            </li>
          </ul>
        </template>
      </template>
    </NeTooltip>
  </template>
</template>
