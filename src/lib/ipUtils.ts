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
