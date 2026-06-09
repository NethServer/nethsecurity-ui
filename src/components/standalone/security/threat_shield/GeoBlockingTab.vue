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
import { useRouter } from 'vue-router'
import { getStandaloneRoutePrefix } from '@/lib/router'
import {
  faCircleCheck,
  faCircleXmark,
  faLocationDot,
  faEarthAfrica,
  faEarthAmericas,
  faEarthAsia,
  faEarthEurope,
  faEarthOceania,
  faChevronRight,
  faChevronLeft,
  faGlobe,
  faMagnifyingGlass,
  faShield,
  faArrowRight,
  faFloppyDisk
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import {
  NeTextInput,
  NeButton,
  NeCheckbox,
  NeBadge,
  NeToggle,
  NeEmptyState,
  NeInlineNotification,
  NeSkeleton,
  NeDropdownFilter,
  getAxiosErrorMessage,
  type FilterOption
} from '@nethesis/vue-components'

const { t } = useI18n()
const router = useRouter()
const uciChangesStore = useUciPendingChangesStore()

const error = ref({
  notificationTitle: '',
  notificationDescription: '',
  notificationDetails: ''
})
const fetchError = ref(false)
const loading = ref(true)

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

const REGION_META: Record<string, { nameKey: string; icon: typeof faEarthAfrica }> = {
  africa: { nameKey: 'standalone.threat_shield.africa', icon: faEarthAfrica },
  americas: { nameKey: 'standalone.threat_shield.americas', icon: faEarthAmericas },
  asia: { nameKey: 'standalone.threat_shield.asia', icon: faEarthAsia },
  europe: { nameKey: 'standalone.threat_shield.europe', icon: faEarthEurope },
  oceania: { nameKey: 'standalone.threat_shield.oceania', icon: faEarthOceania },
  others: { nameKey: 'standalone.threat_shield.others', icon: faGlobe }
}

const regions = ref<Region[]>([])

function blockedCountriesCount(region: Region): number {
  return region.countries.filter((c) => c.selected).length
}

// total number of blocked countries across all regions (only if service is enabled)
const totalBlockedCountries = computed(() =>
  savedServiceEnabled.value ? savedBlockedCountriesCount.value : 0
)

const selectedRegionId = ref<string | null>(null)

const selectedRegion = computed(
  () => regions.value.find((r) => r.id === selectedRegionId.value) ?? null
)

const countrySearch = ref('')
const countryStatusFilter = ref<string[]>([])

const countryStatusFilterOptions = computed<FilterOption[]>(() => [
  { id: 'blocked', label: t('standalone.threat_shield.status_blocked') },
  { id: 'not_blocked', label: t('standalone.threat_shield.status_not_blocked') }
])

const filteredCountries = computed(
  () =>
    selectedRegion.value?.countries.filter((c) => {
      const matchesSearch = `${localCountryName(c.code, c.name)} (${c.code})`
        .toLowerCase()
        .includes(countrySearch.value.toLowerCase())
      const matchesStatus =
        countryStatusFilter.value.length === 0 ||
        (countryStatusFilter.value.includes('blocked') && c.selected) ||
        (countryStatusFilter.value.includes('not_blocked') && !c.selected)
      return matchesSearch && matchesStatus
    }) ?? []
)

const selectedCountriesCount = computed(
  () => selectedRegion.value?.countries.filter((c) => c.selected).length ?? 0
)

function selectRegion(regionId: string) {
  // clicking the already-open region closes the panel
  selectedRegionId.value = selectedRegionId.value === regionId ? null : regionId
  countrySearch.value = ''
  countryStatusFilter.value = []
}

function selectAll() {
  selectedRegion.value?.countries.forEach((c) => (c.selected = true))
}

function deselectAll() {
  selectedRegion.value?.countries.forEach((c) => (c.selected = false))
}

function localCountryName(code: string, fallback: string) {
  const key = 'standalone.threat_shield.countries.' + code
  const val = t(key)
  return val === key ? fallback : val
}

const savingRegions = ref(false)
const isServiceEnabled = ref(false)
const savedServiceEnabled = ref(false)
const savedBlockedCountriesCount = ref(0)
const isThreatShieldEnabled = ref(false)

async function saveGeoblockingConfiguration() {
  savingRegions.value = true
  error.value.notificationDescription = ''
  error.value.notificationTitle = ''
  error.value.notificationDetails = ''

  try {
    // extract all blocked country codes across all regions
    const blockedCountries = regions.value.flatMap((region) =>
      region.countries.filter((c) => c.selected).map((c) => c.code)
    )

    const payload = {
      enabled: isServiceEnabled.value,
      countries: blockedCountries
    }

    await ubusCall('ns.threatshield', 'set-geoblocking-configuration', payload)
    await uciChangesStore.getChanges()

    // update saved state to reflect what was just persisted
    savedServiceEnabled.value = isServiceEnabled.value
    savedBlockedCountriesCount.value = isServiceEnabled.value ? blockedCountries.length : 0
  } catch (err: unknown) {
    error.value.notificationTitle = t('error.cannot_save_configuration')
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = String(err)
  } finally {
    savingRegions.value = false
  }
}

async function fetchCountries() {
  error.value.notificationDescription = ''
  error.value.notificationDetails = ''
  fetchError.value = false

  try {
    loading.value = true
    const response = (await ubusCall('ns.threatshield', 'geoblocking-configuration')).data
    isThreatShieldEnabled.value = (
      await ubusCall('ns.threatshield', 'list-settings')
    ).data.data.enabled
    isServiceEnabled.value = response.enabled
    savedServiceEnabled.value = response.enabled
    regions.value = (
      response.regions as Record<
        string,
        { code: string; description: string; blocked: boolean }[]
      >[]
    ).flatMap((regionObj) =>
      Object.entries(regionObj).map(([regionId, countries]) => {
        const meta = REGION_META[regionId] ?? { nameKey: regionId, icon: faGlobe }
        return {
          id: regionId,
          nameKey: meta.nameKey,
          icon: meta.icon,
          countries: countries.map((c) => ({
            code: c.code,
            name: c.description,
            selected: c.blocked
          }))
        }
      })
    )
    // initialize saved count from loaded data
    savedBlockedCountriesCount.value = response.enabled
      ? regions.value.reduce((sum, r) => sum + blockedCountriesCount(r), 0)
      : 0
  } catch (err: unknown) {
    error.value.notificationDescription = t(getAxiosErrorMessage(err))
    error.value.notificationDetails = String(err)
    fetchError.value = true
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchCountries()
})
</script>

<template>
  <!-- show skeleton when loading -->
  <NeSkeleton v-if="loading" :lines="6" size="lg" />

  <!-- show error/template when loading is completed -->
  <div v-else class="flex flex-col gap-y-2">
    <!-- show error notification if there is an error -->
    <NeInlineNotification
      v-if="error.notificationTitle"
      kind="error"
      :title="error.notificationTitle"
      :description="error.notificationDescription"
      class="my-2"
      ><template v-if="error.notificationDetails" #details>
        {{ error.notificationDetails }}
      </template></NeInlineNotification
    >

    <!-- show geoip blocking content if there is no fetch error -->
    <template v-if="!fetchError">
      <!-- geoblocking service description -->
      <div
        :class="[
          'flex',
          'flex-col',
          'gap-y-6',
          'mb-7',
          selectedRegionId !== null ? 'max-md:hidden' : ''
        ]"
      >
        <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.threat_shield.geoblocking_description') }}
        </p>
      </div>

      <!-- banip not active: show empty state -->
      <NeEmptyState
        v-if="!isThreatShieldEnabled"
        :title="t('standalone.threat_shield.threat_shield_disabled')"
        :description="t('standalone.threat_shield.threat_shield_disabled_description')"
        :icon="faShield"
        class="pb-8"
      >
        <NeButton
          kind="primary"
          @click="
            router.push(`${getStandaloneRoutePrefix()}/security/threat-shield-ip?tab=settings`)
          "
        >
          <template #prefix>
            <FontAwesomeIcon :icon="faArrowRight" class="h-4 w-4" aria-hidden="true" />
          </template>
          {{ t('standalone.threat_shield.go_to_settings') }}
        </NeButton>
      </NeEmptyState>

      <!-- banip active: show geoblocking UI -->
      <template v-else>
        <div
          :class="[
            'flex',
            'flex-col',
            'rounded-md',
            'border-l-6',
            'border-indigo-500',
            'dark:border-indigo-400',
            'bg-white',
            'dark:bg-gray-950',
            'sm:shadow',
            'sm:rounded-lg',
            'md:flex-row',
            'md:items-stretch',
            'p-2',
            'mb-1',
            selectedRegionId !== null ? 'max-md:hidden' : ''
          ]"
        >
          <!-- icon + title -->
          <div
            class="flex shrink-0 items-center gap-4 px-6 py-4 md:border-r md:border-gray-200 md:dark:border-gray-700"
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
            <span
              class="text-base font-medium whitespace-nowrap text-primary-neutral dark:text-primary-neutral"
            >
              {{ t('standalone.threat_shield.geo_ip_blocking') }}
            </span>
          </div>

          <!-- blocked countries + status -->
          <div class="flex flex-1 flex-col justify-center md:flex-row md:items-center">
            <!-- blocked countries cell -->
            <div class="flex flex-1 items-center px-6 py-4 md:justify-center">
              <div class="flex w-full items-center justify-between md:w-auto md:gap-8">
                <span
                  class="text-sm font-medium whitespace-nowrap text-primary-neutral dark:text-primary-neutral"
                >
                  {{ t('standalone.threat_shield.blocked_countries') }}
                </span>
                <span
                  class="text-3xl leading-9 font-medium text-secondary-neutral dark:text-secondary-neutral"
                >
                  {{ totalBlockedCountries }}
                </span>
              </div>
            </div>
            <!-- status cell -->
            <div class="flex flex-1 items-center px-6 py-4 md:justify-center">
              <div class="flex w-full items-center justify-between md:w-auto md:gap-8">
                <span
                  class="text-sm font-medium whitespace-nowrap text-primary-neutral dark:text-primary-neutral"
                >
                  {{ t('common.status') }}
                </span>
                <div class="flex items-center gap-2">
                  <FontAwesomeIcon
                    :icon="savedServiceEnabled ? faCircleCheck : faCircleXmark"
                    :class="['size-4', savedServiceEnabled ? 'text-enabled' : 'text-disabled']"
                    aria-hidden="true"
                  />
                  <span
                    class="text-sm font-medium whitespace-nowrap text-secondary-neutral dark:text-secondary-neutral"
                  >
                    {{ savedServiceEnabled ? t('common.enabled') : t('common.disabled') }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- service card -->
        <div class="mt-2 flex flex-col rounded-lg bg-white p-6 shadow-md dark:bg-gray-950">
          <!-- title + toggle -->
          <div
            :class="['flex', 'flex-col', 'gap-2', selectedRegionId !== null ? 'max-md:hidden' : '']"
          >
            <h2 class="text-lg font-medium text-primary-neutral dark:text-primary-neutral">
              {{ t('standalone.threat_shield.geo_ip_blocking') }}
            </h2>
            <NeToggle
              v-model="isServiceEnabled"
              :label="isServiceEnabled ? t('common.enabled') : t('common.disabled')"
            />
          </div>

          <!-- warning message -->
          <NeInlineNotification
            v-if="isServiceEnabled"
            kind="warning"
            :class="['mt-5', selectedRegionId !== null ? 'max-md:hidden' : '']"
            :title="t('standalone.threat_shield.avoid_blocking_title')"
            :description="t('standalone.threat_shield.avoid_blocking_description')"
          />

          <!-- regions and countries section -->
          <div class="mt-5 flex flex-col gap-2">
            <h3
              v-if="isServiceEnabled"
              :class="[
                'text-lg',
                'font-medium',
                'text-primary-neutral',
                'dark:text-primary-neutral',
                selectedRegionId !== null ? 'max-md:hidden' : ''
              ]"
            >
              {{ t('standalone.threat_shield.regions_and_countries') }}
            </h3>

            <!-- service is enabled, show regions + countries panel -->
            <div
              v-if="isServiceEnabled"
              class="mb-4 flex flex-col gap-4 md:grid md:grid-cols-[1fr_1px_1fr] md:gap-5"
            >
              <!-- left panel: regions list (hidden on mobile when a region is selected) -->
              <div
                :class="[
                  'flex',
                  'flex-col',
                  'gap-2',
                  selectedRegionId !== null ? 'hidden md:flex' : ''
                ]"
              >
                <div
                  v-for="region in regions"
                  :key="region.id"
                  style="grid-template-columns: 1fr 1fr auto"
                  :class="[
                    'bg-gray-50',
                    'dark:bg-gray-900',
                    'hover:bg-gray-100',
                    'dark:hover:bg-gray-800',
                    'grid',
                    'cursor-pointer',
                    'items-center',
                    'rounded-md',
                    'px-5',
                    'py-4',
                    'transition-colors',
                    selectedRegionId === region.id
                      ? 'border-2 border-cyan-500 dark:border-cyan-200'
                      : ''
                  ]"
                  @click="selectRegion(region.id)"
                >
                  <!-- icon + name + country count -->
                  <div class="flex min-w-0 items-center gap-3">
                    <FontAwesomeIcon
                      :icon="region.icon"
                      aria-hidden="true"
                      class="size-8 shrink-0 text-primary-neutral dark:text-primary-neutral"
                    />
                    <div class="flex min-w-0 flex-col text-sm leading-5">
                      <span
                        class="truncate font-medium text-primary-neutral dark:text-primary-neutral"
                      >
                        {{ t(region.nameKey) }}
                      </span>
                      <span class="truncate text-tertiary-neutral dark:text-gray-400">
                        {{
                          t('standalone.threat_shield.countries_count', {
                            count: region.countries.length
                          })
                        }}
                      </span>
                    </div>
                  </div>
                  <!-- badge with number of blocked countries -->
                  <div class="flex justify-start">
                    <NeBadge
                      v-if="blockedCountriesCount(region) > 0"
                      kind="custom"
                      custom-color-classes="font-medium bg-indigo-100 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-100"
                      :text="
                        t('standalone.threat_shield.n_blocked', {
                          count: blockedCountriesCount(region)
                        })
                      "
                      :rounded="true"
                      size="xs"
                    />
                  </div>
                  <!-- chevron -->
                  <FontAwesomeIcon
                    :icon="faChevronRight"
                    class="size-4 shrink-0 text-primary-neutral dark:text-primary-neutral"
                    aria-hidden="true"
                  />
                </div>
              </div>

              <!-- vertical divider -->
              <div class="hidden bg-gray-200 md:block dark:bg-gray-700" />

              <!-- right panel: empty state when no region is selected -->
              <NeEmptyState
                v-if="!selectedRegion"
                :icon="faLocationDot"
                :title="t('standalone.threat_shield.no_region_selected')"
                :description="t('standalone.threat_shield.no_region_selected_description')"
                class="hidden flex-col items-center justify-center bg-white text-center md:flex dark:bg-gray-950"
              />

              <!-- right panel: countries panel for selected region -->
              <div v-if="selectedRegion" class="flex flex-col gap-4 md:relative">
                <!-- mobile back button -->
                <div
                  class="flex cursor-pointer items-center gap-2 md:hidden"
                  @click="selectedRegionId = null"
                >
                  <FontAwesomeIcon
                    :icon="faChevronLeft"
                    class="size-5 text-primary-neutral dark:text-primary-neutral"
                    aria-hidden="true"
                  />
                  <h3 class="text-2xl font-medium text-primary-neutral dark:text-primary-neutral">
                    {{ t(selectedRegion.nameKey) }}
                  </h3>
                </div>
                <div class="flex flex-col gap-4 md:absolute md:inset-0 md:overflow-hidden">
                  <!-- info header -->
                  <div class="mt-1 mr-1 flex flex-wrap items-center justify-between gap-2">
                    <p
                      class="text-lg font-medium text-secondary-neutral dark:text-secondary-neutral"
                    >
                      {{
                        t('standalone.threat_shield.countries_blocked_in', {
                          selected: selectedCountriesCount,
                          total: selectedRegion.countries.length,
                          region: t(selectedRegion.nameKey)
                        })
                      }}
                    </p>
                    <!-- block all / allow all buttons -->
                    <div class="flex gap-4">
                      <NeButton kind="tertiary" size="sm" @click="selectAll">
                        {{ t('standalone.threat_shield.block_all') }}
                      </NeButton>
                      <NeButton kind="tertiary" size="sm" @click="deselectAll">
                        {{ t('standalone.threat_shield.allow_all') }}
                      </NeButton>
                    </div>
                  </div>
                  <!-- filters row: search + status dropdown -->
                  <div class="flex items-center gap-4">
                    <NeTextInput
                      v-model="countrySearch"
                      :placeholder="t('standalone.threat_shield.filter_country')"
                      class="flex-1"
                    >
                      <template #prefix>
                        <FontAwesomeIcon
                          :icon="faMagnifyingGlass"
                          class="size-4 text-primary-neutral dark:text-primary-neutral"
                          aria-hidden="true"
                        />
                      </template>
                    </NeTextInput>
                    <NeDropdownFilter
                      v-model="countryStatusFilter"
                      kind="checkbox"
                      :label="t('standalone.threat_shield.status_filter_label')"
                      :options="countryStatusFilterOptions"
                      :clear-search-label="t('ne_dropdown_filter.clear_search')"
                      :clear-filter-label="t('ne_dropdown_filter.clear_filter')"
                      :open-menu-aria-label="t('ne_dropdown_filter.open_filter')"
                      :no-options-label="t('ne_dropdown_filter.no_options')"
                      :more-options-hidden-label="t('ne_dropdown_filter.more_options_hidden')"
                      :align-to-right="true"
                      class="mr-1"
                    />
                  </div>
                  <!-- country list -->
                  <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-2">
                    <div
                      v-for="country in filteredCountries"
                      :key="country.code"
                      class="flex items-center justify-between border-b border-gray-200 p-2 dark:border-gray-700"
                    >
                      <NeCheckbox
                        v-model="country.selected"
                        :label="`${localCountryName(country.code, country.name)} (${country.code})`"
                      />
                      <NeBadge
                        v-if="country.selected"
                        kind="custom"
                        custom-color-classes="font-medium bg-indigo-100 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-100"
                        :text="t('standalone.threat_shield.blocked')"
                        :rounded="true"
                        size="xs"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- save/apply changes button -->
          <div class="mt-2">
            <!-- mobile: show "Go back to regions" button when region is selected, which closes the countries panel -->
            <NeButton
              v-if="isThreatShieldEnabled && isServiceEnabled && selectedRegionId !== null"
              kind="primary"
              class="w-full md:hidden"
              @click="selectedRegionId = null"
            >
              {{ t('standalone.threat_shield.go_back_to_regions') }}
            </NeButton>
            <!-- mobile: show "Save" button when no region is selected (regions list view) -->
            <NeButton
              v-if="isThreatShieldEnabled && selectedRegionId === null"
              kind="primary"
              class="w-full md:hidden"
              :loading="savingRegions"
              @click="saveGeoblockingConfiguration"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="faFloppyDisk" class="size-4" aria-hidden="true" />
              </template>
              {{ t('common.save') }}
            </NeButton>
            <!-- desktop/tablet: show "Save" button always when threat shield is enabled -->
            <NeButton
              v-if="isThreatShieldEnabled"
              kind="primary"
              class="hidden w-full md:inline-flex md:w-auto"
              :loading="savingRegions"
              @click="saveGeoblockingConfiguration"
            >
              <template #prefix>
                <FontAwesomeIcon :icon="faFloppyDisk" class="size-4" aria-hidden="true" />
              </template>
              {{ t('common.save') }}
            </NeButton>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
