<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  getHumanizedAppName,
  getHumanizedCategoryName,
  type DpiAppOrProtocol,
  type DpiRule,
  getAppIcon
} from '@/lib/standalone/dpi'
import { ubusCall } from '@/lib/standalone/ubus'
import {
  NeCombobox,
  NeCard,
  type NeComboboxOption,
  NeInlineNotification,
  NeTooltip,
  NeButton,
  NeSkeleton,
  getAxiosErrorMessage,
  focusElement,
  NeEmptyState,
  NeTextInput
} from '@nethesis/vue-components'
import { NeModal, NeToggle } from '@nethesis/vue-components'
import { ref, watch, computed, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import { watchDebounced } from '@vueuse/core'
import { isEmpty } from 'lodash-es'
import { MessageBag, validateRequired } from '@/lib/validation'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  },
  ruleToEdit: {
    type: Object as PropType<DpiRule>,
    default: undefined
  },
  allRules: {
    type: Array as PropType<DpiRule[]>,
    default: () => []
  }
})

const emit = defineEmits(['close', 'reloadData'])

const APP_SEARCH_MIN_CHARS = 2
const APP_SEARCH_MAX_RESULTS = 24
const APP_SEARCH_SKELETON_CARDS = 8
const { t } = useI18n()
const enableRule = ref(true)
const sourceIface = ref()
const interfaces = ref<NeComboboxOption[]>([])
const popularApps = ref<DpiAppOrProtocol[]>([])
const searchQuery = ref('')
const searchQueryRef = ref()
const isSearching = ref(false)
const totalNumApps = ref(0)
const totalSearchResults = ref(0)
const selectedAppFlags = ref<Record<string, boolean>>({})
const appSearchResults = ref<DpiAppOrProtocol[]>([])
const interfaceRef = ref()

let loading = ref({
  listApplications: false,
  listDevices: false,
  listPopularApps: false,
  addRule: false,
  editRule: false
})

let error = ref({
  interface: '',
  listApplicationsErrorTitle: '',
  listApplicationsErrorDescription: '',
  listApplicationsErrorDetails: '',
  listDevicesErrorTitle: '',
  listDevicesErrorDescription: '',
  listDevicesErrorDetails: '',
  listPopularAppsErrorTitle: '',
  listPopularAppsErrorDescription: '',
  listPopularAppsErrorDetails: '',
  addRuleErrorTitle: '',
  addRuleErrorDescription: '',
  addRuleErrorDetails: '',
  editRuleErrorTitle: '',
  editRuleErrorDescription: '',
  editRuleErrorDetails: ''
})
const errorBag = ref(new MessageBag())

const isCreating = computed(() => {
  return !props.ruleToEdit
})

const appsToDisplay = computed(() => {
  if (isSearching.value) {
    return appSearchResults.value
  } else {
    return popularApps.value
  }
})

const numAppsSelected = computed(() => {
  let sum = 0

  Object.values(selectedAppFlags.value).forEach((isSelected) => {
    if (isSelected) {
      sum++
    }
  })
  return sum
})

interface ListDevicesElement {
  device: string
  interface: string
}

watch(
  () => props.visible,
  () => {
    if (props.visible) {
      if (props.ruleToEdit) {
        // editing rule
        enableRule.value = props.ruleToEdit.enabled
      } else {
        enableRule.value = true
      }
      sourceIface.value = undefined
      interfaces.value = []
      popularApps.value = []
      searchQuery.value = ''
      isSearching.value = false
      totalNumApps.value = 0
      totalSearchResults.value = 0
      selectedAppFlags.value = {}
      appSearchResults.value = []

      clearErrors()
      errorBag.value.clear()
      listPopularApps()
      listDevices()
      getTotalNumApps()
    }
  }
)

watchDebounced(
  searchQuery,
  () => {
    searchApps()
  },
  { debounce: 500 }
)

function clearErrors() {
  error.value.interface = ''
  error.value.listApplicationsErrorTitle = ''
  error.value.listApplicationsErrorDescription = ''
  error.value.listApplicationsErrorDetails = ''
  error.value.listDevicesErrorTitle = ''
  error.value.listDevicesErrorDescription = ''
  error.value.listDevicesErrorDetails = ''
  error.value.listPopularAppsErrorTitle = ''
  error.value.listPopularAppsErrorDescription = ''
  error.value.listPopularAppsErrorDetails = ''
  error.value.addRuleErrorTitle = ''
  error.value.addRuleErrorDescription = ''
  error.value.addRuleErrorDetails = ''
  error.value.editRuleErrorTitle = ''
  error.value.editRuleErrorDescription = ''
  error.value.editRuleErrorDetails = ''
}

function clearSearch() {
  searchQuery.value = ''
  totalSearchResults.value = 0
  searchApps()
  focusElement(searchQueryRef)
}

async function listPopularApps() {
  error.value.listPopularAppsErrorTitle = ''
  error.value.listPopularAppsErrorDescription = ''
  error.value.listPopularAppsErrorDetails = ''
  loading.value.listPopularApps = true

  try {
    const res = await ubusCall('ns.dpi', 'list-popular')
    popularApps.value = res.data.values.data

    // if editing a rule, select blocked apps
    if (props.ruleToEdit) {
      props.ruleToEdit.criteria.forEach((app) => {
        selectedAppFlags.value[app.name] = true

        const isPopular = popularApps.value.find((popularApp) => popularApp.name === app.name)

        if (!isPopular) {
          popularApps.value.unshift(app)
        }
      })
    }
  } catch (err: any) {
    console.error(err)
    error.value.listPopularAppsErrorTitle = t('error.cannot_retrieve_popular_apps')
    error.value.listPopularAppsErrorDescription = t(getAxiosErrorMessage(err))
    error.value.listPopularAppsErrorDetails = err.toString()
  } finally {
    loading.value.listPopularApps = false
  }
}

async function listDevices() {
  error.value.listDevicesErrorTitle = ''
  error.value.listDevicesErrorDescription = ''
  error.value.listDevicesErrorDetails = ''
  loading.value.listDevices = true

  try {
    const res = await ubusCall('ns.dpi', 'list-devices')

    // show only devices not used by other DPI rules (include currently selected device when editing a rule)

    const filteredDevices = res.data.values.filter((el: ListDevicesElement) => {
      const ruleUsesDevice = props.allRules.find((rule) => rule.device === el.device)
      return !ruleUsesDevice || props.ruleToEdit?.device === el.device
    })

    // prepare combobox options

    interfaces.value = filteredDevices.map((el: ListDevicesElement) => {
      return {
        id: el.device,
        label: el.interface,
        description: el.device
      }
    })

    if (props.ruleToEdit) {
      // select current interface
      sourceIface.value = props.ruleToEdit.device
    }
  } catch (err: any) {
    console.error(err)
    error.value.listDevicesErrorTitle = t('error.cannot_retrieve_devices')
    error.value.listDevicesErrorDescription = t(getAxiosErrorMessage(err))
    error.value.listDevicesErrorDetails = err.toString()
  } finally {
    loading.value.listDevices = false
  }
}

async function getTotalNumApps() {
  try {
    const res = await ubusCall('ns.dpi', 'list-applications', {
      limit: 1
    })
    totalNumApps.value = res.data?.values.meta.total
  } catch (err: any) {
    console.error(err)
  }
}

async function searchApps() {
  if (searchQuery.value.length < APP_SEARCH_MIN_CHARS) {
    // show popular apps
    isSearching.value = false
    return
  }
  error.value.listApplicationsErrorTitle = ''
  error.value.listApplicationsErrorDescription = ''
  error.value.listApplicationsErrorDetails = ''
  loading.value.listApplications = true

  try {
    // replace spaces with dashes in search query
    const res = await ubusCall('ns.dpi', 'list-applications', {
      search: searchQuery.value.replace(/ /g, '-'),
      limit: APP_SEARCH_MAX_RESULTS
    })
    appSearchResults.value = res.data.values.data
    totalSearchResults.value = res.data.values.meta.total
    isSearching.value = true
  } catch (err: any) {
    console.error(err)
    error.value.listApplicationsErrorTitle = t('error.cannot_retrieve_applications')
    error.value.listApplicationsErrorDescription = t(getAxiosErrorMessage(err))
    error.value.listApplicationsErrorDetails = err.toString()
  } finally {
    loading.value.listApplications = false
  }
}

function getSelectedApplicationNames() {
  const selectedApplicationNames = []

  for (const [appName, isSelected] of Object.entries(selectedAppFlags.value) as [
    string,
    boolean
  ][]) {
    if (isSelected) {
      const appFound = popularApps.value.find((popularApp) => popularApp.name === appName)

      if (appFound && appFound.type === 'application') {
        selectedApplicationNames.push(appName)
      }
    }
  }
  return selectedApplicationNames
}

function getSelectedProtocolNames() {
  const selectedProtocolNames = []

  for (const [appName, isSelected] of Object.entries(selectedAppFlags.value) as [
    string,
    boolean
  ][]) {
    if (isSelected) {
      const appFound = popularApps.value.find((popularApp) => popularApp.name === appName)

      if (appFound && appFound.type === 'protocol') {
        selectedProtocolNames.push(appName)
      }
    }
  }
  return selectedProtocolNames
}

function validate() {
  clearErrors()
  let isValidationOk = true

  errorBag.value.clear()

  // source interface

  const sourceIfaceValidation = validateRequired(sourceIface.value)

  if (!sourceIfaceValidation.valid) {
    errorBag.value.set('interface', [String(sourceIfaceValidation.errMessage)])
    if (isValidationOk) {
      isValidationOk = false
      focusElement(interfaceRef)
    }
  }

  // apps and protocols

  if (numAppsSelected.value == 0) {
    errorBag.value.set('apps', ['standalone.dpi.select_at_least_one_app_or_protocol'])
    isValidationOk = false
  }

  return isValidationOk
}

async function addRule() {
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }
  error.value.addRuleErrorTitle = ''
  error.value.addRuleErrorDescription = ''
  error.value.addRuleErrorDetails = ''
  loading.value.addRule = true

  const selectedApplicationNames = getSelectedApplicationNames()
  const selectedProtocolNames = getSelectedProtocolNames()

  const addRuleData = {
    enabled: enableRule.value,
    device: sourceIface.value,
    applications: selectedApplicationNames,
    protocols: selectedProtocolNames
  }

  try {
    await ubusCall('ns.dpi', 'add-rule', addRuleData)
    emit('close')
    emit('reloadData')
  } catch (err: any) {
    console.error(err)
    error.value.addRuleErrorTitle = t('error.cannot_create_dpi_rule')
    error.value.addRuleErrorDescription = t(getAxiosErrorMessage(err))
    error.value.addRuleErrorDetails = err.toString()
  } finally {
    loading.value.addRule = false
  }
}

async function editRule() {
  const isValidationOk = validate()

  if (!isValidationOk) {
    return
  }
  error.value.editRuleErrorTitle = ''
  error.value.editRuleErrorDescription = ''
  error.value.editRuleErrorDetails = ''
  loading.value.editRule = true

  const selectedApplicationNames = getSelectedApplicationNames()
  const selectedProtocolNames = getSelectedProtocolNames()

  const editRuleData = {
    'config-name': props.ruleToEdit?.['config-name'],
    enabled: enableRule.value,
    device: sourceIface.value,
    applications: selectedApplicationNames,
    protocols: selectedProtocolNames
  }

  try {
    await ubusCall('ns.dpi', 'edit-rule', editRuleData)
    emit('close')
    emit('reloadData')
  } catch (err: any) {
    console.error(err)
    error.value.editRuleErrorTitle = t('error.cannot_edit_dpi_rule')
    error.value.editRuleErrorDescription = t(getAxiosErrorMessage(err))
    error.value.editRuleErrorDetails = err.toString()
  } finally {
    loading.value.editRule = false
  }
}

function onChange(ev: any, app: DpiAppOrProtocol) {
  const isSelected = ev.target.checked
  selectedAppFlags.value[app.name] = isSelected

  if (isSelected) {
    // add to popular apps if not already present
    const isPopular = popularApps.value.find((popularApp) => popularApp.name === app.name)

    if (!isPopular) {
      popularApps.value.unshift(app)
    }
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    size="xxl"
    :title="isCreating ? t('standalone.dpi.create_rule') : t('standalone.dpi.edit_rule')"
    :primaryLabel="isCreating ? t('standalone.dpi.create_rule') : t('standalone.dpi.save_rule')"
    :cancelLabel="t('common.cancel')"
    :primaryButtonDisabled="loading.addRule || loading.editRule"
    :primaryButtonLoading="loading.addRule || loading.editRule"
    :closeAriaLabel="t('common.close')"
    @close="emit('close')"
    @primaryClick="isCreating ? addRule() : editRule()"
  >
    <div class="space-y-6">
      <!-- status -->
      <NeToggle v-model="enableRule" :label="t('standalone.dpi.enable_rule')" />
      <!-- list devices error -->
      <NeInlineNotification
        v-if="error.listDevicesErrorTitle"
        kind="error"
        :title="error.listDevicesErrorTitle"
        :description="error.listDevicesErrorDescription"
      >
        <template #details v-if="error.listDevicesErrorDetails">
          {{ error.listDevicesErrorDetails }}
        </template>
      </NeInlineNotification>
      <!-- source interface -->
      <NeCombobox
        v-model="sourceIface"
        :options="interfaces"
        :label="t('standalone.dpi.source')"
        :placeholder="t('standalone.dpi.choose_interface')"
        :invalid-message="t(errorBag.getFirstI18nKeyFor('interface'))"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('standalone.dpi.no_interfaces_available')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
        :optionalLabel="t('common.optional')"
        class="max-w-xs"
        ref="interfaceRef"
      >
        <template #tooltip>
          <NeTooltip placement="right-end">
            <template #content>{{ t('standalone.dpi.source_tooltip') }}</template>
          </NeTooltip>
        </template>
      </NeCombobox>
      <div>
        <div class="mb-2 flex flex-col justify-between lg:flex-row lg:items-end">
          <div class="flex items-end">
            <NeTextInput
              :label="t('standalone.dpi.apps_and_protocols')"
              v-model.trim="searchQuery"
              :disabled="loading.listPopularApps"
              :placeholder="
                totalNumApps
                  ? t('standalone.dpi.apps_and_protocols_placeholder', { num: totalNumApps })
                  : ''
              "
              class="w-96"
              ref="searchQueryRef"
            />
          </div>
          <div class="mb-2 mt-4">
            {{
              t('standalone.dpi.num_apps_and_protocols_selected', {
                num: numAppsSelected,
                total: totalNumApps
              })
            }}
          </div>
        </div>
        <!-- apps and protocols -->
        <NeCard>
          <!-- list popular apps error -->
          <NeInlineNotification
            v-if="error.listPopularAppsErrorTitle"
            kind="error"
            :title="error.listPopularAppsErrorTitle"
            :description="error.listPopularAppsErrorDescription"
          >
            <template #details v-if="error.listPopularAppsErrorDetails">
              {{ error.listPopularAppsErrorDetails }}
            </template>
          </NeInlineNotification>
          <!-- list applications error -->
          <NeInlineNotification
            v-if="error.listApplicationsErrorTitle"
            kind="error"
            :title="error.listApplicationsErrorTitle"
            :description="error.listApplicationsErrorDescription"
          >
            <template #details v-if="error.listApplicationsErrorDetails">
              {{ error.listApplicationsErrorDetails }}
            </template>
          </NeInlineNotification>
          <!-- skeleton -->
          <template v-else-if="loading.listPopularApps || loading.listApplications">
            <div class="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 2xl:grid-cols-3">
              <div
                v-for="i in APP_SEARCH_SKELETON_CARDS"
                :key="i"
                class="overflow-hidden bg-gray-100 py-2 pl-4 pr-1 text-sm text-gray-700 dark:bg-gray-900 dark:text-gray-200 sm:rounded-lg sm:shadow"
              >
                <NeSkeleton :lines="2" />
              </div>
            </div>
          </template>
          <template v-else>
            <template v-if="isSearching">
              <div class="mb-4 flex items-center space-x-4">
                <div class="text-base">
                  {{ t('standalone.dpi.search_results') }}
                </div>
                <NeButton kind="tertiary" :disabled="!searchQuery" @click="clearSearch">{{
                  t('standalone.dpi.clear_search')
                }}</NeButton>
              </div>
              <NeEmptyState
                v-if="isEmpty(appsToDisplay)"
                :icon="['fas', 'circle-info']"
                :title="t('standalone.dpi.no_apps_or_protocols_found')"
                :description="t('standalone.dpi.try_changing_search_filter')"
              />
            </template>
            <!-- app cards -->
            <div class="grid grid-cols-1 gap-x-6 gap-y-3 md:grid-cols-2 2xl:grid-cols-3">
              <NeCard
                v-for="app in appsToDisplay"
                :key="app.id"
                :class="{ 'opacity-50': app.missing }"
                alternateBackground
              >
                <div class="flex min-w-0 grow items-center justify-between">
                  <div class="flex min-w-0 items-center gap-4">
                    <font-awesome-icon :icon="getAppIcon(app)" class="h-6 w-6" aria-hidden="true" />
                    <div class="flex flex-col">
                      <div class="font-medium">{{ getHumanizedAppName(app.name) }}</div>
                      <!-- unavailable app / category -->
                      <div
                        v-if="app.missing || app.category?.name"
                        class="text-xs uppercase text-gray-500 dark:text-gray-400"
                      >
                        <template v-if="app.missing">
                          {{ t('standalone.dpi.available_with_subscription') }}
                        </template>
                        <template v-else>
                          {{ t(`standalone.dpi.type_${app.type}`) }}
                          <template v-if="app.category?.name">
                            / {{ getHumanizedCategoryName(app.category?.name) }}
                          </template>
                        </template>
                      </div>
                    </div>
                  </div>
                  <NeToggle
                    :disabled="app.missing"
                    @change="onChange($event, app)"
                    v-model="selectedAppFlags[app.name]"
                    class="relative left-3"
                  />
                </div>
              </NeCard>
            </div>
            <!-- apps and protocols validation error -->
            <div
              v-if="errorBag.getFirstI18nKeyFor('apps')"
              class="mt-3 text-sm text-rose-700 dark:text-rose-400"
            >
              {{ t(errorBag.getFirstI18nKeyFor('apps')) }}
            </div>
            <!-- more search results message -->
            <div
              v-if="totalSearchResults > APP_SEARCH_MAX_RESULTS"
              class="mt-4 text-gray-500 dark:text-gray-400"
            >
              {{ t('standalone.dpi.continue_typing_to_show_other_search_results') }}
            </div>
          </template>
        </NeCard>
      </div>
      <!-- errors -->
      <NeInlineNotification
        v-if="error.addRuleErrorTitle"
        kind="error"
        :title="error.addRuleErrorTitle"
        :description="error.addRuleErrorDescription"
      >
        <template #details v-if="error.addRuleErrorDetails">
          {{ error.addRuleErrorDetails }}
        </template>
      </NeInlineNotification>
      <NeInlineNotification
        v-if="error.editRuleErrorTitle"
        kind="error"
        :title="error.editRuleErrorTitle"
        :description="error.editRuleErrorDescription"
      >
        <template #details v-if="error.editRuleErrorDetails">
          {{ error.editRuleErrorDetails }}
        </template>
      </NeInlineNotification>
    </div>
  </NeModal>
</template>
