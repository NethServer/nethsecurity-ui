import { describe, expect, it } from 'vitest'
import { getUbusReproductionCommand } from '@/lib/axiosErrorCommand'

describe('getUbusReproductionCommand', () => {
  it('builds the rpcd command for a ns.* ubus call with a payload', () => {
    const command = getUbusReproductionCommand({
      url: 'https://unit.example/api/ubus/call',
      data: JSON.stringify({ path: 'ns.dhcp', method: 'get-config', payload: { config: 'dhcp' } })
    })

    expect(command).toBe(`echo '{"config":"dhcp"}' | /usr/libexec/rpcd/ns.dhcp call get-config`)
  })

  it('omits the echo when the payload is empty', () => {
    const command = getUbusReproductionCommand({
      url: 'https://unit.example/api/ubus/call',
      data: JSON.stringify({ path: 'ns.dhcp', method: 'get-config', payload: {} })
    })

    expect(command).toBe('/usr/libexec/rpcd/ns.dhcp call get-config')
  })

  it('returns undefined for a non-ubus request', () => {
    const command = getUbusReproductionCommand({
      url: 'https://unit.example/api/login',
      data: JSON.stringify({ username: 'root', password: 'secret' })
    })

    expect(command).toBeUndefined()
  })

  it('returns undefined for a ubus call whose path is not ns.*', () => {
    const command = getUbusReproductionCommand({
      url: 'https://unit.example/api/ubus/call',
      data: JSON.stringify({ path: 'uci', method: 'get', payload: { config: 'network' } })
    })

    expect(command).toBeUndefined()
  })

  it('returns undefined when config.data is missing', () => {
    const command = getUbusReproductionCommand({
      url: 'https://unit.example/api/ubus/call'
    })

    expect(command).toBeUndefined()
  })
})
