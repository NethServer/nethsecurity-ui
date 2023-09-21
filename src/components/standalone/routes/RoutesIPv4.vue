<!--
  Copyright (C) 2023 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script lang="ts" setup>
import {useI18n} from 'vue-i18n'
import {onMounted, ref} from 'vue'

import {
	getAxiosErrorMessage,
	NeButton,
	NeSkeleton,
	NeDropdown, NeTitle
} from '@nethserver/vue-tailwind-lib'
import NeTable from '@/components/standalone/NeTable.vue'
import HorizontalCard from '@/components/standalone/HorizontalCard.vue'
import {FontAwesomeIcon} from '@fortawesome/vue-fontawesome'
import {faCirclePlus} from '@fortawesome/free-solid-svg-icons'
import {useUciPendingChangesStore} from '@/stores/standalone/uciPendingChanges'
import {ubusCall} from '@/lib/standalone/ubus'
import CreateOrEditRouteDrawer from '@/components/standalone/routes/CreateOrEditRouteDrawer.vue'

const { t } = useI18n()

const uciPendingChangesStore = useUciPendingChangesStore()

let createRoute = ref(false)
let routes: any = ref({})
let table: any = ref({})
let loading = ref(true)

let error = ref({
	notificationTitle: '',
	notificationDescription: ''
})

onMounted(async () => {
	await loadRoutes();
	await loadMainTable();
	loading.value = false;
});

/*
 * get all routes
 */
async function loadRoutes() {
	try {
		const res = await ubusCall('ns.routes', 'list-routes', {
			protocol: 'ipv4'
		})

		const items: any = []
		for (let item in res.data.routes) {
			let obj = {
				id: item
			}
			obj = Object.assign(obj, res.data.routes[item])
			items.push(obj)
		}

		routes.value = items

		console.log('routes', routes.value)
	} catch (err: any) {
		console.error(err)
		// TODO
		error.value.notificationTitle = t('error.cannot_load_network_devices')
		error.value.notificationDescription = t(getAxiosErrorMessage(err))
	}
}

/*
 * get main table
 */
async function loadMainTable() {
	try {
		const res = await ubusCall('ns.routes', 'main-table', {
			protocol: 'ipv4'
		})

		if (res.data)
			table.value = res.data.table
	} catch (err: any) {
		console.error(err)
		// TODO
		error.value.notificationTitle = t('error.cannot_load_network_devices')
		error.value.notificationDescription = t(getAxiosErrorMessage(err))
	}
}

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
/*function routeEditedHandler() {
	//editPolicy.value = undefined
	reloadConfig()
}*/

function reloadConfig() {
	loadRoutes();
	uciPendingChangesStore.getChanges()
}

/*function deleteRouteHandler() {
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
} */
</script>

<template>
	<NeSkeleton v-if="loading" :lines="5" />
	<!-- TODO <NeInlineNotification v-else-if="error" :kind="'error'" :title="error.message" /-->
	<HorizontalCard v-if="!loading && !routes.length" class="space-y-4 text-center">
		<p>{{ t('standalone.routes.no_route_found') }}</p>
		<NeButton :kind="'primary'" @click="createRoute = true">
			<template #prefix>
				<FontAwesomeIcon :icon="faCirclePlus" />
			</template>
			{{ t('standalone.routes.create_route') }}
		</NeButton>
	</HorizontalCard>
	<div v-if="!loading && routes.length" class="space-y-16">
		<div class="space-y-8">
			<div class="flex">
				<div>
					<p class="text-sm text-gray-500 dark:text-gray-400">
						{{ t('standalone.routes.route_description') }}
					</p>
				</div>
				<NeButton
					v-if="routes.length >= 1"
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
		</div>
		<div class="space-y-2">
			<div class="flex">
				<div>
					<p class="text-sm text-primary-500 dark:text-gray-400">
						{{ t('standalone.routes.route_toggle_table') }}
					</p>
				</div>
			</div>
		</div>
		<div class="space-y-6">
			<NeSkeleton v-if="loading" :lines="3" :size="'sm'" />
			<template v-if="!loading && routes.length > 0">
				<NeTable
					:data="routes"
					:headers="[
					 	{
					 		key: 'ns_description',
					 		label: t('standalone.routes.route_name')
					 	},
					 	{
					 		key: 'interface',
					 		label: t('standalone.routes.route_interface')
					 	},
					 	{
					 		key: 'target',
					 		label: t('standalone.routes.route_network_address')
					 	},
					 	{
					 		key: 'gateway',
					 		label: t('standalone.routes.route_gateway')
					 	},
					 	{
					 		key: 'metric',
					 		label: t('standalone.routes.route_metric')
					 	},
					 	{
					 		key: 'actions'
					 	}
					 ]"
					:loading="loading"
				>
					<template #ns_description="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.ns_description }}</span>
						</div>
					</template>
					<template #interface="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.interface }}</span>
						</div>
					</template>
					<template #target="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.target }}</span>
						</div>
					</template>
					<template #gateway="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.gateway }}</span>
						</div>
					</template>
					<template #metric="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.metric }}</span>
						</div>
					</template>
					<template #actions>
						<div class="flex gap-3 justify-end">
							<NeButton
								kind="tertiary"
								size="lg"
							>
								<template #prefix>
									<font-awesome-icon
										:icon="['fas', 'pen-to-square']"
										class="h-4 w-4"
										aria-hidden="true"
									/>
								</template>
								{{ t('common.edit') }}
							</NeButton>
							<NeDropdown
								:items="[
									{
										id: 'delete',
										danger: true,
										label: t('common.delete')
									}
								]"
								align-to-right
							/>
						</div>
					</template>
				</NeTable>
			</template>
			<NeTitle level="h3">{{ t('standalone.routes.main_table') }}</NeTitle>
			<template v-if="!loading && table.length > 0">
				<NeTable
					:data="table"
					:headers="[
						{
					 		key: 'interface',
					 		label: t('standalone.routes.route_interface')
					 	},
					 	{
					 		key: 'network',
					 		label: t('standalone.routes.route_network_address')
					 	},
					 	{
					 		key: 'gateway',
					 		label: t('standalone.routes.route_gateway')
					 	},
					 	{
					 		key: 'metric',
					 		label: t('standalone.routes.route_metric')
					 	},
					 	{
					 		key: 'protocol',
					 		label: t('standalone.routes.route_protocol')
					 	}
					 ]"
					:loading="loading"
				>
					<template #interface="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.interface }}</span>
						</div>
					</template>
					<template #network="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.network }}</span>
						</div>
					</template>
					<template #gateway="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.gateway }}</span>
						</div>
					</template>
					<template #metric="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.metric }}</span>
						</div>
					</template>
					<template #protocol="{ item }">
						<div class="flex items-center gap-x-4">
							<span>{{ item.protocol }}</span>
						</div>
					</template>
				</NeTable>
			</template>
		</div>
	</div>
	<CreateOrEditRouteDrawer
		:create-default="routes.length < 1"
		:is-shown="createRoute"
		@abort-creation="createRoute = false"
		@route-created="routeCreatedHandler()"
	/>

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
