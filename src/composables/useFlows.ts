import {
  faArrowDown,
  faArrowUp,
  faBroadcastTower,
  faQuestion,
  faUsers,
  faCancel
} from '@fortawesome/free-solid-svg-icons'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { kbpsFormat } from '@nethesis/vue-components'

export type FlowListResponse = {
  data: {
    current_page: number
    flows: FlowEvent[]
    total: number
    last_page: number
    per_page: number
    filters: {
      applications: {
        id: number
        name: string
      }[]
      protocols: {
        id: number
        name: string
      }[]
      sources: string[]
      destinations: string[]
      tags: string[]
    }
  }
}

export type FlowEvent = {
  type: 'flow_dpi_complete' | 'flow'
  interface: string
  internal: boolean
  flow: Flow
  tags: string[]
}

export type Flow = {
  conntrack: {
    id: string
  }
  detected_application: number
  detected_application_name: string
  detected_protocol: number
  detected_protocol_name: string
  detection_guessed?: boolean
  detection_packets?: number
  local_ip: string
  local_port: number
  other_ip: string
  other_port: number
  local_origin: boolean
  first_seen_at: number
  last_seen_at: number
  local_bytes: number
  local_rate: number
  local_mac: string
  other_bytes: number
  other_rate: number
  other_mac: string
  other_type: 'remote' | 'local' | 'broadcast'
  digest: string
  host_server_name?: string
  dns_host_name?: string
  risks: {
    ndpi_risk_score: number
    ndpi_risk_score_client: number
    ndpi_risk_score_server: number
    risks?: number[]
  }
  ssl?: {
    client_sni?: string
  }
  total_bytes: number
}

export type Badge = {
  id: string
  text: string
  icon: IconDefinition
  content?: string
  customClasses: string[]
}

export function matchBadge(tag: string): Badge {
  switch (tag) {
    case 'remote': {
      return {
        id: 'remote',
        text: 'standalone.flows.remote',
        icon: faArrowDown,
        customClasses: ['bg-rose-100', 'text-rose-800', 'dark:bg-rose-700', 'dark:text-rose-100'],
        content: 'standalone.flows.remote_description'
      }
    }
    case 'outgoing': {
      return {
        id: 'outgoing',
        text: 'standalone.flows.outgoing',
        icon: faArrowUp,
        customClasses: [
          'bg-green-100',
          'text-green-800',
          'dark:bg-green-700',
          'dark:text-green-100'
        ],
        content: 'standalone.flows.outgoing_description'
      }
    }
    case 'internal': {
      return {
        id: 'local',
        text: 'standalone.flows.internal',
        icon: faUsers,
        customClasses: ['bg-blue-100', 'text-blue-800', 'dark:bg-blue-700', 'dark:text-blue-100'],
        content: 'standalone.flows.internal_description'
      }
    }
    case 'broadcast': {
      return {
        id: 'broadcast',
        text: 'standalone.flows.broadcast',
        icon: faBroadcastTower,
        customClasses: [
          'bg-purple-100',
          'text-purple-800',
          'dark:bg-purple-700',
          'dark:text-purple-100'
        ],
        content: 'standalone.flows.broadcast_description'
      }
    }
    case 'blocked': {
      return {
        id: 'blocked',
        text: 'standalone.flows.blocked',
        icon: faCancel,
        customClasses: ['bg-rose-100', 'text-rose-800', 'dark:bg-rose-700', 'dark:text-rose-100'],
        content: 'standalone.flows.blocked_description'
      }
    }
    default: {
      return {
        id: tag,
        text: tag,
        icon: faQuestion,
        customClasses: ['bg-gray-100', 'text-gray-800', 'dark:bg-gray-700', 'dark:text-gray-100']
      }
    }
  }
}

export function extractBadges(entry: FlowEvent): Badge[] {
  return entry.tags.map((tag) => matchBadge(tag))
}

export function formatRate(rate: number): string {
  return kbpsFormat((rate * 8) / 1000)
}
