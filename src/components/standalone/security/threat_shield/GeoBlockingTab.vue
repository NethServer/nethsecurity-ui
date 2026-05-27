<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import { ref, computed } from 'vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { onMounted } from 'vue'
import { ubusCall } from '@/lib/standalone/ubus'
import { useNotificationsStore } from '@/stores/notifications'
import {
  faCircleCheck,
  faCircleXmark,
  faLocationDot,
  faEarthAfrica,
  faEarthAmericas,
  faEarthAsia,
  faEarthEurope,
  faEarthOceania,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  NeHeading,
  NeTextInput,
  NeButton,
  NeCheckbox,
  NeCombobox,
  NeBadge,
  NeToggle,
  NeInlineNotification,
  type NeComboboxOption
} from '@nethesis/vue-components'

const { t } = useI18n()
const uciChangesStore = useUciPendingChangesStore()
const notificationsStore = useNotificationsStore()

const error = ref({
  notificationDescription: '',
  notificationDetails: ''
})
const fetchError = ref(false)
const loading = ref(false)
const showDeleteAddressModal = ref(false)
const showCreateOrEditAddressDrawer = ref(false)

// --- Regions data ---

type Country = {
  code: string
  name: string
  selected: boolean
}

type Region = {
  id: string
  nameKey: string
  icon: typeof faEarthAfrica
  countries: Country[]
}

const regions = ref<Region[]>([
  {
    id: 'africa',
    nameKey: 'standalone.threat_shield.africa',
    icon: faEarthAfrica,
    countries: [
      { code: 'DZ', name: 'Algeria', selected: false },
      { code: 'AO', name: 'Angola', selected: false },
      { code: 'BJ', name: 'Benin', selected: false },
      { code: 'BW', name: 'Botswana', selected: false },
      { code: 'IO', name: 'British Indian Ocean Territory', selected: false },
      { code: 'BF', name: 'Burkina Faso', selected: false },
      { code: 'BI', name: 'Burundi', selected: false }
    ]
  },
  {
    id: 'americas',
    nameKey: 'standalone.threat_shield.americas',
    icon: faEarthAmericas,
    countries: [
      { code: 'AR', name: 'Argentina', selected: false },
      { code: 'BR', name: 'Brazil', selected: false },
      { code: 'CA', name: 'Canada', selected: false },
      { code: 'CL', name: 'Chile', selected: false },
      { code: 'CO', name: 'Colombia', selected: false },
      { code: 'MX', name: 'Mexico', selected: false },
      { code: 'US', name: 'United States', selected: false }
    ]
  },
  {
    id: 'asia',
    nameKey: 'standalone.threat_shield.asia',
    icon: faEarthAsia,
    countries: [
      { code: 'CN', name: 'China', selected: false },
      { code: 'IN', name: 'India', selected: false },
      { code: 'JP', name: 'Japan', selected: false },
      { code: 'KR', name: 'South Korea', selected: false },
      { code: 'RU', name: 'Russia', selected: false }
    ]
  },
  {
    id: 'europe',
    nameKey: 'standalone.threat_shield.europe',
    icon: faEarthEurope,
    countries: [
      { code: 'FR', name: 'France', selected: false },
      { code: 'DE', name: 'Germany', selected: false },
      { code: 'IT', name: 'Italy', selected: false },
      { code: 'ES', name: 'Spain', selected: false },
      { code: 'GB', name: 'United Kingdom', selected: false }
    ]
  },
  {
    id: 'oceania',
    nameKey: 'standalone.threat_shield.oceania',
    icon: faEarthOceania,
    countries: [
      { code: 'AU', name: 'Australia', selected: false },
      { code: 'FJ', name: 'Fiji', selected: false },
      { code: 'NZ', name: 'New Zealand', selected: false }
    ]
  }
])

/** Regions that have at least one country selected (i.e. enabled). */
const enabledRegions = computed(() => regions.value.filter((r) => isRegionEnabled(r)))

function isRegionEnabled(region: Region): boolean {
  return region.countries.some((c) => c.selected)
}

function blockedCountriesCount(region: Region): number {
  return region.countries.filter((c) => c.selected).length
}

/** Total number of blocked countries across all regions. */
const totalBlockedCountries = computed(() =>
  regions.value.reduce((sum, r) => sum + blockedCountriesCount(r), 0)
)

const selectedRegionId = ref<string | null>(null)

const selectedRegion = computed(
  () => regions.value.find((r) => r.id === selectedRegionId.value) ?? null
)

const countrySearch = ref('')

const filteredCountries = computed(() =>
  selectedRegion.value?.countries.filter((c) =>
    `${c.name} (${c.code})`.toLowerCase().includes(countrySearch.value.toLowerCase())
  ) ?? []
)

const selectedCountriesCount = computed(
  () => selectedRegion.value?.countries.filter((c) => c.selected).length ?? 0
)

function selectRegion(regionId: string) {
  // Toggle: clicking the already-open region closes the panel
  selectedRegionId.value = selectedRegionId.value === regionId ? null : regionId
  countrySearch.value = ''
}

function selectAll() {
  selectedRegion.value?.countries.forEach((c) => (c.selected = true))
}

function deselectAll() {
  selectedRegion.value?.countries.forEach((c) => (c.selected = false))
}

// Unit country combobox
const unitCountryOptions = ref<NeComboboxOption[]>([
  { id: 'IT', label: 'Italy' },
  { id: 'FR', label: 'France' },
  { id: 'DE', label: 'Germany' },
  { id: 'ES', label: 'Spain' },
  { id: 'US', label: 'United States' }
])
const selectedUnitCountry = ref<string>('IT')

const savingRegions = ref(false)

/** Controls visibility of the intro card vs the main configuration UI.
 *  Will be driven by actual service state once API integration is in place. */
const isServiceEnabled = ref(false)

async function saveRegions() {
  // TODO: implement save
}

async function fetchCountries() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  fetchError.value = false

  /* try {
      loading.value = true
      allowlist.value = (await ubusCall('ns.threatshield', 'list-allowed')).data.data
  } catch (err: any) {
      error.value.notificationDescription = t(getAxiosErrorMessage(err))
      error.value.notificationDetails = err.toString()
      fetchError.value = true
  } finally {
      loading.value = false
  }
  */
}

onMounted(() => {
  fetchCountries()
})
</script>

<template>
  <div class="flex flex-col gap-y-6 mb-7">
    <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
      {{ t('standalone.threat_shield.geoblocking_description') }}
    </p>
  </div>

  <!-- Geo IP blocking summary card -->
  <div
    class="flex flex-col rounded-md border-l-4 border-indigo-500 dark:border-indigo-400 bg-gray-100 dark:bg-gray-800 sm:shadow sm:rounded-lg md:flex-row md:items-stretch p-2 mb-3"
  >
    <!-- Div 1: icon + title -->
    <div
      class="flex items-center gap-4 px-6 py-4 shrink-0 md:border-r md:border-gray-300 md:dark:border-gray-600"
    >
      <div
        class="flex size-8 shrink-0 items-center justify-center rounded-full bg-gray-900 dark:bg-gray-50"
      >
        <FontAwesomeIcon
          :icon="faLocationDot"
          aria-hidden="true"
          class="h-4 w-4 text-gray-300 dark:text-gray-600"
        />
      </div>
      <span class="whitespace-nowrap text-base font-medium text-gray-900 dark:text-gray-100">
        {{ t('standalone.threat_shield.geo_ip_blocking') }}
      </span>
    </div>

    <!-- Div 2: blocked countries + status, fills remaining space -->
    <div class="flex flex-1 flex-col md:flex-row md:items-center justify-center">
      <!-- Blocked countries cell -->
      <div
        class="flex flex-1 items-center px-6 py-4 md:justify-center"
      >
        <div class="flex w-full items-center justify-between md:w-auto md:gap-8">
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
            {{ t('standalone.threat_shield.blocked_countries') }}
          </span>
          <span class="text-3xl font-medium leading-9 text-gray-700 dark:text-gray-200">
            {{ totalBlockedCountries }}
          </span>
        </div>
      </div>

      <!-- Status cell -->
      <div class="flex flex-1 items-center px-6 py-4 md:justify-center">
        <div class="flex w-full items-center justify-between md:w-auto md:gap-8">
          <span class="text-sm font-medium text-gray-900 dark:text-gray-100 whitespace-nowrap">
            {{ t('common.status') }}
          </span>
          <div class="flex items-center gap-2">
            <FontAwesomeIcon
              :icon="true ? faCircleCheck : faCircleXmark"
              :class="['size-4', true ? 'text-enabled' : 'text-disabled']"
              aria-hidden="true"
            />
            <span class="whitespace-nowrap text-sm text-gray-700 dark:text-gray-200">
              {{ true ? t('common.enabled') : t('common.disabled') }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Service card -->
  <div class="mt-6 flex flex-col gap-6 rounded-lg bg-white dark:bg-gray-950 p-6 shadow-md">

    <!-- Title + toggle -->
    <div class="flex flex-col gap-2">
      <h2 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        {{ t('standalone.threat_shield.geo_ip_blocking') }}
      </h2>
      <NeToggle
        v-model="isServiceEnabled"
        :label="isServiceEnabled ? t('common.enabled') : t('common.disabled')"
      />
    </div>

    <!-- Warning: visible only when enabled -->
    <NeInlineNotification
      v-if="isServiceEnabled"
      kind="warning"
      :title="t('standalone.threat_shield.avoid_blocking_title')"
      :description="t('standalone.threat_shield.avoid_blocking_description')"
    />

    <!-- Regions and countries section -->
    <div class="flex flex-col gap-2">
      <h3 class="text-lg font-medium text-gray-900 dark:text-gray-100">
        {{ t('standalone.threat_shield.regions_and_countries') }}
      </h3>

      <!-- Empty state: when disabled -->
      <div
        v-if="!isServiceEnabled"
        class="flex flex-col items-center gap-5 rounded-md bg-gray-100 dark:bg-gray-700 px-8 py-7"
      >
        <FontAwesomeIcon
          :icon="faLocationDot"
          class="size-12 text-gray-400 dark:text-gray-500"
          aria-hidden="true"
        />
        <div class="flex flex-col items-center gap-1 text-center">
          <p class="text-base font-medium text-gray-700 dark:text-gray-200">
            {{ t('standalone.threat_shield.service_disabled') }}
          </p>
          <p class="text-sm text-gray-500 dark:text-gray-400">
            {{ t('standalone.threat_shield.service_disabled_description') }}
          </p>
        </div>
      </div>

      <!-- Regions + countries panel: when enabled -->
      <div
        v-if="isServiceEnabled"
        class="flex flex-col gap-4 md:flex-row md:h-100"
      >
        
        <!-- Left: regions list -->
        <div class="flex w-full shrink-0 flex-col gap-2 overflow-y-auto md:w-1/2">
          <div
            v-for="region in regions"
            :key="region.id"
            class="relative flex cursor-pointer items-center rounded-md px-5 py-4 transition-colors justify-center"
            :class="
              selectedRegionId === region.id
                ? 'bg-gray-100 dark:bg-gray-700'
                : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700'
            "
            @click="selectRegion(region.id)"
          >
            <!-- Left: icon + name + country count -->
            <div class="flex min-w-0 flex-1 items-center gap-3">
              <FontAwesomeIcon
                :icon="region.icon"
                aria-hidden="true"
                class="size-8 shrink-0 text-gray-600 dark:text-gray-300"
              />
              <div class="flex min-w-0 flex-col text-sm leading-5">
                <span class="truncate font-medium text-gray-900 dark:text-gray-100">
                  {{ t(region.nameKey) }}
                </span>
                <span class="truncate text-gray-500 dark:text-gray-400">
                  {{ t('standalone.threat_shield.countries_count', { count: region.countries.length }) }}
                </span>
              </div>
            </div>
            <!-- Center: badge with number of blocked countries --> 
            <div class="absolute inset-x-0 flex items-center justify-center">
              <NeBadge
                v-if="blockedCountriesCount(region) > 0"
                kind="custom"
                custom-color-classes="bg-indigo-100 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-100"
                :text="t('standalone.threat_shield.n_blocked', { count: blockedCountriesCount(region) })"
              />
            </div>
            <!-- Right: chevron -->
            <FontAwesomeIcon
              :icon="faChevronRight"
              class="size-4 shrink-0 text-gray-400"
              aria-hidden="true"
            />
          </div>
        </div>
        
        <!-- Right: countries panel for selected region -->
        <div
          v-if="selectedRegion"
          class="flex flex-1 flex-col gap-4 overflow-hidden"
        >
          <!-- Info header -->
          <p class="text-lg font-medium leading-7 text-gray-500 dark:text-gray-400">
            {{
              t('standalone.threat_shield.countries_blocked_in', {
                selected: selectedCountriesCount,
                total: selectedRegion.countries.length,
                region: t(selectedRegion.nameKey)
              })
            }}
          </p>
          <!-- Search -->
          <NeTextInput
            v-model="countrySearch"
            :placeholder="t('standalone.threat_shield.search_country')"
            class="w-full"
          >
            <template #prefix>
              <FontAwesomeIcon
                :icon="['fas', 'magnifying-glass']"
                class="size-4 text-gray-400"
                aria-hidden="true"
              />
            </template>
          </NeTextInput>
          <!-- Select / Deselect buttons -->
          <div class="flex gap-4">
            <NeButton kind="tertiary" size="sm" @click="selectAll">
              {{ t('standalone.threat_shield.select_all') }}
            </NeButton>
            <NeButton kind="tertiary" size="sm" @click="deselectAll">
              {{ t('standalone.threat_shield.deselect_all') }}
            </NeButton>
          </div>
          <!-- Country list -->
          <div class="flex flex-1 flex-col gap-2 overflow-y-auto pr-2">
            <div
              v-for="country in filteredCountries"
              :key="country.code"
              class="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 p-2"
            >
              <NeCheckbox
                v-model="country.selected"
                :label="`${country.name} (${country.code})`"
              />
              <NeBadge
                v-if="country.selected"
                kind="custom"
                custom-color-classes="bg-indigo-100 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-100"
                :text="t('standalone.threat_shield.blocked')"
                :rounded="true"
                size="xs"
              />
            </div>
          </div>
        </div>
      </div>
    
    </div>

    <!-- Save button -->
    <div>
      <NeButton kind="primary" class="w-full sm:w-auto" :loading="savingRegions" @click="saveRegions">
        <template #prefix>
          <FontAwesomeIcon :icon="['fas', 'floppy-disk']" class="size-4" aria-hidden="true" />
        </template>
        {{ t('common.save') }}
      </NeButton>
    </div>

  </div>
</template>