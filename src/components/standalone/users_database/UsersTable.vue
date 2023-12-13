<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import NeTable from '../NeTable.vue'
import { NeDropdown, NeButton } from '@nethserver/vue-tailwind-lib'
import type { User } from './UsersDatabaseManager.vue'

const { t } = useI18n()

const props = defineProps<{
  users: User[]
  isLdapDatabase: boolean
}>()

const emit = defineEmits<{
  delete: [item: User]
  edit: [item: User]
}>()

// Lists the table headers for the users.
// The headers vary based on the database type: in the case of the local database, the password and menu headers will be included.
// In the case of a LDAP database, only the username and display name will be shown instead.
const tableHeaders = [
  {
    label: t('standalone.users_database.username'),
    key: 'name'
  },
  {
    label: t('standalone.users_database.display_name'),
    key: 'description'
  },
  // Include password field and menu if database is not LDAP
  ...(!props.isLdapDatabase
    ? [
        {
          label: t('standalone.users_database.password'),
          key: 'password'
        },
        {
          label: '',
          key: 'menu'
        }
      ]
    : [])
]

function getDropdownItems(item: User) {
  return [
    {
      id: 'delete',
      label: t('common.delete'),
      iconStyle: 'fas',
      icon: 'trash',
      danger: true,
      action: () => {
        emit('delete', item)
      }
    }
  ]
}
</script>

<template>
  <NeTable :data="users" :headers="tableHeaders" :readonly="isLdapDatabase">
    <template #description="{ item }: { item: User }">
      <p>{{ item.description ? item.description : '-' }}</p>
    </template>
    <template #password="{ item }: { item: User }">
      <div :class="['flex', 'flex-row', 'items-center']">
        <font-awesome-icon
          :icon="['fas', item.password ? 'circle-check' : 'circle-xmark']"
          class="mr-2 h-5 w-5"
          aria-hidden="true"
        />
        <p>
          {{
            item.password
              ? t('standalone.users_database.set')
              : t('standalone.users_database.not_set')
          }}
        </p>
      </div>
    </template>
    <template #menu="{ item }: { item: User }">
      <div class="align-center flex justify-end">
        <NeButton kind="tertiary" @click="emit('edit', item)">
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'pen-to-square']"
              class="h-4 w-4"
              aria-hidden="true"
            />
          </template>
          {{ t('common.edit') }}
        </NeButton>
        <NeDropdown :items="getDropdownItems(item)" :align-to-right="true" />
      </div>
    </template>
  </NeTable>
</template>
