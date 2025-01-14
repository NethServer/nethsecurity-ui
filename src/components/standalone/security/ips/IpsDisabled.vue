<script lang="ts" setup>
import { NeButton, NeEmptyState } from '@nethesis/vue-components'
import { faArrowRight, faShield } from '@fortawesome/free-solid-svg-icons'
import { useI18n } from 'vue-i18n'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import { ipsStatus } from '@/stores/standalone/ipsStatus'
import { onMounted } from 'vue'

const { t } = useI18n()
const router = useRouter()
const ips = ipsStatus()

onMounted(() => {
  ips.fetchStatus()
})
</script>

<template>
  <NeEmptyState v-if="ips.enabled" :icon="faShield" :title="t('standalone.ips.ips_is_disabled')">
    <div class="flex flex-col items-center gap-5">
      <span class="text-center">{{ t('standalone.ips.ips_is_disabled_description') }}</span>
      <NeButton
        size="lg"
        @click="() => router.push(`${getStandaloneRoutePrefix()}/security/ips?tab=settings`)"
      >
        <template #prefix>
          <FontAwesomeIcon :icon="faArrowRight" aria-hidden="true" class="h-4 w-4" />
        </template>
        {{ t('standalone.ips.go_to_settings') }}
      </NeButton>
    </div>
  </NeEmptyState>
</template>
