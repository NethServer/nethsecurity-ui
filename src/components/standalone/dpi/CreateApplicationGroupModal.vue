<!--
  Copyright (C) 2026 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import {
  getAxiosErrorMessage,
  NeBadgeV2,
  NeButton,
  NeCheckbox,
  NeInlineNotification,
  NeModal,
  NeSkeleton,
  NeTabs,
  NeTextInput
} from '@nethesis/vue-components'
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { faAngleRight, faCircleQuestion, faCubes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import * as v from 'valibot'
import {
  UNCATEGORIZED,
  useDpiCatalog,
  useDpiCatalogLabels,
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
const showSelectableItemsButton = computed(() => !subscription.isActive)

const NAME_MAX_LENGTH = 64

const nameSchema = v.object({
  name: v.pipe(
    v.string(),
    v.trim(),
    v.minLength(1, 'name_required'),
    v.maxLength(NAME_MAX_LENGTH, 'name_too_long')
  )
})

const groupName = ref('')
const kind = ref<DpiCatalogKind>('applications')
const selectedCategoryId = ref('')
const showOnlySelectable = ref(false)

const selections = ref<DpiGroupSelection[]>([])

const validationBag = ref(new MessageBag())
const showNoContentError = ref(false)

function messageOf(field: string) {
  const message = validationBag.value.getFirstFor(field)
  return message ? t(`standalone.dpi.${message}`) : ''
}

const nameError = computed(() => messageOf('name'))

const otherErrors = computed(() =>
  [...validationBag.value.keys()]
    .filter((field) => field !== 'name')
    .map(messageOf)
    .filter(Boolean)
)

const tabs = computed(() => [
  { name: 'applications', label: t('standalone.dpi.applications') },
  { name: 'protocols', label: t('standalone.dpi.protocols') }
])

const {
  categories,
  items,
  itemsOf,
  isLoading: isLoadingCatalog,
  isError: isCatalogError,
  error: catalogError
} = useDpiCatalog(kind, selectedCategoryId)

const { labelOf, categoryOf } = useDpiCatalogLabels()
const { mutate: createGroup, isPending: isCreating } = useCreateApplicationGroup()
const { mutate: editGroup, isPending: isEditingPending } = useEditApplicationGroup()

const isSaving = computed(() => isCreating.value || isEditingPending.value)

const selectedCategory = computed(() =>
  categories.value.find((category) => category.id === selectedCategoryId.value)
)

const filteredItems = computed(() => {
  let filtered = items.value

  if (subscription.isActive) {
    filtered = filtered.filter((item) => !item.disabled)
  } else if (showOnlySelectable.value) {
    filtered = filtered.filter((item) => !item.disabled)
  }

  return filtered
})

const selectedItemsInCategory = computed(() => selectedItemsCount(selectedCategoryId.value))

const totalItemsInCategory = computed(() => itemsOf(selectedCategoryId.value).length)

const selectedCount = computed(() => selections.value.length)

watch(
  categories,
  (list) => {
    if (list.length && !list.some((category) => category.id === selectedCategoryId.value)) {
      selectedCategoryId.value = list[0]!.id
    }
  },
  { immediate: true }
)

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
      kind.value = 'applications'
      selections.value = group ? selectionsFromGroup(group, { labelOf, categoryOf }) : []
      validationBag.value.clear()
      showNoContentError.value = false
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

function isItemSelected(item: { id: string; disabled: boolean }) {
  if (indexOfSelection('item', item.id) !== -1) {
    return true
  }
  return !item.disabled && isCategorySelected(selectedCategoryId.value)
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
    <div class="flex max-h-[calc(100vh-14rem)] flex-col gap-4">
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
        v-model="groupName"
        :label="t('standalone.dpi.group_name')"
        :placeholder="t('standalone.dpi.group_name_placeholder')"
        :invalid-message="nameError"
        class="max-w-lg"
      />
      <div class="flex min-h-0 flex-1 flex-col gap-4">
        <NeTabs
          :tabs="tabs"
          :selected="kind"
          :sr-tabs-label="t('ne_tabs.tabs')"
          :sr-select-tab-label="t('ne_tabs.select_a_tab')"
          @select-tab="kind = $event as DpiCatalogKind"
        />
        <div class="flex max-h-146 min-h-0 flex-1 gap-4">
          <!-- categories -->
          <div class="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pr-4">
            <NeSkeleton v-if="isLoadingCatalog" :lines="10" />
            <div
              v-for="category in categories"
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
              <div class="flex shrink-0 items-center gap-5">
                <span class="shrink-0" @click.stop>
                  <NeCheckbox
                    :model-value="isCategorySelected(category.id)"
                    :aria-label="category.name"
                    :disabled="category.id === UNCATEGORIZED || category.selectable === 0"
                    @update:model-value="toggleCategory(category)"
                  />
                </span>
                <div class="flex w-50 items-center gap-3">
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
          <div class="flex min-h-0 flex-1 flex-col gap-4">
            <div class="flex items-center justify-between gap-4">
              <p class="text-sm leading-5 text-primary-neutral">
                {{
                  t('standalone.dpi.num_of_total_selected_in_category', {
                    selected: selectedItemsInCategory,
                    total: totalItemsInCategory,
                    category: selectedCategory?.name ?? ''
                  })
                }}
              </p>
              <NeButton
                v-if="showSelectableItemsButton"
                kind="tertiary"
                size="sm"
                @click="showOnlySelectable = !showOnlySelectable"
              >
                {{
                  showOnlySelectable
                    ? t('standalone.dpi.show_all_items')
                    : t('standalone.dpi.show_only_selectable_items')
                }}
              </NeButton>
            </div>
            <div class="flex min-h-0 flex-1 flex-col overflow-y-auto pr-4">
              <NeSkeleton v-if="isLoadingCatalog" :lines="8" />
              <div
                v-for="item in filteredItems"
                v-else
                :key="item.id"
                class="flex shrink-0 items-center gap-4 border-b border-gray-200 p-2 dark:border-gray-700"
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
            dismissable
            :dismiss-aria-label="t('standalone.dpi.remove_selection')"
            @dismiss="removeSelection(index)"
          >
            {{ selectionLabel(selection) }}
          </NeBadgeV2>
        </div>
      </div>
    </div>
  </NeModal>
</template>
