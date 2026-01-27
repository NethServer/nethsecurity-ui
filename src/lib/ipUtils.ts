export function ipv4ToInt(ip: string): number {
  if (
    !/^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
      ip
    )
  ) {
    throw new Error('Invalid IPv4 address')
  }
  return ip.split('.').reduce((acc, val) => acc * 256 + parseInt(val), 0)
}

/**
 * Check if a string is a valid IPv4 address
 */
function isIPv4(ip: string): boolean {
  return /^(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.(25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/.test(
    ip
  )
}

/**
 * Normalize IPv6 address by expanding compressed notation
 */
function normalizeIPv6(ip: string): string {
  // Remove zone identifier if present (e.g., %eth0)
  const cleanIp = ip.split('%')[0] || ip

  // Handle :: compression
  if (cleanIp.includes('::')) {
    const sides = cleanIp.split('::')
    const leftGroups = sides[0] ? sides[0].split(':') : []
    const rightGroups = sides[1] ? sides[1].split(':') : []
    const missingGroups = 8 - leftGroups.length - rightGroups.length
    const middleGroups = Array(missingGroups).fill('0')
    const allGroups = [...leftGroups, ...middleGroups, ...rightGroups]
    return allGroups.map((g) => g.padStart(4, '0')).join(':')
  }

  // Already expanded, just pad each group
  return cleanIp
    .split(':')
    .map((g) => g.padStart(4, '0'))
    .join(':')
}

/**
 * Convert IPv6 address to array of numeric segments for comparison
 */
function ipv6ToSegments(ip: string): number[] {
  const normalized = normalizeIPv6(ip)
  return normalized.split(':').map((segment) => parseInt(segment, 16))
}

/**
 * Sort IP addresses (IPv4 and IPv6). IPv4 addresses are sorted first, followed by IPv6.
 *
 * @param a First IP address
 * @param b Second IP address
 * @returns Negative if a < b, 0 if equal, positive if a > b
 */
export function sortIps(a: string, b: string): number {
  const aIsV4 = isIPv4(a)
  const bIsV4 = isIPv4(b)

  if (aIsV4 && bIsV4) {
    return ipv4ToInt(a) - ipv4ToInt(b)
  }
  if (!aIsV4 && !bIsV4) {
    const segmentsA = ipv6ToSegments(a)
    const segmentsB = ipv6ToSegments(b)
    for (let i = 0; i < 8; i++) {
      const diff = (segmentsA[i] || 0) - (segmentsB[i] || 0)
      if (diff !== 0) return diff
    }
    return 0
  }

  return aIsV4 ? -1 : 1
}
