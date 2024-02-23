<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import NatRulesContent from '@/components/standalone/firewall/nat/NatRulesContent.vue'
import NetmapContent from '@/components/standalone/firewall/nat/NetmapContent.vue'
</script>

<template>
  <div>
    <!-- nat rules -->
    <NatRulesContent />
    <!-- netmap -->
    <NetmapContent class="mt-12" />
  </div>
</template>
