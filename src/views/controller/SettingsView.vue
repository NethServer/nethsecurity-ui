<!--
  Copyright (C) 2024 Nethesis S.r.l.
  SPDX-License-Identifier: GPL-3.0-or-later
-->

<script setup lang="ts">
import { NeTitle } from '@nethesis/vue-components'
import { useI18n } from 'vue-i18n'
import FormLayout from '@/components/standalone/FormLayout.vue'
import { NeButton, NeSkeleton, NeInlineNotification, NeCombobox } from '@nethesis/vue-components'
import { NeTextArea } from '@nethserver/vue-tailwind-lib'
import { onMounted, ref } from 'vue'
import { useAccountsStore } from '@/stores/controller/accounts'
import { useLanguage } from '@/composables/useLanguage'
import ChangePasswordDrawer from '@/components/controller/account_settings/ChangePasswordDrawer.vue'
import GenerateSSHKeyPairDrawer from '@/components/controller/account_settings/GenerateSSHKeyPairDrawer.vue'
import DeleteSSHKeyModal from '@/components/controller/account_settings/DeleteSSHKeyModal.vue'
import { useNotificationsStore } from '@/stores/common/notifications'

const { t } = useI18n()

const accountsStore = useAccountsStore()
const notificationsStore = useNotificationsStore()

const { uiLanguage, supportedLanguages } = useLanguage()

const showChangePasswordDrawer = ref(false)
const showGenerateSSHKeyPairDrawer = ref(false)
const showRemoveKeyModal = ref(false)

onMounted(() => {
  accountsStore.loadSshKeys()
})
</script>

<template>
  <NeTitle>{{ t('controller.account_settings.title') }}</NeTitle>
  <div class="flex max-w-3xl flex-col gap-y-8">
    <FormLayout :title="t('controller.account_settings.change_language')">
      <NeCombobox
        v-model="uiLanguage"
        :label="t('controller.account_settings.language')"
        :options="supportedLanguages"
        :noResultsLabel="t('ne_combobox.no_results')"
        :limitedOptionsLabel="t('ne_combobox.limited_options_label')"
        :noOptionsLabel="t('ne_combobox.no_options_label')"
        :selected-label="t('ne_combobox.selected')"
        :user-input-label="t('ne_combobox.user_input_label')"
    /></FormLayout>
    <hr />
    <FormLayout
      :title="t('controller.account_settings.change_password')"
      :description="t('controller.account_settings.change_password_description')"
    >
      <NeButton kind="secondary" @click="showChangePasswordDrawer = true">{{
        t('controller.account_settings.change_password')
      }}</NeButton>
    </FormLayout>
    <hr />
    <FormLayout
      :title="t('controller.account_settings.ssh_key')"
      :description="t('controller.account_settings.ssh_key_description')"
    >
      <NeInlineNotification
        v-if="accountsStore.listSshKeysError.notificationDescription"
        :title="t('error.cannot_retrieve_ssh_keys')"
        :description="accountsStore.listSshKeysError.notificationDescription"
        class="mb-6"
        kind="error"
      >
        <template #details v-if="accountsStore.listSshKeysError.notificationDetails">
          {{ accountsStore.listSshKeysError.notificationDetails }}
        </template>
      </NeInlineNotification>
      <NeSkeleton v-if="accountsStore.listSshKeysLoading" :lines="4" />
      <template v-else-if="accountsStore.sshKeys.key && accountsStore.sshKeys.key_pub">
        <div class="mb-4 flex flex-row items-center gap-x-2">
          <font-awesome-icon
            :icon="['fas', 'circle-check']"
            class="h-4 w-4 text-green-600 dark:text-green-400"
            aria-hidden="true"
          /><span>{{ t('controller.account_settings.passphrase_enabled') }}</span>
        </div>
        <NeTextArea
          :label="t('controller.account_settings.ssh_public_key')"
          class="mb-6"
          v-model="accountsStore.sshKeys.key_pub"
          :disabled="true"
        />
        <NeButton kind="tertiary" class="-mx-2" @click="showRemoveKeyModal = true">
          <template #prefix>
            <font-awesome-icon
              :icon="['fas', 'trash']"
              class="h-4 w-4"
              aria-hidden="true"
            /> </template
          >{{ t('controller.account_settings.remove_key') }}</NeButton
        ></template
      >
      <template v-else
        ><NeButton kind="secondary" @click="showGenerateSSHKeyPairDrawer = true">{{
          t('controller.account_settings.generate_ssh_key_pair')
        }}</NeButton></template
      >
    </FormLayout>
  </div>
  <ChangePasswordDrawer
    :is-shown="showChangePasswordDrawer"
    @close="showChangePasswordDrawer = false"
    @change-password="
      () => {
        notificationsStore.addNotification({
          kind: 'success',
          id: 'change-password',
          title: t('controller.account_settings.password_changed')
        })
      }
    "
  />
  <GenerateSSHKeyPairDrawer
    :is-shown="showGenerateSSHKeyPairDrawer"
    @close="showGenerateSSHKeyPairDrawer = false"
    @generate-key-pair="
      () => {
        notificationsStore.addNotification({
          kind: 'success',
          id: 'generate-ssh-key',
          title: t('controller.account_settings.ssh_key_generated')
        })
        accountsStore.loadSshKeys()
      }
    "
  />
  <DeleteSSHKeyModal
    :visible="showRemoveKeyModal"
    @close="showRemoveKeyModal = false"
    @key-deleted="
      () => {
        notificationsStore.addNotification({
          kind: 'success',
          id: 'remove-ssh-key',
          title: t('controller.account_settings.ssh_key_removed')
        })
        accountsStore.loadSshKeys()
      }
    "
  />
</template>
