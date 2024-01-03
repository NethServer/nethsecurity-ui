<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown, NeButton } from '@nethserver/vue-tailwind-lib'
import type {
  RWAuthenticationMode,
  RWAccount
} from '@/views/standalone/vpn/OpenvpnRoadWarriorView.vue'

const { t } = useI18n()

const props = defineProps<{
  users: RWAccount[]
  authenticationMode: RWAuthenticationMode
}>()

const emit = defineEmits<{
  delete: [item: RWAccount]
  edit: [item: RWAccount]
  enableDisable: [item: RWAccount]
  downloadConfiguration: [item: RWAccount]
  downloadCertificate: [item: RWAccount]
  downloadQrCode: [item: RWAccount]
  regenerateCertificate: [item: RWAccount]
}>()

const tableHeaders = [
  {
    label: t('standalone.openvpn_rw.username'),
    key: 'name'
  },
  {
    label: t('standalone.openvpn_rw.expiration'),
    key: 'expiration'
  },
  {
    label: t('standalone.openvpn_rw.reserved_ip'),
    key: 'reserved_ip'
  },
  {
    label: t('standalone.openvpn_rw.connection'),
    key: 'connection'
  },
  {
    label: '',
    key: 'menu'
  }
]

function getDropdownItems(item: RWAccount) {
  return [
    {
      id: 'download_configuration',
      label: t('standalone.openvpn_rw.download_configuration'),
      iconStyle: 'fas',
      icon: 'circle-arrow-down',
      danger: false,
      action: () => {
        emit('downloadConfiguration', item)
      }
    },
    {
      id: 'download_certificate',
      label: t('standalone.openvpn_rw.download_certificate'),
      iconStyle: 'fas',
      icon: 'circle-arrow-down',
      danger: false,
      action: () => {
        emit('downloadCertificate', item)
      }
    },
    ...(props.authenticationMode === 'username_otp_certificate'
      ? [
          {
            id: 'download_qr_code',
            label: t('standalone.openvpn_rw.download_qr_code'),
            iconStyle: 'fas',
            icon: 'circle-arrow-down',
            danger: false,
            action: () => {
              emit('downloadQrCode', item)
            }
          }
        ]
      : []),
    {
      id: 'enable_disable',
      label: item.openvpn_enabled === '1' ? t('common.disable') : t('common.enable'),
      iconStyle: 'fas',
      icon: item.openvpn_enabled === '1' ? 'circle-xmark' : 'circle-check',
      action: () => {
        emit('enableDisable', item)
      }
    },
    {
      id: 'regenerate_certificate',
      label: t('standalone.openvpn_rw.regenerate_certificate'),
      iconStyle: 'fas',
      icon: 'arrows-rotate',
      danger: false,
      action: () => {
        emit('regenerateCertificate', item)
      }
    },
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('delete', item)
      }
    }
  ]
}

function getCellClasses(item: RWAccount) {
  return item.openvpn_enabled === '0' ? ['opacity-50'] : []
}
</script>

<template>
  <NeTable :data="users" :headers="tableHeaders">
    <template #name="{ item }: { item: RWAccount }">
      <div class="flex flex-row gap-x-3">
        <p :class="[getCellClasses(item)]">
          {{ item.name }}
        </p>
        <!-- password not configured warning -->
        <tippy
          interactive
          theme="tailwind"
          v-if="
            item.local &&
            !item.password &&
            (authenticationMode === 'username_password' ||
              authenticationMode === 'username_password_certificate')
          "
        >
          <span class="cursor-pointer">
            <slot name="trigger">
              <font-awesome-icon
                :icon="['fas', 'triangle-exclamation']"
                class="h-4 w-4 text-amber-500"
              />
            </slot>
          </span>
          <template #content>
            <div class="text-center">
              <p>{{ t('standalone.openvpn_rw.password_not_configured') }}</p>
              <router-link
                class="text-primary-500 dark:text-primary-800"
                to="/standalone/vpn/users-database"
                >{{ t('standalone.openvpn_rw.edit_user_database') }}</router-link
              >
            </div>
          </template>
        </tippy>
      </div>
      <!-- more info button -->
      <div v-if="item.connected">
        <tippy interactive placement="bottom" trigger="click" theme="tailwind">
          <span class="cursor-pointer">
            <slot name="trigger">
              <NeButton size="sm" kind="tertiary" class="-mx-2">{{
                t('standalone.openvpn_rw.more_info')
              }}</NeButton>
            </slot>
          </span>
          <template #content>
            <div>
              <ul class="list-inside list-disc px-2 py-1">
                <li class="py-2">
                  <span class="mr-2 inline-block font-semibold"
                    >{{ t('standalone.openvpn_rw.virtual_ip') }}:</span
                  >
                  <span class="text-gray-300 dark:text-gray-500">{{ item.virtual_address }}</span>
                </li>
                <li class="py-2">
                  <span class="mr-2 inline-block font-semibold"
                    >{{ t('standalone.openvpn_rw.remote_ip') }}:</span
                  >
                  <span class="text-gray-300 dark:text-gray-500">{{ item.real_address }}</span>
                </li>
                <li class="py-2">
                  <span class="mr-2 inline-block font-semibold"
                    >{{ t('standalone.openvpn_rw.started') }}:</span
                  >
                  <span class="text-gray-300 dark:text-gray-500">{{
                    `${new Date((item.since as number) * 1000).toLocaleDateString()} ${new Date(
                      (item.since as number) * 1000
                    ).toLocaleTimeString()}`
                  }}</span>
                </li>
                <li class="py-2 align-top">
                  <span class="mr-2 inline-block align-top font-semibold"
                    >{{ t('standalone.openvpn_rw.traffic') }}:</span
                  >
                  <span class="inline-block align-top text-gray-300 dark:text-gray-500"
                    >{{ parseInt(item.bytes_sent as string) / 1000 }} KB
                    {{ t('standalone.openvpn_rw.sent') }}<br />{{
                      parseInt(item.bytes_received as string) / 1000
                    }}
                    KB {{ t('standalone.openvpn_rw.received') }}</span
                  >
                </li>
              </ul>
            </div>
          </template>
        </tippy>
      </div>
    </template>
    <template #expiration="{ item }: { item: RWAccount }">
      <div class="flex flex-row gap-x-3">
        <p :class="[getCellClasses(item)]">
          {{
            item.expiration
              ? new Date((item.expiration as number) * 1000).toLocaleDateString()
              : '-'
          }}
        </p>
        <!-- certificate expired warning -->
        <tippy interactive theme="tailwind" v-if="item.expired">
          <span class="cursor-pointer">
            <slot name="trigger">
              <font-awesome-icon
                :icon="['fas', 'triangle-exclamation']"
                class="h-4 w-4 text-amber-500"
              />
            </slot>
          </span>
          <template #content>
            <div class="text-center">
              <p>{{ t('standalone.openvpn_rw.this_certificate_expired') }}</p>
              <p
                class="cursor-pointer text-primary-500 dark:text-primary-800"
                @click="emit('regenerateCertificate', item)"
              >
                {{ t('standalone.openvpn_rw.renew_certificate') }}
              </p>
            </div>
          </template>
        </tippy>
      </div>
    </template>
    <template #reserved_ip="{ item }: { item: RWAccount }">
      <p :class="[getCellClasses(item)]">
        {{ item.openvpn_ipaddr ? item.openvpn_ipaddr : '-' }}
      </p>
    </template>
    <template #connection="{ item }: { item: RWAccount }">
      <div :class="['flex', 'flex-row', 'items-center', getCellClasses(item)]">
        <font-awesome-icon
          :icon="['fas', item.connected ? 'circle-check' : 'circle-xmark']"
          :class="[
            'mr-2',
            'h-5',
            'w-5',
            item.connected ? 'text-green-600 dark:text-green-400' : ''
          ]"
          aria-hidden="true"
        />
        <p>
          {{
            item.connected
              ? t('standalone.openvpn_rw.connected')
              : t('standalone.openvpn_rw.not_connected')
          }}
        </p>
      </div>
    </template>
    <template #menu="{ item }: { item: RWAccount }">
      <div class="align-center flex justify-end">
        <NeButton kind="tertiary" @click="emit('edit', item)">
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'pen-to-square']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
          {{ t('common.edit') }}
        </NeButton>
        <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
      </div>
    </template>
  </NeTable>
</template>
