<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { NeTooltip, NeBadge } from '@nethesis/vue-components'
import { type FirewallRule, type RuleHost, type RuleType } from '@/stores/standalone/firewall'
import { computed, type PropType } from 'vue'
import { getZoneColorClasses } from '@/lib/standalone/network'

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
  }
})

const { t } = useI18n()

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
  <div>
    <template v-if="rulesType === 'input' && props.columnType === 'destination'">
      <NeBadge :text="t('standalone.firewall_rules.firewall')" kind="tertiary" />
    </template>
    <template v-else-if="rulesType === 'output' && props.columnType === 'source'">
      <NeBadge :text="t('standalone.firewall_rules.firewall')" kind="tertiary" />
    </template>
    <template v-else-if="addresses.length">
      <!-- show addresses -->
      <template v-if="addresses[0].label">
        <NeTooltip>
          <template #trigger>
            <span class="text-primary-700 dark:text-primary-500">
              {{ addresses[0].label }}
            </span>
          </template>
          <template #content>
            {{ addresses[0].value }}
          </template>
        </NeTooltip>
      </template>
      <template v-else>
        <span :class="{ 'opacity-50': !enabled }">
          {{ addresses[0].value }}
        </span>
      </template>

      <template v-if="addresses.length > 1">
        <!-- show +n others -->
        <NeTooltip>
          <template #trigger>
            <span class="ml-2 text-primary-700 dark:text-primary-500">
              {{
                t(
                  'common.plus_num_others',
                  {
                    num: addresses.length - 1
                  },
                  addresses.length - 1
                )
              }}
            </span>
          </template>
          <template #content>
            <ul class="list-inside list-disc">
              <li v-for="(addr, i) in addresses.slice(1)" :key="i">
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
    </template>
    <template v-else>
      <div :class="{ 'opacity-50': !enabled }">
        <!-- show zone -->
        <span v-if="zone === '*'">
          {{ t('common.any') }}
        </span>
        <span v-else-if="zone">
          <NeBadge
            :text="zone.toUpperCase()"
            kind="custom"
            :customColorClasses="getZoneColorClasses(zone)"
          />
        </span>
      </div>
    </template>
  </div>
</template>
