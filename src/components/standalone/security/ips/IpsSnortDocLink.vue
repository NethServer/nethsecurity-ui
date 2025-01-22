<!--
  Copyright (C) 2025 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeLink } from '@nethesis/vue-components'
import { computed } from 'vue'

const { gid, sid } = defineProps<{
  gid: string
  sid: string
}>()

const url = computed(() => {
  return `https://snort.org/rule_docs/${gid}-${sid}`
})
</script>

<template>
  <NeLink :href="url" target="_blank">
    {{ `${gid}:${sid}` }}
  </NeLink>
</template>
