import { useI18n } from 'vue-i18n'
import type { NeComboboxOption } from '@nethserver/vue-tailwind-lib'
import { computed } from 'vue'
import { useMwanConfig } from '@/composables/useMwanConfig'

export interface Form {
  name: string
  assignedPolicy: string
  sourceAddress: string
  destinationAddress: string
  destinationPort: string
  protocol: string
}

export function useRuleForm() {
  const { t } = useI18n()

  const protocolOptions: NeComboboxOption[] = [
    {
      id: 'all',
      label: t('standalone.multi_wan.all_protocols')
    },
    {
      id: 'tcp',
      label: 'tcp'
    },
    {
      id: 'udp',
      label: 'udp'
    },
    {
      id: 'icmp',
      label: 'icmp'
    },
    {
      id: 'esp',
      label: 'esp'
    }
  ]

  const { error, loading, policies } = useMwanConfig()

  const policyOptions = computed((): NeComboboxOption[] => {
    return policies.value.map((policy) => {
      return {
        id: policy.name,
        label: policy.name
      }
    })
  })

  return { protocolOptions, policyOptions, error, loading }
}
