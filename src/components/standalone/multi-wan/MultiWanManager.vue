<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { reactive } from 'vue'
import { useMwanConfig } from '@/composables/useMwanConfig'
import { NeButton, NeSkeleton } from '@nethserver/vue-tailwind-lib'
import PolicyManager from '@/components/standalone/multi-wan/PolicyManager.vue'
import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const { t } = useI18n()

const mwanConfig = reactive(useMwanConfig())
</script>

<template>
  <div>
    <div class="mb-8">
      <h6 class="mb-2 text-xl font-medium text-gray-900 dark:text-gray-50">
        {{ t('standalone.multi_wan.policy') }}
      </h6>
      <p class="text-sm text-gray-500 dark:text-gray-400">
        {{ t('standalone.multi_wan.policy_description') }}
      </p>
    </div>
    <div>
      <NeSkeleton v-if="mwanConfig.loading" :lines="3" :size="'sm'" />
      <div v-if="mwanConfig.policies.length > 1">
        <PolicyManager
          v-for="(policy, index) in mwanConfig.policies"
          :key="index"
          :policy="policy"
          class="mb-6"
        />
      </div>
      <div v-else>
        <HorizontalCard class="space-y-4 text-center">
          <p>{{ t('standalone.multi_wan.no_policy_found') }}</p>
          <NeButton :kind="'primary'">
            <template #prefix>
              <FontAwesomeIcon :icon="['fas', 'circle-plus']" />
            </template>
            {{ t('standalone.multi_wan.create_default_policy') }}
          </NeButton>
        </HorizontalCard>
      </div>
    </div>
  </div>
</template>
