//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { defineStore } from 'pinia'
import { ubusCall } from '@/lib/standalone/ubus'
import { computed, ref, type Ref } from 'vue'

export const useUciPendingChangesStore = defineStore('uciPendingChanges', () => {
  const changes: Ref<any> = ref({})

  const numChanges = computed(() => {
    let num = 0
    Object.values(changes.value).forEach((configChanges: any) => {
      num += configChanges.length
    })
    return num
  })

  const getChanges = async () => {
    const res = await ubusCall('uci', 'changes')
    changes.value = res.data.changes
  }

  const commitChanges = async () => {
    await ubusCall('ns.commit', 'commit', { changes: changes.value })

    // reload page using a timeout: some browsers (e.g. Firefox) detect an axios error if the page is reloaded just after a POST request

    setTimeout(() => {
      location.reload()
    }, 200)
  }

  const revertChanges = async () => {
    const configsToRevert = Object.keys(changes.value)
    const revertPromises = []

    for (const config of configsToRevert) {
      revertPromises.push(ubusCall('uci', 'revert', { config: config }))
    }
    await Promise.all(revertPromises)

    // reload page
    location.reload()
  }

  return {
    changes,
    numChanges,
    getChanges,
    commitChanges,
    revertChanges
  }
})
