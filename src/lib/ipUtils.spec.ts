import { expect, test, describe } from 'vitest'
import { ipv4ToInt } from '@/lib/ipUtils.ts'

describe('ipUtils', function () {
  test.each([
    ['192.168.1.203', 3232235979],
    ['192.168.1.202', 3232235978],
    ['192.168.1.111', 3232235887],
    ['192.168.1.112', 3232235888],
    ['192.168.120.12', 3232266252],
    ['192.168.1.113', 3232235889],
    ['192.168.1.200', 3232235976]
  ])('ipv4ToInt(%s) = %d', (ip, expected) => {
    expect(ipv4ToInt(ip)).toBe(expected)
  })

  test.each(['57db:46d4:2f2e:e173:514b:7aa3:de3a:4f33', '192.1.2', '0.0.0.x', '0.0.0.y'])(
    'ipv4ToInt(%s) throws on invalid IP',
    (ip) => {
      expect(() => ipv4ToInt(ip)).toThrowError('Invalid IPv4 address')
    }
  )
})
