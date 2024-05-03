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
    <template v-else>
      <div :class="{ 'opacity-50': !enabled }">
        <!-- show zone -->
        <span v-if="zone === '*'">
          {{ t('common.any') }}
        </span>
        <span v-else-if="zone">
          <NeBadge
            :text="zone.toUpperCase()"
            :kind="enabled ? 'custom' : 'secondary'"
            :customColorClasses="getZoneColorClasses(zone)"
          />
        </span>
      </div>
    </template>
  </div>
</template>
