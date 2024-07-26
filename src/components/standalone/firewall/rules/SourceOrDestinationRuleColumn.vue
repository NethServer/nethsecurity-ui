<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeTooltip, NeBadge, NeSkeleton } from '@nethesis/vue-components'
import { type FirewallRule, type RuleHost, type RuleType } from '@/stores/standalone/firewall'
import { computed, type PropType } from 'vue'
import { getZoneColorClasses } from '@/lib/standalone/network'
import type { HostSet } from '@/composables/useHostSets'
import HostSetTooltip from '../../users_objects/HostSetTooltip.vue'
import DomainSetTooltip from '../../users_objects/DomainSetTooltip.vue'
import type { DomainSet } from '@/composables/useDomainSets'

const props = defineProps({
  rule: {
    type: Object as PropType<FirewallRule>,
    required: true
  },
  columnType: {
    type: String as PropType<'source' | 'destination'>,
    required: true
  },
  rulesType: {
    type: String as PropType<RuleType>,
    required: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  loadingObjects: {
    type: Boolean,
    default: false
  },
  hostSets: {
    type: Array as PropType<HostSet[]>,
    required: true
  },
  domainSets: {
    type: Array as PropType<DomainSet[]>,
    required: true
  }
})

const { t } = useI18n()

const hostSetObject = computed(() => {
  if (props.columnType === 'source') {
    return props.hostSets.find((hostSet) => hostSet.id === props.rule.ns_src)
  } else {
    return props.hostSets.find((hostSet) => hostSet.id === props.rule.ns_dst)
  }
})

const domainSetObject = computed(() => {
  if (props.columnType === 'source') {
    return props.domainSets.find((domainSet) => `objects/${domainSet.id}` === props.rule.ns_src)
  } else {
    return props.domainSets.find((domainSet) => `objects/${domainSet.id}` === props.rule.ns_dst)
  }
})

const addresses = computed(() => {
  if (props.columnType === 'source') {
    return props.rule.src_ip as RuleHost[]
  } else {
    return props.rule.dest_ip as RuleHost[]
  }
})

const zone = computed(() => {
  if (props.columnType === 'source') {
    return props.rule.src
  } else {
    return props.rule.dest
  }
})
</script>

<template>
  <div class="flex items-center gap-4">
    <template v-if="rulesType === 'input' && props.columnType === 'destination'">
      <NeBadge
        :class="{ 'opacity-50': !enabled }"
        :text="t('standalone.firewall_rules.firewall')"
        :kind="enabled ? 'tertiary' : 'secondary'"
      />
    </template>
    <template v-else-if="rulesType === 'output' && props.columnType === 'source'">
      <NeBadge
        :class="{ 'opacity-50': !enabled }"
        :text="t('standalone.firewall_rules.firewall')"
        :kind="enabled ? 'tertiary' : 'secondary'"
      />
    </template>
    <!-- host set object -->
    <template v-else-if="hostSetObject">
      <NeSkeleton v-if="loadingObjects" />
      <HostSetTooltip :hostSetId="hostSetObject.id" :allHostSets="hostSets" />
    </template>
    <!-- domain set object -->
    <template v-else-if="domainSetObject">
      <NeSkeleton v-if="loadingObjects" />
      <DomainSetTooltip :domainSetId="domainSetObject.id" :allDomainSets="domainSets" />
    </template>
    <template v-else-if="addresses.length">
      <!-- show addresses -->
      <template v-for="(addr, i) in addresses.slice(0, 2)" :key="addr.value">
        <p>
          <template v-if="addr.label">
            <NeTooltip>
              <template #trigger>
                <span class="text-primary-700 dark:text-primary-500">
                  {{ addr.label }}
                </span>
              </template>
              <template #content>
                {{ addr.value }}
              </template>
            </NeTooltip>
          </template>
          <template v-else>
            <span :class="{ 'opacity-50': !enabled }">
              {{ addr.value }}
            </span>
          </template>
          <template v-if="i == 1 && addresses.length > 2">
            <!-- show +n others -->
            <NeTooltip>
              <template #trigger>
                <span class="ml-2 text-primary-700 dark:text-primary-500">
                  {{
                    t(
                      'common.plus_num_others',
                      {
                        num: addresses.length - 2
                      },
                      addresses.length - 2
                    )
                  }}
                </span>
              </template>
              <template #content>
                <ul class="list-inside list-disc">
                  <li v-for="(addr, i) in addresses.slice(2)" :key="i">
                    <template v-if="addr.label">
                      {{ `${addr.label} (${addr.value})` }}
                    </template>
                    <template v-else>
                      {{ addr.value }}
                    </template>
                  </li>
                </ul>
              </template>
            </NeTooltip>
          </template>
        </p>
      </template>
    </template>
    <template v-else-if="zone == '*'">
      <div :class="{ 'opacity-50': !enabled }">
        <!-- show zone -->
        {{ t('common.any') }}
      </div>
    </template>
    <NeBadge
      v-if="zone && zone != '*'"
      :text="zone.toUpperCase()"
      :kind="enabled ? 'custom' : 'secondary'"
      :customColorClasses="getZoneColorClasses(zone)"
    />
  </div>
</template>
