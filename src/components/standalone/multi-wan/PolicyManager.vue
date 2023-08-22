<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import type { Member, Policy } from '@/composables/useMwanConfig'
import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useMwanStatus } from '@/composables/useMwanStatus'
import type { PropType } from 'vue'
import { computed, reactive } from 'vue'
import { NeBadge } from '@nethserver/vue-tailwind-lib'

enum PolicyType {
  BALANCED,
  BACKUP,
  CUSTOM
}

const props = defineProps({
  policy: {
    type: Object as PropType<Policy>,
    required: true
  }
})

const { t } = useI18n()

const mwanStatus = reactive(useMwanStatus())

const membersGrouped = computed(() => {
  const map = new Map<number, Array<Member>>()
  props.policy?.members.forEach((value) => {
    if (map.get(value.metric) == undefined) {
      map.set(value.metric, [])
    }
    map.get(value.metric)!.push(value)
  })
  return map
})

const policyType = computed(() => {
  const members = props.policy?.members.map((value) => value.metric) ?? []
  if (members.every((value, index, array) => value == array[0])) {
    return PolicyType.BALANCED
  } else if (members.every((value, index, array) => array.indexOf(value) == index)) {
    return PolicyType.BACKUP
  } else {
    return PolicyType.CUSTOM
  }
})

const policyIcon = computed(() => {
  switch (policyType.value) {
    case PolicyType.BALANCED:
      return ['fas', 'scale-balanced']
    case PolicyType.BACKUP:
      return ['fas', 'layer-group']
    default:
      return undefined
  }
})

const policyLabel = computed(() => {
  switch (policyType.value) {
    case PolicyType.BALANCED:
      return 'standalone.multi_wan.modes.balance'
    case PolicyType.BACKUP:
      return 'standalone.multi_wan.modes.backup'
    case PolicyType.CUSTOM:
      return 'standalone.multi_wan.modes.custom'
    default:
      return ''
  }
})

function badgeIcon(member: Member) {
  switch (mwanStatus.interfaces.get(member.interface.name)!.status) {
    case 'online':
      return ['fas', 'circle-check']
    case 'offline':
      return ['fas', 'circle-xmark']
    case 'disconnecting':
    case 'connecting':
      return ['fas', 'warning']
    default:
      return ['fas', 'clock']
  }
}

function badgeType(member: Member) {
  switch (mwanStatus.interfaces.get(member.interface.name)!.status) {
    case 'online':
      return 'success'
    case 'offline':
      return 'error'
    case 'disconnecting':
    case 'connecting':
      return 'warning'
    default:
      return undefined
  }
}
</script>

<template>
  <HorizontalCard
    :class="[policy.name == 'Default' ? 'border-indigo-900' : 'border-transparent']"
    class="mb-4 border-l-4"
  >
    <div class="flex flex-wrap gap-y-6 md:gap-6">
      <div
        class="flex basis-1/2 items-center border-r-[1px] border-gray-600 md:basis-3/12 xl:basis-2/12"
      >
        <div
          v-if="policy.name == 'Default'"
          class="mr-3 flex h-8 w-8 items-center justify-center rounded-full dark:bg-gray-50 dark:text-gray-600"
        >
          <FontAwesomeIcon :icon="['fas', 'lock']" />
        </div>
        <p class="break-all">{{ policy.name }}</p>
      </div>
      <div
        class="flex basis-1/2 items-center justify-end md:basis-2/12 md:justify-start xl:basis-2/12"
      >
        <FontAwesomeIcon v-if="policyIcon != undefined" :icon="policyIcon" class="mr-2" />
        <p>{{ t(policyLabel) }}</p>
      </div>
      <div
        v-if="!mwanStatus.loading"
        class="flex basis-full flex-col justify-center gap-y-6 md:basis-5/12 xl:w-3/12"
      >
        <div v-for="([metric, members], membersIndex) in membersGrouped" :key="metric">
          <div v-if="membersGrouped.size > 1" class="mb-2">
            {{ t('standalone.multi_wan.priority', membersIndex + 1) }}
          </div>
          <div class="flex flex-wrap gap-4">
            <div v-for="(member, index) in members" :key="index">
              <NeBadge
                :icon="badgeIcon(member)"
                :kind="badgeType(member)"
                :text="member.interface.name"
                :label="members.length > 1 ? `weight: ${member.weight}` : ''"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </HorizontalCard>
</template>
