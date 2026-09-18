<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  focusElement,
  getAxiosErrorMessage,
  NeBadgeV2,
  NeButton,
  NeCheckbox,
  NeEmptyState,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTabs,
  NeTextInput,
  NeTooltip
} from '@nethesis/vue-components'
import { computed, nextTick, ref, watch } from 'vue'
import { refDebounced } from '@vueuse/core'
import { useI18n } from 'vue-i18n'
import {
  faAngleLeft,
  faAngleRight,
  faCircleQuestion,
  faCubes,
  faMagnifyingGlass
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import * as v from 'valibot'
import {
  UNCATEGORIZED,
  useDpiCatalog,
  useDpiCatalogLabels,
  type DpiCatalogItem,
  type DpiCatalogKind
} from '@/composables/useDpiCatalog'
import {
  selectionsFromGroup,
  selectionsToPayload,
  useCreateApplicationGroup,
  useEditApplicationGroup,
  type DpiApplicationGroup,
  type DpiGroupSelection
} from '@/composables/useApplicationGroups'
import { useSubscriptionStore } from '@/stores/standalone/subscription'
import { MessageBag } from '@/lib/validation'
import { ValidationError } from '@/lib/standalone/ubus'

const {
  visible = false,
  group = undefined,
  duplicate = false
} = defineProps<{
  visible?: boolean
  /** set to edit or duplicate an existing group */
  group?: DpiApplicationGroup
  duplicate?: boolean
}>()

const emit = defineEmits<{
  close: []
  save: []
}>()

const { t } = useI18n()
const subscription = useSubscriptionStore()

const isEditing = computed(() => group !== undefined && !duplicate)
// without a subscription only community items are usable, so filtering them is offered
const showCommunityFilter = computed(() => !subscription.isActive)

const NAME_MAX_LENGTH = 64

const nameSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'required'),
    v.maxLength(NAME_MAX_LENGTH, 'name_too_long')
  )
})

const groupName = ref('')
const kind = ref<DpiCatalogKind>('applications')
const selectedCategoryId = ref('')
const showOnlyCommunity = ref(false)

const selections = ref<DpiGroupSelection[]>([])

const validationBag = ref(new MessageBag())
const showNoContentError = ref(false)
const nameRef = ref()
const isCategoryOpen = ref(false)

const isApplications = computed(() => kind.value === 'applications')

const nameFilter = ref('')
const debouncedNameFilter = refDebounced(nameFilter, 400)

const search = computed(() => (nameFilter.value ? debouncedNameFilter.value : ''))
const showOnlySelected = ref(false)

const nameError = computed(() => t(validationBag.value.getFirstI18nKeyFor('name')))

const otherErrors = computed(() =>
  [...validationBag.value.keys()]
    .filter((field) => field !== 'name')
    .map((field) => t(validationBag.value.getFirstI18nKeyFor(field)))
    .filter(Boolean)
)

const tabs = computed(() => [
  { name: 'applications', label: t('standalone.dpi.applications') },
  { name: 'protocols', label: t('standalone.dpi.protocols') }
])

const {
  categories,
  itemsByCategory,
  itemsOf,
  isLoading: isLoadingCatalog,
  isError: isCatalogError,
  error: catalogError
} = useDpiCatalog(kind, selectedCategoryId)

const { labelOf, categoryOf, isLoaded } = useDpiCatalogLabels()
const { mutate: createGroup, isPending: isCreating } = useCreateApplicationGroup()
const { mutate: editGroup, isPending: isEditingPending } = useEditApplicationGroup()

const isSaving = computed(() => isCreating.value || isEditingPending.value)

const selectedCategory = computed(() =>
  categories.value.find((category) => category.id === selectedCategoryId.value)
)

// the filters drive both panels, so they are applied once per category
const matchingItemsByCategory = computed(() => {
  const query = search.value.trim().toLowerCase()
  const onlySelected = showOnlySelected.value
  // items missing from the engine are never usable with a subscription, and hidden on request otherwise
  const onlyCommunity = subscription.isActive || showOnlyCommunity.value
  const groups = new Map<string, DpiCatalogItem[]>()

  for (const [categoryId, categoryItems] of itemsByCategory.value) {
    groups.set(
      categoryId,
      categoryItems.filter((item) => {
        if (query && !item.name.toLowerCase().includes(query)) {
          return false
        }
        if (onlyCommunity && item.disabled) {
          return false
        }
        return !onlySelected || isItemSelectedIn(item, categoryId)
      })
    )
  }

  return groups
})

// only the categories holding at least one matching item stay in the left panel
const visibleCategories = computed(() =>
  categories.value.filter((category) => matchingItemsByCategory.value.get(category.id)?.length)
)

const filteredItems = computed(
  () => matchingItemsByCategory.value.get(selectedCategoryId.value) ?? []
)

function resetFilters() {
  nameFilter.value = ''
  showOnlySelected.value = false
  showOnlyCommunity.value = false
}

const selectedItemsInCategory = computed(() => selectedItemsCount(selectedCategoryId.value))

const totalItemsInCategory = computed(() => itemsOf(selectedCategoryId.value).length)

const selectedCount = computed(() => selections.value.length)

watch(
  visibleCategories,
  (list) => {
    if (list.length && !list.some((category) => category.id === selectedCategoryId.value)) {
      selectedCategoryId.value = list[0]!.id
    }
  },
  { immediate: true }
)

watch(kind, () => {
  nameFilter.value = ''
})

watch(groupName, (name) => {
  if (name.trim()) {
    validationBag.value.delete('name')
  }
})

watch(
  selections,
  (list) => {
    if (list.length) {
      showNoContentError.value = false
      validationBag.value.delete('members')
    }
  },
  { deep: true }
)

watch(
  () => visible,
  (isShown) => {
    if (isShown) {
      groupName.value = group
        ? duplicate
          ? t('standalone.dpi.duplicated_group_name', { name: group.name })
          : group.name
        : ''
      selections.value = group ? selectionsFromGroup(group, { labelOf, categoryOf }) : []
      kind.value =
        selections.value.length &&
        !selections.value.some((selection) => selection.kind === 'applications')
          ? 'protocols'
          : 'applications'
      validationBag.value.clear()
      showNoContentError.value = false
      isCategoryOpen.value = false
      resetFilters()
      showOnlySelected.value = selections.value.length > 0
      selectedCategoryId.value = visibleCategories.value[0]?.id ?? ''
    }
  }
)

function indexOfSelection(type: DpiGroupSelection['type'], id: string) {
  return selections.value.findIndex(
    (selection) => selection.type === type && selection.id === id && selection.kind === kind.value
  )
}

function isCategorySelected(categoryId: string) {
  return indexOfSelection('category', categoryId) !== -1
}

function isItemSelectedIn(item: { id: string; disabled: boolean }, categoryId: string) {
  if (indexOfSelection('item', item.id) !== -1) {
    return true
  }
  return !item.disabled && isCategorySelected(categoryId)
}

function isItemSelected(item: { id: string; disabled: boolean }) {
  return isItemSelectedIn(item, selectedCategoryId.value)
}

function countedItems(categoryId: string) {
  return selections.value.filter(
    (selection) =>
      selection.type === 'item' &&
      selection.kind === kind.value &&
      selection.categoryId === categoryId
  )
}

function selectableItemsOf(categoryId: string) {
  return itemsOf(categoryId).filter((item) => !item.disabled)
}

function selectedItemsCount(categoryId: string) {
  return isCategorySelected(categoryId)
    ? selectableItemsOf(categoryId).length
    : countedItems(categoryId).length
}

function removeSelections(matches: (selection: DpiGroupSelection) => boolean) {
  selections.value = selections.value.filter((selection) => !matches(selection))
}

function addItems(items: { id: string; name: string }[], categoryId: string) {
  for (const item of items) {
    selections.value.push({
      type: 'item',
      kind: kind.value,
      id: item.id,
      name: item.name,
      categoryId
    })
  }
}

function selectWholeCategory(category: { id: string; name: string }) {
  removeSelections(
    (selection) =>
      selection.type === 'item' &&
      selection.kind === kind.value &&
      selection.categoryId === category.id
  )
  selections.value.push({
    type: 'category',
    kind: kind.value,
    id: category.id,
    name: category.name,
    categoryId: category.id
  })
}

function deselectCategory(categoryId: string) {
  removeSelections(
    (selection) =>
      selection.kind === kind.value &&
      (selection.categoryId === categoryId || selection.id === categoryId)
  )
}

function toggleCategory(category: { id: string; name: string }) {
  if (isCategorySelected(category.id)) {
    deselectCategory(category.id)
  } else {
    selectWholeCategory(category)
  }
}

function toggleItem(item: { id: string; name: string }) {
  const categoryId = selectedCategoryId.value

  if (isCategorySelected(categoryId)) {
    deselectCategory(categoryId)
    addItems(
      selectableItemsOf(categoryId).filter((selectable) => selectable.id !== item.id),
      categoryId
    )
    return
  }

  const index = indexOfSelection('item', item.id)
  if (index === -1) {
    addItems([item], categoryId)
  } else {
    selections.value.splice(index, 1)
  }

  if (categoryId === UNCATEGORIZED) {
    return
  }
  const selectable = selectableItemsOf(categoryId)
  const selectedIds = new Set(countedItems(categoryId).map((selection) => selection.id))
  if (selectable.length > 0 && selectable.every((entry) => selectedIds.has(entry.id))) {
    const category = categories.value.find((candidate) => candidate.id === categoryId)
    if (category) {
      selectWholeCategory(category)
    }
  }
}

// the engine does not load these members, so they cannot be toggled: they stay in the group
function isSelectionLocked(selection: DpiGroupSelection) {
  return selection.type === 'item' && !isLoaded(selection.kind, selection.id)
}

function removeSelection(index: number) {
  selections.value.splice(index, 1)
}

function selectionLabel(selection: DpiGroupSelection) {
  const key =
    selection.type === 'category'
      ? selection.kind === 'applications'
        ? 'selected_app_category'
        : 'selected_protocol_category'
      : selection.kind === 'applications'
        ? 'selected_app'
        : 'selected_protocol'
  return t(`standalone.dpi.${key}`, { name: selection.name })
}

function selectCategory(categoryId: string) {
  selectedCategoryId.value = categoryId
  isCategoryOpen.value = true
}

function close() {
  emit('close')
}

function validate() {
  validationBag.value.clear()
  showNoContentError.value = selections.value.length === 0

  const result = v.safeParse(nameSchema, { name: groupName.value })
  if (!result.success) {
    for (const issue of result.issues) {
      const field = issue.path?.[0]?.key
      if (typeof field === 'string') {
        validationBag.value.set(field, issue.message)
      }
    }
    isCategoryOpen.value = false
    nextTick(() => focusElement(nameRef))
  }

  return result.success && !showNoContentError.value
}

function onValidationError(e: Error) {
  if (e instanceof ValidationError) {
    validationBag.value = e.errorBag
  }
}

function save() {
  if (!validate()) {
    return
  }

  const payload = selectionsToPayload(groupName.value.trim(), selections.value)
  const callbacks = { onSuccess: () => emit('save'), onError: onValidationError }

  if (isEditing.value && group) {
    editGroup({ ...payload, id: group.id }, callbacks)
  } else {
    createGroup(payload, callbacks)
  }
}
</script>

<template>
  <NeModal
    :visible="visible"
    size="xxl"
    :title="
      isEditing
        ? t('standalone.dpi.edit_application_group')
        : t('standalone.dpi.create_application_group')
    "
    :primary-label="isEditing ? t('common.save') : t('common.create')"
    :primary-button-loading="isSaving"
    :primary-button-disabled="isSaving"
    :cancel-label="t('common.cancel')"
    :close-aria-label="t('common.close')"
    @close="close"
    @primary-click="save"
  >
    <div
      class="flex max-h-[calc(100vh-14rem)] flex-col gap-4 max-md:h-[calc(100vh-14rem)] max-sm:w-[calc(100vw-4rem)]"
    >
      <NeInlineNotification
        v-if="isCatalogError"
        kind="error"
        :title="t('error.cannot_retrieve_applications')"
        :description="t(getAxiosErrorMessage(catalogError))"
      />
      <NeInlineNotification
        v-for="message in otherErrors"
        :key="message"
        kind="error"
        :title="message"
      />
      <NeTextInput
        ref="nameRef"
        v-model="groupName"
        :label="t('standalone.dpi.group_name')"
        :placeholder="t('standalone.dpi.group_name_placeholder')"
        :invalid-message="nameError"
        :class="['w-full sm:max-w-sm', isCategoryOpen ? 'max-md:hidden' : '']"
      />
      <div class="flex min-h-0 flex-1 flex-col gap-4">
        <NeTabs
          :tabs="tabs"
          :selected="kind"
          :sr-tabs-label="t('ne_tabs.tabs')"
          :sr-select-tab-label="t('ne_tabs.select_a_tab')"
          :class="isCategoryOpen ? 'max-md:hidden' : ''"
          @select-tab="kind = $event as DpiCatalogKind"
        />
        <div
          class="flex flex-wrap items-center gap-6"
          :class="isCategoryOpen ? 'max-md:hidden' : ''"
        >
          <NeTextInput
            v-model="nameFilter"
            is-search
            :clear-search-label="t('common.clear_filter')"
            :placeholder="
              isApplications
                ? t('standalone.dpi.filter_applications')
                : t('standalone.dpi.filter_protocols')
            "
            class="w-full sm:max-w-sm"
          />
          <NeCheckbox v-model="showOnlySelected" :label="t('standalone.dpi.show_only_selected')" />
          <NeCheckbox
            v-if="showCommunityFilter"
            v-model="showOnlyCommunity"
            :label="
              isApplications
                ? t('standalone.dpi.show_only_community_apps')
                : t('standalone.dpi.show_only_community_protocols')
            "
          />
          <NeButton kind="tertiary" @click="resetFilters">
            {{ t('common.clear_filters') }}
          </NeButton>
        </div>
        <div class="flex min-h-0 flex-1 gap-4 md:h-146 md:flex-initial">
          <!-- no category survives the filters -->
          <NeEmptyState
            v-if="!isLoadingCatalog && !visibleCategories.length"
            :title="
              isApplications
                ? t('standalone.dpi.no_applications_found')
                : t('standalone.dpi.no_protocols_found')
            "
            :description="
              isApplications
                ? t('standalone.dpi.no_applications_found_description')
                : t('standalone.dpi.no_protocols_found_description')
            "
            :icon="faMagnifyingGlass"
            class="flex flex-1 flex-col items-center justify-center text-center [&>div>div]:max-w-2xl"
          >
            <NeButton kind="tertiary" size="lg" @click="resetFilters">
              {{ t('common.clear_filters') }}
            </NeButton>
          </NeEmptyState>
          <!-- categories -->
          <div
            v-else
            class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-4 md:border-r md:border-gray-200 md:dark:border-gray-700"
            :class="isCategoryOpen ? 'max-md:hidden' : ''"
          >
            <NeSkeleton v-if="isLoadingCatalog" :lines="10" />
            <div
              v-for="category in visibleCategories"
              v-else
              :key="category.id"
              role="button"
              tabindex="0"
              :aria-label="t('standalone.dpi.show_category_items', { category: category.name })"
              class="flex w-full shrink-0 cursor-pointer items-center justify-between gap-4 rounded-md bg-white px-5 py-2 shadow-sm transition-colors hover:bg-gray-100 dark:bg-gray-950 dark:hover:bg-gray-800"
              :class="
                category.id === selectedCategoryId
                  ? 'inset-ring-2 inset-ring-primary-700 dark:inset-ring-primary-500'
                  : ''
              "
              @click="selectCategory(category.id)"
              @keydown.enter="selectCategory(category.id)"
              @keydown.space.prevent="selectCategory(category.id)"
            >
              <div class="flex min-w-0 items-center gap-5 max-md:flex-1">
                <!-- a category with nothing selectable only holds items the engine cannot load -->
                <NeTooltip
                  v-if="category.selectable === 0"
                  trigger-event="mouseenter focus"
                  placement="top-start"
                  class="shrink-0 [&_input]:pointer-events-none"
                  @click.stop
                >
                  <template #trigger>
                    <NeCheckbox
                      :model-value="isCategorySelected(category.id)"
                      :aria-label="category.name"
                      disabled
                      @update:model-value="toggleCategory(category)"
                    />
                  </template>
                  <template #content>
                    {{ t('standalone.dpi.enterprise_subscription_only') }}
                  </template>
                </NeTooltip>
                <span v-else class="shrink-0" @click.stop>
                  <NeCheckbox
                    :model-value="isCategorySelected(category.id)"
                    :aria-label="category.name"
                    :disabled="category.id === UNCATEGORIZED"
                    @update:model-value="toggleCategory(category)"
                  />
                </span>
                <div
                  class="flex min-w-0 items-center gap-3 md:w-50"
                  :class="{ 'opacity-50': category.selectable === 0 }"
                >
                  <FontAwesomeIcon
                    :icon="category.icon"
                    class="size-6 shrink-0 text-tertiary-neutral"
                    aria-hidden="true"
                  />
                  <span class="truncate text-sm leading-5 font-medium text-primary-neutral">
                    {{ category.name }}
                  </span>
                </div>
              </div>
              <NeBadgeV2
                v-if="isCategorySelected(category.id) || selectedItemsCount(category.id) > 0"
                kind="custom"
                size="xs"
                custom-kind-classes="font-medium bg-indigo-100 dark:bg-indigo-700 text-indigo-800 dark:text-indigo-100"
                class="shrink-0"
              >
                {{
                  isCategorySelected(category.id) && category.selectable === category.total
                    ? t('standalone.dpi.all_selected')
                    : t('standalone.dpi.n_selected', { count: selectedItemsCount(category.id) })
                }}
              </NeBadgeV2>
              <FontAwesomeIcon
                :icon="faAngleRight"
                class="size-4 shrink-0 text-primary-neutral"
                aria-hidden="true"
              />
            </div>
          </div>
          <div
            v-if="isLoadingCatalog || visibleCategories.length"
            class="flex min-h-0 flex-1 flex-col gap-4"
            :class="isCategoryOpen ? '' : 'max-md:hidden'"
          >
            <!-- mobile back to categories -->
            <div
              role="button"
              tabindex="0"
              :aria-label="t('standalone.dpi.back_to_categories')"
              class="flex shrink-0 cursor-pointer items-center gap-2 md:hidden"
              @click="isCategoryOpen = false"
              @keydown.enter="isCategoryOpen = false"
              @keydown.space.prevent="isCategoryOpen = false"
            >
              <FontAwesomeIcon
                :icon="faAngleLeft"
                class="size-4 shrink-0 text-primary-neutral"
                aria-hidden="true"
              />
              <span class="truncate text-sm leading-5 font-medium text-primary-neutral">
                {{ selectedCategory?.name }}
              </span>
            </div>
            <div v-if="filteredItems.length" class="flex items-center justify-between gap-4">
              <!-- below md the category name is already in the back button above -->
              <p class="text-base leading-6 font-medium text-secondary-neutral max-md:hidden">
                {{ selectedCategory?.name }}
              </p>
              <p class="text-sm leading-5 text-tertiary-neutral">
                {{
                  t('standalone.dpi.n_of_total_selected', {
                    selected: selectedItemsInCategory,
                    total: totalItemsInCategory
                  })
                }}
              </p>
            </div>
            <div class="flex min-h-0 flex-1 flex-col overflow-y-auto pr-4">
              <NeSkeleton v-if="isLoadingCatalog" :lines="8" />
              <div
                v-for="item in filteredItems"
                v-else
                :key="item.id"
                class="flex shrink-0 items-center gap-4 border-gray-200 p-2 not-last:border-b dark:border-gray-700"
              >
                <NeCheckbox
                  :model-value="isItemSelected(item)"
                  :disabled="item.disabled"
                  @update:model-value="toggleItem(item)"
                >
                  <template #default>
                    <span class="text-md flex items-center gap-2">
                      <img
                        v-if="kind === 'applications' && item.logo"
                        :src="item.logo"
                        class="size-5 shrink-0"
                        :alt="item.name"
                      />
                      <FontAwesomeIcon
                        v-else
                        :icon="kind === 'applications' ? faCircleQuestion : faCubes"
                        class="size-4 shrink-0 text-tertiary-neutral"
                        aria-hidden="true"
                      />
                      {{ item.name }}
                    </span>
                  </template>
                </NeCheckbox>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div
        class="flex h-29 shrink-0 flex-col gap-2 overflow-y-auto border-t border-gray-200 p-3 dark:border-gray-700"
      >
        <p class="text-sm leading-5 text-secondary-neutral">
          {{ t('standalone.dpi.selected_count', { count: selectedCount }) }}
        </p>
        <NeInlineNotification
          v-if="showNoContentError"
          kind="error"
          :title="t('standalone.dpi.no_content_selected')"
          :description="t('standalone.dpi.no_content_selected_description')"
        />
        <div v-else-if="selections.length" class="flex flex-wrap gap-2">
          <NeBadgeV2
            v-for="(selection, index) in selections"
            :key="`${selection.kind}-${selection.type}-${selection.id}`"
            kind="gray"
            :pill="false"
            dismissable
            :dismiss-aria-label="t('standalone.dpi.remove_selection')"
            :class="{ 'opacity-50': isSelectionLocked(selection) }"
            @dismiss="removeSelection(index)"
          >
            {{ selectionLabel(selection) }}
          </NeBadgeV2>
        </div>
      </div>
    </div>
  </NeModal>
</template>
