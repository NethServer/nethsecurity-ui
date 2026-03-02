import { defineStore } from 'pinia'
import { useQuery } from '@tanstack/vue-query'
import { ubusCall } from '@/lib/standalone/ubus.ts'
import type { Flow } from '@/components/standalone/monitoring/FlowsTable.vue'

export type Response<T> = {
  data: {
    values: T[]
  }
}

export type Application = {
  id: number
  tag: string
  label: string
  icon?: string
}

export type Protocol = {
  id: number
  tag: string
  label: string
}

export const useNetifydStore = defineStore('netifyd', () => {
  const applications = useQuery({
    queryKey: ['netifyd', 'applications'],
    queryFn: () => ubusCall<Response<Application>>('ns.dpi', 'list-application-catalog'),
    select: (data) => data.data.values,
    initialData: { data: { values: [] } }
  })

  const protocols = useQuery({
    queryKey: ['netifyd', 'protocols'],
    queryFn: () => ubusCall<Response<Application>>('ns.dpi', 'list-protocol-catalog'),
    select: (data) => data.data.values,
    initialData: { data: { values: [] } }
  })

  function getApplicationByFlow(flow: Flow): Application {
    const app = applications.data.value.find((app) => app.id == flow.detected_application)
    if (app != undefined) {
      return app
    }
    return {
      id: flow.detected_application,
      tag: flow.detected_application_name,
      label: generateApplicationLabel(flow.detected_application_name)
    }
  }

  function generateApplicationLabel(applicationName: string): string {
    let name = applicationName
    // Remove netify. prefix if present
    if (name.startsWith('netify.')) {
      name = name.substring(7)
    }
    // Replace dashes with spaces
    name = name.replace(/-/g, ' ')
    // Capitalize first character of each word
    return name
      .split(' ')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ')
  }

  function getProtocolByFlow(flow: Flow): Protocol {
    const proto = protocols.data.value.find((proto) => proto.id == flow.detected_protocol)
    if (proto != undefined) {
      return proto
    }
    return {
      id: flow.detected_protocol,
      tag: flow.detected_protocol_name,
      label: flow.detected_protocol_name
    }
  }

  function getApplicationNameById(id: number, fallback: string): string {
    const app = applications.data.value.find((app) => app.id == id)
    if (app != undefined) {
      return app.label
    }
    return generateApplicationLabel(fallback)
  }

  function getProtocolNameById(id: number, fallback: string): string {
    const proto = protocols.data.value.find((proto) => proto.id == id)
    if (proto != undefined) {
      return proto.label
    }
    return fallback
  }

  return {
    applications,
    protocols,
    getApplicationByFlow,
    getProtocolByFlow,
    getApplicationNameById,
    getProtocolNameById
  }
})
