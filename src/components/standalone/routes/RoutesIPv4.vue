<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import { useI18n } from 'vue-i18n'
import { reactive, ref } from 'vue'
import type { Route } from '@/composables/useRoutesConfig'
import { useRoutesConfig } from '@/composables/useRoutesConfig'

import {
    getAxiosErrorMessage,
    NeButton,
    NeInlineNotification,
    NeModal,
    NeSideDrawer,
    NeSkeleton
} from '@nethserver/vue-tailwind-lib'

import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { faCirclePlus } from '@fortawesome/free-solid-svg-icons'
//import RuleManager from '@/components/standalone/multi-wan/RuleManager.vue'
import RouteCreator from '@/components/standalone/routes/RouteCreator.vue'
import { useUciPendingChangesStore } from '@/stores/standalone/uciPendingChanges'
import { ubusCall } from '@/lib/standalone/ubus'
import type { AxiosError } from 'axios'
//import PolicyView from '@/components/standalone/multi-wan/PolicyView.vue'
//import PolicyEditor from '@/components/standalone/multi-wan/PolicyEditor.vue'

const { t } = useI18n()

const routesConfig = reactive(useRoutesConfig())
const uciPendingChangesStore = useUciPendingChangesStore()

const createRoute = ref(false)
const editRoute = ref<Route>()
const deleteRoute = ref<Route>()
const deletingRoute = ref(false)
const errorDeletingRoute = ref<Error>()

/**
 * Handler for routeCreated event.
 */
function routeCreatedHandler() {
    createRoute.value = false
    reloadConfig()
}

/**
 * Handler for route edited with success event.
 */
function routeEditedHandler() {
    //editPolicy.value = undefined
    reloadConfig()
}

function reloadConfig() {
    routesConfig.fetch()
    uciPendingChangesStore.getChanges()
}

function routeRouteHandler() {
    //deletingPolicy.value = true
    //ubusCall('uci', 'delete', {
    //  config: 'mwan3',
    //  section: deletePolicy.value?.name
    //})
    //  .then(() => {
    //    deletePolicy.value = undefined
    //    reloadConfig()
    //  })
    //  .catch((error: AxiosError) => (errorDeletingPolicy.value = error))
    //  .finally(() => (deletingPolicy.value = false))
}
</script>

<template>
    <NeSkeleton v-if="routesConfig.loading" :lines="5" />
    <!-- TODO <NeInlineNotification v-else-if="error" :kind="'error'" :title="error.message" /-->
    <div v-else class="space-y-16">
        <div class="space-y-8">
            <div class="flex">
                <div>
                    <p class="text-sm text-gray-500 dark:text-gray-400">
                        {{ t('standalone.routes.route_description') }}
                    </p>
                </div>
                <NeButton
                    v-if="routesConfig.routes.length >= 1"
                    :kind="'secondary'"
                    class="ml-auto self-start"
                    @click="createRoute = true"
                >
                    <template #prefix>
                        <FontAwesomeIcon :icon="faCirclePlus" />
                    </template>
                    {{ t('standalone.routes.create_route') }}
                </NeButton>
            </div>
            <div class="space-y-6">
                <NeSkeleton v-if="routesConfig.loading" :lines="3" :size="'sm'" />
                <!--template v-else-if="routesConfig.routes.length > 0">
                    <PolicyView
                        v-for="(policy, index) in routesConfig.routes"
                        :key="index"
                        :belongs-to-rule="routesConfig.rules.some((rule) => rule.policy.name == policy.name)"
                        :policy="policy"
                        @delete="(toDeletePolicy) => (deletePolicy = toDeletePolicy)"
                        @edit="(toEditPolicy) => (editPolicy = toEditPolicy)"
                    />
                </template-->
                <HorizontalCard v-else class="space-y-4 text-center">
                    <p>{{ t('standalone.routes.no_route_found') }}</p>
                    <NeButton :kind="'primary'" @click="createRoute = true">
                        <template #prefix>
                            <FontAwesomeIcon :icon="faCirclePlus" />
                        </template>
                        {{ t('standalone.routes.create_route') }}
                    </NeButton>
                </HorizontalCard>
            </div>
        </div>
        <!--div v-if="routesConfig.routes.length > 0">
            <div class="space-y-6">
                <div class="flex">
                    <div>
                        <h6 class="mb-2 text-xl font-medium text-gray-900 dark:text-gray-50">
                            {{ t('standalone.multi_wan.rules') }}
                        </h6>
                        <p class="text-sm text-gray-500 dark:text-gray-400">
                            {{ t('standalone.multi_wan.rules_description') }}
                        </p>
                    </div>
                    <NeButton :kind="'secondary'" class="ml-auto self-start" @click="createRule = true">
                        <template #prefix>
                            <FontAwesomeIcon :icon="faCirclePlus" />
                        </template>
                        {{ t('standalone.multi_wan.create_rule') }}
                    </NeButton>
                </div>
            </div>
        </div-->
    </div>
    <RouteCreator
      :create-default="routesConfig.routes.length < 1"
      :is-shown="createRoute"
      @abort-creation="createRoute = false"
      @route-created="routeCreatedHandler()"
    />
    <!--NeSideDrawer
      :is-shown="editPolicy != undefined"
      :title="t('standalone.multi_wan.edit_policy')"
      @close="editPolicy = undefined"
    >
      <PolicyEditor
        v-if="editPolicy"
        :policy="editPolicy"
        @cancel="editPolicy = undefined"
        @success="policyEditedHandler()"
      />
    </NeSideDrawer-->
    <!--NeModal
      :primary-button-disabled="deletingPolicy"
      :primary-button-loading="deletingPolicy"
      :primary-label="t('standalone.multi_wan.delete_policy_modal.button')"
      :title="t('standalone.multi_wan.delete_policy_modal.title', { name: deletePolicy?.name ?? '' })"
      :visible="deletePolicy != undefined"
      kind="warning"
      primary-button-kind="danger"
      @close="deletePolicy = undefined"
      @primary-click="deletePolicyHandler()"
    >
      <NeInlineNotification
        v-if="errorDeletingPolicy"
        :title="t(getAxiosErrorMessage(errorDeletingPolicy.message))"
        kind="error"
      />
    </NeModal-->
</template>
