<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { getStandaloneRoutePrefix } from '@/lib/router'
import { useLoginStore } from '@/stores/standalone/standaloneLogin'
import { getPreference, savePreference } from '@nethesis/vue-components'
import { isEmpty } from 'lodash-es'
import { onMounted, ref, type Ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'

interface MenuItem {
  name: string
  to: string
  icon?: string
  children?: MenuItem[]
}

const { t } = useI18n()
const route = useRoute()
const loginStore = useLoginStore()

const menuExpanded: any = ref({
  system: false,
  network: false,
  'users-objects': false,
  firewall: false,
  security: false,
  vpn: false,
  monitoring: false
})

const navigation: Ref<MenuItem[]> = ref([
  { name: 'standalone.dashboard.title', to: 'dashboard', icon: 'house' },
  {
    name: 'standalone.monitoring.title',
    to: 'monitoring',
    icon: 'chart-line',
    children: [
      {
        name: 'standalone.real_time_monitor.title',
        to: 'monitoring/real-time-monitoring'
      },
      {
        name: 'standalone.netify_informatics.title',
        to: 'monitoring/netify-informatics'
      },
      {
        name: 'standalone.ping_latency_monitor.title',
        to: 'monitoring/ping-latency-monitor'
      }
    ]
  },
  {
    name: 'standalone.system.title',
    icon: 'server',
    to: 'system',
    children: [
      { name: 'standalone.subscription.title', to: 'system/subscription' },
      {
        name: 'standalone.system_settings.title',
        to: 'system/systemSettings'
      },
      { name: 'standalone.ssh.title', to: 'system/ssh' },
      {
        name: 'standalone.backup_and_restore.title',
        to: 'system/backup-and-restore'
      },
      {
        name: 'standalone.reboot_and_shutdown.title',
        to: 'system/reboot-and-shutdown'
      },
      {
        name: 'standalone.update.title',
        to: 'system/update'
      },
      {
        name: 'standalone.storage.title',
        to: 'system/storage'
      },
      {
        name: 'standalone.factory_reset.title',
        to: 'system/factory_reset'
      },
      {
        name: 'standalone.certificates.title',
        to: 'system/certificates'
      },
      {
        name: 'standalone.controller.title',
        to: 'system/controller'
      }
    ]
  },
  {
    name: 'standalone.network.title',
    to: 'network',
    icon: 'network-wired',
    children: [
      {
        name: 'standalone.interfaces_and_devices.title',
        to: 'network/interfaces-and-devices'
      },
      {
        name: 'standalone.dns_dhcp.title',
        to: 'network/dns-dhcp'
      },
      {
        name: 'standalone.routes.title',
        to: 'network/routes'
      },
      {
        name: 'standalone.multi_wan.title',
        to: 'network/multi-wan'
      },
      {
        name: 'standalone.hotspot.title',
        to: 'network/hotspot'
      },
      {
        name: 'standalone.reverse_proxy.title',
        to: 'network/reverse-proxy'
      },
      {
        name: 'standalone.qos.title_short',
        to: 'network/qos'
      }
    ]
  },
  {
    name: 'standalone.user_objects.title',
    to: 'users-objects',
    icon: 'user-group',
    children: [
      {
        name: 'standalone.users_database.title',
        to: 'users-objects/users-database'
      },
      {
        name: 'standalone.objects.title',
        to: 'users-objects/objects'
      }
    ]
  },
  {
    name: 'standalone.firewall.title',
    to: 'firewall',
    icon: 'block-brick-fire',
    children: [
      {
        name: 'standalone.port_forward.title',
        to: 'firewall/port-forward'
      },
      {
        name: 'standalone.nat.title',
        to: 'firewall/nat'
      },
      {
        name: 'standalone.firewall_rules.short_title',
        to: 'firewall/rules'
      },
      {
        name: 'standalone.conntrack.short_title',
        to: 'firewall/conntrack'
      },
      {
        name: 'standalone.zones_and_policies.title',
        to: 'firewall/zones-and-policies'
      }
    ]
  },
  {
    name: 'standalone.security.title',
    to: 'security',
    icon: 'shield-halved',
    children: [
      {
        name: 'standalone.threat_shield.title',
        to: 'security/threat-shield-ip'
      },
      {
        name: 'standalone.threat_shield_dns.title',
        to: 'security/threat-shield-dns'
      },
      {
        name: 'standalone.flashstart.title',
        to: 'security/flashstart'
      },
      {
        name: 'standalone.dpi.title',
        to: 'security/dpi'
      }
    ],
    expanded: false
  },
  {
    name: 'standalone.vpn.title',
    to: 'vpn',
    icon: 'globe',
    children: [
      {
        name: 'standalone.openvpn_rw.title',
        to: 'vpn/openvpn-rw'
      },
      {
        name: 'standalone.openvpn_tunnel.title',
        to: 'vpn/openvpn-tunnel'
      },
      {
        name: 'standalone.ipsec_tunnel.title',
        to: 'vpn/ipsec-tunnel'
      }
    ]
  },
  { name: 'standalone.logs.title', to: 'logs', icon: 'list' }
])

onMounted(() => {
  // wait for route.path
  setTimeout(() => {
    loadMenuItemsExpanded()
  }, 500)
})

function isCurrentRoute(itemPath: string) {
  return route.path.includes(itemPath)
}

function toggleExpand(menuItem: MenuItem) {
  const newValue = !menuExpanded.value[menuItem.to]
  menuExpanded.value[menuItem.to] = newValue
  const username = loginStore.username || 'root'
  savePreference(`${menuItem.to}MenuExpanded`, newValue, username)
}

function loadMenuItemsExpanded() {
  const username = loginStore.username || 'root'

  for (const menuName of Object.keys(menuExpanded.value)) {
    const isMenuExpanded = getPreference(`${menuName}MenuExpanded`, username)

    if (isMenuExpanded || isCurrentRoute(menuName)) {
      menuExpanded.value[menuName] = true
    }
  }
}
</script>

<template>
  <li v-for="item in navigation" :key="item.name">
    <!-- simple link -->
    <template v-if="isEmpty(item.children)">
      <router-link
        :to="`${getStandaloneRoutePrefix()}/${item.to}`"
        :class="[
          isCurrentRoute(item.to)
            ? 'border-l-4 border-primary-700 bg-gray-100 text-gray-900 dark:border-primary-500 dark:bg-gray-800 dark:text-gray-50'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
          'group flex cursor-pointer items-center gap-x-3 rounded-md px-3 py-2 text-sm font-semibold leading-6 hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
      >
        <font-awesome-icon
          :icon="[isCurrentRoute(item.to) ? 'fas' : 'fal', item.icon]"
          class="h-6 w-8 shrink-0"
          aria-hidden="true"
        />
        {{ t(item.name) }}
      </router-link>
    </template>
    <!-- open submenu -->
    <template v-else>
      <a
        @click="toggleExpand(item)"
        :class="[
          isCurrentRoute(item.to)
            ? 'text-gray-900 dark:text-gray-50'
            : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
          'group flex cursor-pointer items-center justify-between rounded-md px-3 py-2 text-sm font-semibold leading-6 hover:bg-gray-100 dark:hover:bg-gray-800'
        ]"
      >
        <div class="flex items-center gap-x-3">
          <font-awesome-icon
            :icon="[isCurrentRoute(item.to) ? 'fas' : 'fal', item.icon]"
            class="h-6 w-8 shrink-0"
            aria-hidden="true"
          />
          <span>
            {{ t(item.name) }}
          </span>
        </div>
        <font-awesome-icon
          :icon="['fas', menuExpanded[item.to] ? 'chevron-up' : 'chevron-down']"
          class="ml-2 h-3 w-3 shrink-0"
          aria-hidden="true"
        />
      </a>
      <Transition name="slide-down">
        <ul v-show="menuExpanded[item.to]" role="list" class="mt-2 space-y-1">
          <li v-for="child in item.children" :key="child.name">
            <div class="ml-10">
              <router-link
                :to="`${getStandaloneRoutePrefix()}/${child.to}`"
                :class="[
                  isCurrentRoute(child.to)
                    ? 'border-l-4 border-primary-700 bg-gray-100 text-gray-900 dark:border-primary-500 dark:bg-gray-800 dark:text-gray-50'
                    : 'text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-gray-50',
                  'group flex cursor-pointer items-center gap-x-3 rounded-md px-3 py-1 text-sm font-semibold leading-6 hover:bg-gray-100 dark:hover:bg-gray-800'
                ]"
              >
                {{ t(child.name) }}
              </router-link>
            </div>
          </li>
        </ul>
      </Transition>
    </template>
  </li>
</template>
