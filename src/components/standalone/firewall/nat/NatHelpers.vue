<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import {
  NeButton,
  NeHeading,
  NeInlineNotification,
  NeTextInput,
  getAxiosErrorMessage
} from '@nethesis/vue-components'
import { computed, onMounted, ref } from 'vue'
import { type NatHelper } from '@/stores/standalone/firewall'
import { ubusCall } from '@/lib/standalone/ubus'
import NatHelpersTable from './NatHelpersTable.vue'
import EditNatHelperDrawer from './EditNatHelperDrawer.vue'

const { t } = useI18n()
const natHelpers = ref<NatHelper[]>([])
const currentNatHelper = ref<NatHelper | undefined>(undefined)
const isShownEditNatHelper = ref(false)
const textFilter = ref('')

const loading = ref({
  listNatHelpers: false
})

const error = ref({
  listNatHelpers: '',
  listNatHelpersDetails: ''
})

const filteredNatHelpers = computed(() => {
  const regex = /[^a-zA-Z0-9-]/g
  const queryText = textFilter.value.replace(regex, '')

  return natHelpers.value.filter((natHelper) => {
    return new RegExp(queryText, 'i').test(natHelper.name.replace(regex, ''))
  })
})

onMounted(() => {
  loadData()
})

async function loadData() {
  listNatHelpers()
}

function clearFilters() {
  textFilter.value = ''
}

async function listNatHelpers() {
  loading.value.listNatHelpers = true
  error.value.listNatHelpers = ''
  error.value.listNatHelpersDetails = ''
  natHelpers.value = []

  try {
    const res = await ubusCall('ns.nathelpers', 'list-nat-helpers')
    natHelpers.value = res.data.values
  } catch (err: any) {
    console.error(err)
    error.value.listNatHelpers = t(getAxiosErrorMessage(err))
    error.value.listNatHelpersDetails = err.toString()
  } finally {
    loading.value.listNatHelpers = false
  }
}

function showEditNatHelper(natHelper: NatHelper) {
  currentNatHelper.value = natHelper
  isShownEditNatHelper.value = true
}

function hideEditNatHelperDrawer() {
  isShownEditNatHelper.value = false
}
</script>

<template>
  <div>
    <NeHeading tag="h5" class="mb-2">{{ t('standalone.nat_helpers.title') }}</NeHeading>
    <div class="mb-8 max-w-2xl text-gray-500 dark:text-gray-400">
      {{ t('standalone.nat_helpers.nat_helpers_description') }}
    </div>
    <!-- listNatHelpers error notification -->
    <NeInlineNotification
      v-if="error.listNatHelpers"
      kind="error"
      :title="t('error.cannot_retrieve_nat_helpers')"
      :description="error.listNatHelpers"
      class="mb-5"
    >
      <template #details v-if="error.listNatHelpersDetails">
        {{ error.listNatHelpersDetails }}
      </template>
    </NeInlineNotification>
    <div v-else class="space-y-6">
      <!-- no error -->

      <!-- filters -->
      <div class="flex items-center gap-4">
        <!-- text filter -->
        <NeTextInput
          :placeholder="t('standalone.nat_helpers.filter_nat_helpers')"
          v-model.trim="textFilter"
          :disabled="loading.listNatHelpers"
          class="max-w-[12rem] sm:max-w-sm"
        />
        <!-- clear filters -->
        <NeButton kind="tertiary" @click="clearFilters" :disabled="loading.listNatHelpers">
          {{ t('common.clear_filters') }}
        </NeButton>
      </div>
      <!-- nat helpers table -->
      <NatHelpersTable
        :filteredNatHelpers="filteredNatHelpers"
        :totalNatHelpers="natHelpers.length"
        :loading="loading.listNatHelpers"
        @reloadNatHelpers="loadData"
        @editNatHelper="showEditNatHelper"
        @clearFilters="clearFilters"
      />
    </div>
    <!-- edit rule drawer -->
    <EditNatHelperDrawer
      :natHelper="currentNatHelper"
      :isShown="isShownEditNatHelper"
      @close="hideEditNatHelperDrawer"
      @reloadData="loadData"
    />
  </div>
</template>
