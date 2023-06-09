//  Copyright (C) 2023 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import { defineStore } from 'pinia'
import { ubusCall } from '@/lib/standalone/ubus'
import { computed, ref } from 'vue'

export const useUciPendingChangesStore = defineStore('uciPendingChanges', () => {
  const changes = ref({})

  const numChanges = computed(() => {
    let num = 0
    Object.values(changes.value).forEach((configChanges: any) => {
      num += configChanges.length
    })
    return num
  })

  const getChanges = async () => {
    const res = await ubusCall('uci', 'changes', {})
    changes.value = res.data.changes
  }

  const commitChanges = async () => {
    const configsToCommit = Object.keys(changes.value)

    console.log('configs to commit', configsToCommit) ////

    const commitPromises = []

    for (const config of configsToCommit) {
      commitPromises.push(ubusCall('uci', 'commit', { config: config }, true))
    }
    await Promise.all(commitPromises)

    // reload page
    location.reload()
  }

  const revertChanges = async () => {
    const configsToRevert = Object.keys(changes.value)

    console.log('configs to revert', configsToRevert) ////

    const revertPromises = []

    for (const config of configsToRevert) {
      revertPromises.push(ubusCall('uci', 'revert', { config: config }, true))
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
