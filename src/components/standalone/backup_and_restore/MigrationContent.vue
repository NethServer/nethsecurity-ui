<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { NeButton, NeInlineNotification } from '@nethserver/vue-tailwind-lib'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import DrawerMigration from '@/components/standalone/backup_and_restore/DrawerMigration.vue'

const { t } = useI18n()

let showMigrationDrawer = ref(false)
let successNotificationMigration = ref({
  notificationTitle: ''
})

function successMigration() {
  successNotificationMigration.value.notificationTitle = t(
    'standalone.backup_and_restore.migration.success_migration'
  )
  setTimeout(function () {
    successNotificationMigration.value.notificationTitle = ''
  }, 5000)
}
</script>

<template>
  <div>
    <div class="flex">
      <div>
        <p class="max-w-2xl text-sm font-normal text-gray-500 dark:text-gray-400">
          {{ t('standalone.backup_and_restore.migration.description') }}
          <br />
          <a
            href="https://lormepisum"
            target="_blank"
            rel="noreferrer"
            class="text-primary-700 hover:text-primary-800 dark:text-primary-500 dark:hover:text-primary-300"
          >
            {{ t('standalone.backup_and_restore.migration.description_link') }}
          </a>
        </p>
      </div>
      <div class="mr-auto self-start">
        <NeButton
          class="ml-6"
          kind="secondary"
          size="lg"
          type="submit"
          @click="showMigrationDrawer = true"
        >
          <template #prefix>
            <FontAwesomeIcon :icon="['fa', 'arrow-circle-up']" />
          </template>
          {{ t('standalone.backup_and_restore.migration.upload_file') }}
        </NeButton>
      </div>
    </div>
    <NeInlineNotification
      v-if="successNotificationMigration.notificationTitle"
      class="my-4"
      kind="success"
      :title="successNotificationMigration.notificationTitle"
    />
    <DrawerMigration
      :showMigrationDrawer="showMigrationDrawer"
      @success="successMigration()"
      @close="showMigrationDrawer = false"
    />
  </div>
</template>
