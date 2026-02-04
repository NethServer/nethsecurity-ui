/**
 * NDPI Risk Categorization
 *
 * This mapping is based on the official nDPI risk categorization.
 * Each risk code corresponds to a specific security or privacy concern that nDPI can detect.
 *
 * Reference: https://github.com/ntop/nDPI/blob/dev/src/include/ndpi_typedefs.h
 */

export const NDPI_RISKS: Record<number, string> = {
  0: 'Unknown Traffic', // NDPI_NO_RISK
  1: 'Unsafe Protocol', // NDPI_URL_POSSIBLE_XSS
  2: 'Possible XSS Attack', // NDPI_URL_POSSIBLE_SQL_INJECTION
  3: 'Possible SQL Injection', // NDPI_URL_POSSIBLE_RCE_INJECTION
  4: 'Binary Application Transfer', // NDPI_BINARY_APPLICATION_TRANSFER
  5: 'Known Protocol on Non-Standard Port', // NDPI_KNOWN_PROTOCOL_ON_NON_STANDARD_PORT
  6: 'TLS (Self) Selfsigned Certificate', // NDPI_TLS_SELFSIGNED_CERTIFICATE
  7: 'TLS Obsolete Version (1.0 or older)', // NDPI_TLS_OBSOLETE_VERSION
  8: 'TLS Weak Cipher', // NDPI_TLS_WEAK_CIPHER
  9: 'TLS Certificate Expired', // NDPI_TLS_CERTIFICATE_EXPIRED
  10: 'TLS Certificate Mismatch', // NDPI_TLS_CERTIFICATE_MISMATCH
  11: 'HTTP Suspicious User-Agent', // NDPI_HTTP_SUSPICIOUS_USER_AGENT
  12: 'HTTP Numeric IP Address', // NDPI_HTTP_NUMERIC_IP_ADDRESS
  13: 'HTTP Suspicious URL', // NDPI_HTTP_SUSPICIOUS_URL
  14: 'HTTP Suspicious Header', // NDPI_HTTP_SUSPICIOUS_HEADER
  15: 'TLS Not Carrying HTTPS', // NDPI_TLS_NOT_CARRYING_HTTPS
  16: 'Suspicious DGA Domain', // NDPI_SUSPICIOUS_DGA_DOMAIN
  17: 'Malformed Packet', // NDPI_MALFORMED_PACKET
  18: 'SSH Obsolete Client/Server Version', // NDPI_SSH_OBSOLETE_CLIENT_VERSION_OR_CIPHER
  19: 'SMB Insecure Version', // NDPI_SMB_INSECURE_VERSION
  20: 'TLS Suspicious ESNI Usage', // NDPI_TLS_SUSPICIOUS_ESNI_USAGE
  21: 'Unsafe Protocol', // NDPI_UNSAFE_PROTOCOL
  22: 'DNS Suspicious Traffic', // NDPI_DNS_SUSPICIOUS_TRAFFIC
  23: 'TLS Missing SNI', // NDPI_TLS_MISSING_SNI
  24: 'HTTP Suspicious Content', // NDPI_HTTP_SUSPICIOUS_CONTENT
  25: 'Risky ASN', // NDPI_RISKY_ASN
  26: 'Risky Domain', // NDPI_RISKY_DOMAIN
  27: 'Malicious JA3 Fingerprint', // NDPI_MALICIOUS_JA3
  28: 'Malicious SHA1 Certificate', // NDPI_MALICIOUS_SHA1_CERTIFICATE
  29: 'Desktop/File Sharing Session', // NDPI_DESKTOP_OR_FILE_SHARING_SESSION
  30: 'TLS Uncommon ALPN', // NDPI_TLS_UNCOMMON_ALPN
  31: 'TLS Certificate Validity Too Long', // NDPI_TLS_CERT_VALIDITY_TOO_LONG
  32: 'TLS Suspicious Extension', // NDPI_TLS_SUSPICIOUS_EXTENSION
  33: 'TLS Fatal Alert', // NDPI_TLS_FATAL_ALERT
  34: 'Suspicious Entropy', // NDPI_SUSPICIOUS_ENTROPY
  35: 'Clear Text Credentials', // NDPI_CLEAR_TEXT_CREDENTIALS
  36: 'DNS Large Packet', // NDPI_DNS_LARGE_PACKET
  37: 'DNS Fragmented', // NDPI_DNS_FRAGMENTED
  38: 'Invalid Characters in DNS Query', // NDPI_INVALID_CHARACTERS
  39: 'Possible DDoS', // NDPI_POSSIBLE_EXPLOIT
  40: 'TLS Certificate About to Expire', // NDPI_TLS_CERTIFICATE_ABOUT_TO_EXPIRE
  41: 'Punycode IDN Domain', // NDPI_PUNYCODE_IDN
  42: 'Error Code Detected', // NDPI_ERROR_CODE_DETECTED
  43: 'HTTP Crawler/Bot', // NDPI_HTTP_CRAWLER_BOT
  44: 'Anonymous Subscriber', // NDPI_ANONYMOUS_SUBSCRIBER
  45: 'Unidirectional Traffic', // NDPI_UNIDIRECTIONAL_TRAFFIC
  46: 'HTTP Obsolete Server', // NDPI_HTTP_OBSOLETE_SERVER
  47: 'Periodic Flow', // NDPI_PERIODIC_FLOW
  48: 'Minor Issues', // NDPI_MINOR_ISSUES
  49: 'TCP Issues', // NDPI_TCP_ISSUES
  50: 'Fully Encrypted Flow', // NDPI_FULLY_ENCRYPTED
  51: 'TLS ALPN/SNI Mismatch', // NDPI_TLS_ALPN_SNI_MISMATCH
  52: 'Malware Host Contacted', // NDPI_MALWARE_HOST_CONTACTED
  53: 'Binary Data Transfer', // NDPI_BINARY_DATA_TRANSFER
  54: 'Probing Attempt', // NDPI_PROBING_ATTEMPT
  55: 'Malicious Behavior', // NDPI_MALICIOUS_BEHAVIOR
  56: 'Possibly Unwanted Application', // NDPI_POSSIBLY_UNWANTED_APPLICATION
  57: 'Suspicious File Download/Upload', // NDPI_SUSPICIOUS_FILE_DOWNLOAD_UPLOAD
  58: 'Connection to Non-Standard Port', // NDPI_CONNECTION_TO_NONSTANDARD_PORT
  59: 'Data Exfiltration', // NDPI_DATA_EXFILTRATION
  60: 'Uncommon/Suspicious Activity' // NDPI_UNCOMMON_SUSPICIOUS_ACTIVITY
}

/**
 * Get the description for an NDPI risk code
 * @param riskCode - The NDPI risk code
 * @returns The description of the risk, or 'Unknown Risk' if not found
 */
export function getNdpiRiskDescription(riskCode: number): string {
  return NDPI_RISKS[riskCode] || 'Unknown Risk'
}

/**
 * Check if a risk code represents a high-severity risk
 * High severity risks include malware, exploits, data exfiltration, etc.
 * @param riskCode - The NDPI risk code
 * @returns true if the risk is considered high severity
 */
export function isHighSeverityRisk(riskCode: number): boolean {
  const highSeverityRisks = [
    2,
    3, // XSS, SQL Injection
    26, // Risky Domain
    27, // Malicious JA3
    28, // Malicious SHA1 Certificate
    39, // Possible DDoS/Exploit
    52, // Malware Host Contacted
    55, // Malicious Behavior
    59 // Data Exfiltration
  ]
  return highSeverityRisks.includes(riskCode)
}

/**
 * Check if a risk code represents a medium-severity risk
 * Medium severity risks include weak crypto, suspicious traffic, etc.
 * @param riskCode - The NDPI risk code
 * @returns true if the risk is considered medium severity
 */
export function isMediumSeverityRisk(riskCode: number): boolean {
  const mediumSeverityRisks = [
    1, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 29, 30, 31,
    32, 33, 34, 35, 36, 37, 38, 40, 41, 42, 54, 56, 57, 58, 60
  ]
  return mediumSeverityRisks.includes(riskCode)
}
