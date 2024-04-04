/**
 * Helper class to parse SSH keys
 */
export class SshKey {
  type: string
  key: string
  comment?: string

  constructor(source: string) {
    const splitKey = source.split(' ')
    if (splitKey.length < 2) {
      throw new Error(`Invalid SSH key given. (${source})`)
    }
    // parse multiple cases of key types
    switch (splitKey[0]) {
      case 'ssh-rsa':
      case 'ssh-dss':
      case 'ssh-ed25519':
      case 'ecdsa-sha2':
      case 'ecdsa-sha2-nistp256':
      case 'sk-ecdsa-sha2-nistp256@openssh.com':
      case 'sk-ssh-ed25519@openssh.com':
        this.type = splitKey[0]
        break
      default:
        throw new Error('Invalid SSH key type.')
    }
    this.key = splitKey[1]
    // if there's a comment, we join the rest of the array
    if (splitKey.length > 2) {
      this.comment = splitKey
        .map((value, index) => {
          if (index > 1) {
            return value
          }
        })
        .join('')
    }
  }
}
