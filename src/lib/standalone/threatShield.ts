//  Copyright (C) 2026 Nethesis S.r.l.
//  SPDX-License-Identifier: GPL-3.0-or-later

// i18n keys of the readable fail2ban jail names
const jailLabelKeys: Record<string, string> = {
  'ns-ssh': 'standalone.threat_shield.jail_ssh',
  'ns-webui': 'standalone.threat_shield.jail_webui',
  'ns-openvpn': 'standalone.threat_shield.jail_openvpn',
  'ns-proxy-auth': 'standalone.threat_shield.jail_proxy_auth',
  'ns-proxy-scan': 'standalone.threat_shield.jail_proxy_scan'
}

// readable jail name, the raw name for unknown jails
export function getJailLabel(name: string, t: (key: string) => string): string {
  const key = jailLabelKeys[name]
  return key ? t(key) : name
}
