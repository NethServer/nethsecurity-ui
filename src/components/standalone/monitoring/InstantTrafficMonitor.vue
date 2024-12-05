<script lang="ts" setup>
import InstantHostTrafficCard from '@/components/standalone/monitoring/traffic/InstantHostTrafficCard.vue'
import { useTopTalkers } from '@/composables/useTopTalkers'
import InstantProtocolTrafficCard from '@/components/standalone/monitoring/traffic/InstantProtocolTrafficCard.vue'
import InstantAppTrafficCard from '@/components/standalone/monitoring/traffic/InstantAppTrafficCard.vue'
import { NeInlineNotification, NeSkeleton } from '@nethesis/vue-components'

const {
  topApps,
  topProtocols,
  topHosts,
  loadingTopTalkers,
  errorTopTalkers,
  errorTopTalkersDescription
} = useTopTalkers()
</script>

<template>
  <NeSkeleton v-if="loadingTopTalkers" :lines="10" size="lg" />
  <NeInlineNotification
    v-else-if="errorTopTalkers"
    :description="errorTopTalkersDescription"
    :title="errorTopTalkers"
    kind="error"
  />
  <div v-else class="grid grid-cols-1 gap-6 xl:grid-cols-2 4xl:grid-cols-3">
    <InstantHostTrafficCard :topHosts="topHosts" />
    <!-- instant apps traffic -->
    <InstantAppTrafficCard :topApps="topApps" />
    <!-- instant protocols traffic -->
    <InstantProtocolTrafficCard :topProtocols="topProtocols" />
  </div>
</template>
