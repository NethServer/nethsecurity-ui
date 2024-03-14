//  Copyright (C) 2024 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

import type { Ref } from 'vue'
import { computed, ref, watch } from 'vue'
import type { Policy } from '@/composables/useMwan'
import { useI18n } from 'vue-i18n'

/**
 * Gateway form definition.
 */
export class Gateway {
  id: string
  weight: string

  constructor(id: string = '', weight: string = '100') {
    this.id = id
    this.weight = weight
  }
}

/**
 * Enum categorization of possible gateways configuration
 */
export enum PolicyOptions {
  BALANCE = 'balance',
  BACKUP = 'backup',
  CUSTOM = 'custom'
}

/**
 * Translates the policyOptions into labels.
 */
const radioSelections = [
  {
    id: PolicyOptions.BALANCE,
    label: 'standalone.multi_wan.behave_picker.balance'
  },
  {
    id: PolicyOptions.BACKUP,
    label: 'standalone.multi_wan.behave_picker.backup'
  },
  {
    id: PolicyOptions.CUSTOM,
    label: 'standalone.multi_wan.behave_picker.custom'
  }
]

export function usePolicyForm(policy: Ref<Policy | undefined>) {
  const { t } = useI18n()

  // form inputs
  const label = ref('')
  const selection = ref<PolicyOptions>(PolicyOptions.BALANCE)
  const priorities = ref([[new Gateway(), new Gateway()]])

  // watcher for editable policy
  watch(policy, () => {
    if (policy.value != undefined) {
      // set name of the policy if defined
      label.value = policy.value.label ?? ''

      // decode members into picker
      const metrics = Object.values(policy.value?.members)
        .flat()
        .map((member) => member.metric)
      if (metrics.every((metric, index, array) => metric == array[0])) {
        selection.value = PolicyOptions.BALANCE
      } else if (metrics.every((metric, index, array) => array.indexOf(metric) == index)) {
        selection.value = PolicyOptions.BACKUP
      } else {
        selection.value = PolicyOptions.CUSTOM
      }

      // parse gateways
      priorities.value = []
      Object.values(policy.value?.members).forEach((members, index) => {
        priorities.value[index] = members.map(
          (member) => new Gateway(member.interface, String(member.weight))
        )
      })
    }
  })

  watch(selection, (value) => {
    // When the selection changes, we need to update the priorities and filter/merge the gateways
    if (value == PolicyOptions.BACKUP) {
      // merge all gateways into a single priority
      priorities.value = priorities.value
        .map((priority) => priority.map((gateway) => [gateway]))
        .flat(1)
      for (let i = priorities.value.length; i < 2; i++) {
        priorities.value.push([new Gateway()])
      }
    } else if (value == PolicyOptions.BALANCE) {
      // flatten all priorities in a single gateway per priority
      priorities.value = [priorities.value.flat(1)]
      for (let i = priorities.value[0].length; i < 2; i++) {
        priorities.value[0].push(new Gateway())
      }
    } else {
      // filter out empty gateways
      priorities.value.forEach((gateways, index) => {
        priorities.value[index] = gateways.filter((gateway) => gateway.id != '')
      })
      // filter out empty priorities
      priorities.value = priorities.value.filter(
        (gateways) => gateways.filter((gateway) => gateway.id != '').length > 0
      )
      // add a new priority if none is defined
      if (priorities.value.length == 0) {
        priorities.value = [[new Gateway()]]
      }
    }
  })

  /**
   * Whether the button should be disabled or not once deletion.
   */
  const isTrashButtonDisabled = computed<boolean>(() => {
    if (selection.value == 'balance') {
      return priorities.value[0].length < 3
    } else if (selection.value == 'backup') {
      return priorities.value.length < 3
    }
    return false
  })

  /**
   * Translation of the radio selections.
   */
  const policyOptionSelection = radioSelections.map((entry) => {
    entry.label = t(entry.label)
    return entry
  })

  function removePriority(prioritiesIndex: number, priority: number) {
    priorities.value[prioritiesIndex].splice(priority, 1)
    priorities.value = priorities.value.filter((priority) => priority.length > 0)
  }

  function addPriority() {
    priorities.value.push([new Gateway()])
  }

  function addGateway(priorityIndex: number) {
    priorities.value[priorityIndex].push(new Gateway())
  }

  function cleanForm() {
    label.value = ''
    selection.value = PolicyOptions.BALANCE
    priorities.value = [[new Gateway(), new Gateway()]]
  }

  return {
    label,
    selection,
    priorities,
    policyOptionSelection,
    isTrashButtonDisabled,
    removePriority,
    addPriority,
    addGateway,
    cleanForm
  }
}
