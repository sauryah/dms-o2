export function parseUserAgent(uaString: string) {
  if (!uaString) return { deviceType: 'desktop', label: 'Unknown Client' }
  const ua = uaString.toLowerCase()
  
  let os = 'Other OS'
  if (ua.includes('windows')) os = 'Windows'
  else if (ua.includes('macintosh') || ua.includes('mac os')) os = 'macOS'
  else if (ua.includes('linux')) os = 'Linux'
  else if (ua.includes('android')) os = 'Android'
  else if (ua.includes('iphone') || ua.includes('ipad')) os = 'iOS'

  let browser = 'Browser'
  if (ua.includes('firefox')) browser = 'Firefox'
  else if (ua.includes('chrome') && !ua.includes('chromium')) browser = 'Chrome'
  else if (ua.includes('safari') && !ua.includes('chrome')) browser = 'Safari'
  else if (ua.includes('edge') || ua.includes('edg')) browser = 'Edge'
  
  const isMobile = ua.includes('mobi') || ua.includes('android') || ua.includes('iphone')

  return {
    deviceType: isMobile ? 'mobile' : 'desktop',
    label: `${browser} on ${os}`
  }
}
