<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { faShield, faArrowRight } from '@fortawesome/free-solid-svg-icons'
import { NeButton, NeEmptyState } from '@nethesis/vue-components'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'

const { t } = useI18n()
const router = useRouter()
</script>

<template>
  <NeEmptyState
    :title="t('standalone.threat_shield_dns.threat_shield_dns_disabled')"
    :icon="faShield"
    class="pb-8"
  >
    <NeButton
      kind="primary"
      @click="
        () => {
          router.push(`${getStandaloneRoutePrefix()}/security/threat-shield-dns?tab=settings`)
        }
      "
    >
      <template #prefix>
        <font-awesome-icon :icon="faArrowRight" class="h-4 w-4" aria-hidden="true" />
      </template>
      {{ t('standalone.threat_shield_dns.go_to_settings') }}
    </NeButton>
  </NeEmptyState>
</template>
