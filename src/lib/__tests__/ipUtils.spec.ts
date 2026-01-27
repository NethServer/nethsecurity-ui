import { expect, test, describe } from 'vitest'
import { ipv4ToInt, sortIps } from '@/lib/ipUtils.ts'

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

  describe('sortIps', () => {
    test('sorts IPv4 addresses correctly', () => {
      const ips = ['192.168.1.10', '192.168.1.2', '10.0.0.1', '192.168.1.1']
      const sorted = [...ips].sort(sortIps)
      expect(sorted).toEqual(['10.0.0.1', '192.168.1.1', '192.168.1.2', '192.168.1.10'])
    })

    test('sorts IPv6 addresses correctly', () => {
      const ips = ['2001:db8::2', '2001:db8::1', '2001:db8::10', '::1']
      const sorted = [...ips].sort(sortIps)
      expect(sorted).toEqual(['::1', '2001:db8::1', '2001:db8::2', '2001:db8::10'])
    })

    test('sorts mixed IPv4 and IPv6 with IPv4 first', () => {
      const ips = ['2001:db8::1', '192.168.1.1', '::1', '10.0.0.1', '2001:db8::2', '192.168.1.10']
      const sorted = [...ips].sort(sortIps)
      expect(sorted).toEqual([
        '10.0.0.1',
        '192.168.1.1',
        '192.168.1.10',
        '::1',
        '2001:db8::1',
        '2001:db8::2'
      ])
    })

    test('handles compressed and expanded IPv6 notation', () => {
      const ips = ['2001:0db8:0000:0000:0000:0000:0000:0001', '2001:db8::2', '2001:db8::1']
      const sorted = [...ips].sort(sortIps)
      expect(sorted).toEqual([
        '2001:0db8:0000:0000:0000:0000:0000:0001',
        '2001:db8::1',
        '2001:db8::2'
      ])
    })

    test('handles empty array', () => {
      const sorted = [].sort(sortIps)
      expect(sorted).toEqual([])
    })

    test('handles single IP', () => {
      expect(['192.168.1.1'].sort(sortIps)).toEqual(['192.168.1.1'])
      expect(['2001:db8::1'].sort(sortIps)).toEqual(['2001:db8::1'])
    })

    test('does not mutate original array when using spread', () => {
      const ips = ['192.168.1.2', '192.168.1.1']
      const original = [...ips]
      const sorted = [...ips].sort(sortIps)
      expect(ips).toEqual(original)
      expect(sorted).toEqual(['192.168.1.1', '192.168.1.2'])
    })

    test('sorts real-world example from FlowsTable', () => {
      const ips = [
        '192.168.1.203',
        '192.168.1.111',
        '192.168.120.12',
        '192.168.1.202',
        '10.0.0.1',
        '2001:db8::1',
        '::1'
      ]
      const sorted = [...ips].sort(sortIps)
      expect(sorted).toEqual([
        '10.0.0.1',
        '192.168.1.111',
        '192.168.1.202',
        '192.168.1.203',
        '192.168.120.12',
        '::1',
        '2001:db8::1'
      ])
    })

    test('comparator returns negative for IPv4 < IPv4', () => {
      expect(sortIps('10.0.0.1', '192.168.1.1')).toBeLessThan(0)
    })

    test('comparator returns positive for IPv4 > IPv4', () => {
      expect(sortIps('192.168.1.1', '10.0.0.1')).toBeGreaterThan(0)
    })

    test('comparator returns zero for equal IPv4', () => {
      expect(sortIps('192.168.1.1', '192.168.1.1')).toBe(0)
    })

    test('comparator returns negative for IPv6 < IPv6', () => {
      expect(sortIps('::1', '2001:db8::1')).toBeLessThan(0)
    })

    test('comparator returns positive for IPv6 > IPv6', () => {
      expect(sortIps('2001:db8::1', '::1')).toBeGreaterThan(0)
    })

    test('comparator returns zero for equal IPv6', () => {
      expect(sortIps('2001:db8::1', '2001:db8::1')).toBe(0)
    })

    test('comparator returns negative when IPv4 compared to IPv6', () => {
      expect(sortIps('192.168.1.1', '2001:db8::1')).toBe(-1)
    })

    test('comparator returns positive when IPv6 compared to IPv4', () => {
      expect(sortIps('2001:db8::1', '192.168.1.1')).toBe(1)
    })
  })
})
