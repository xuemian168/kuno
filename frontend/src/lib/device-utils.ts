/**
 * 设备识别工具库
 * 基于后端成熟的用户代理解析逻辑
 * 提供统一的设备、浏览器、操作系统识别功能
 */

export interface DeviceInfo {
  browser: string
  browserVersion: string
  os: string
  osVersion: string
  deviceType: 'desktop' | 'mobile' | 'tablet'
  platform: string
}

/**
 * 解析用户代理字符串，提取设备信息
 */
export function parseUserAgent(userAgent?: string): DeviceInfo {
  const ua = userAgent || (typeof navigator !== 'undefined' ? navigator.userAgent : '')
  
  const info: DeviceInfo = {
    browser: 'Unknown',
    browserVersion: '',
    os: 'Unknown',
    osVersion: '',
    deviceType: 'desktop',
    platform: 'Unknown',
  }

  if (!ua) {
    return info
  }

  const userAgentLower = ua.toLowerCase()

  // 解析浏览器信息
  const browserInfo = parseBrowser(ua, userAgentLower)
  info.browser = browserInfo.browser
  info.browserVersion = browserInfo.version
  
  // 解析操作系统信息
  const osInfo = parseOS(ua, userAgentLower)
  info.os = osInfo.os
  info.osVersion = osInfo.version
  info.platform = osInfo.platform
  
  // 确定设备类型
  info.deviceType = parseDeviceType(ua, userAgentLower)

  return info
}

/**
 * 解析浏览器信息
 */
function parseBrowser(userAgent: string, userAgentLower: string): { browser: string; version: string } {
  // 微信内置浏览器
  if (userAgentLower.includes('micromessenger')) {
    const match = userAgentLower.match(/micromessenger\/([0-9.]+)/)
    return { browser: '微信浏览器', version: match ? match[1] : '' }
  }

  // QQ浏览器
  if (userAgentLower.includes('qqbrowser')) {
    const match = userAgentLower.match(/qqbrowser\/([0-9.]+)/)
    return { browser: 'QQ浏览器', version: match ? match[1] : '' }
  }

  // UC浏览器
  if (userAgentLower.includes('ucbrowser')) {
    const match = userAgentLower.match(/ucbrowser\/([0-9.]+)/)
    return { browser: 'UC浏览器', version: match ? match[1] : '' }
  }

  // 百度浏览器
  if (userAgentLower.includes('baiduboxapp') || userAgentLower.includes('baidubrowser')) {
    const match = userAgentLower.match(/baidubrowser\/([0-9.]+)/)
    return { browser: '百度浏览器', version: match ? match[1] : '' }
  }

  // 搜狗浏览器
  if (userAgentLower.includes('sogou')) {
    const match = userAgentLower.match(/se ([0-9.]+)/)
    return { browser: '搜狗浏览器', version: match ? match[1] : '' }
  }

  // 360浏览器
  if (userAgentLower.includes('360ee') || userAgentLower.includes('360se')) {
    return { browser: '360浏览器', version: '' }
  }

  // Edge (必须在Chrome之前检测，因为Edge包含Chrome标识)
  if (userAgentLower.includes('edg/') || userAgentLower.includes('edge/')) {
    const match = userAgentLower.match(/edg?e?\/([0-9.]+)/)
    return { browser: 'Edge', version: match ? match[1] : '' }
  }

  // Chrome (必须在Safari之前检测，因为Chrome包含Safari标识)
  if (userAgentLower.includes('chrome/') && !userAgentLower.includes('edg')) {
    const match = userAgentLower.match(/chrome\/([0-9.]+)/)
    return { browser: 'Chrome', version: match ? match[1] : '' }
  }

  // Firefox
  if (userAgentLower.includes('firefox/')) {
    const match = userAgentLower.match(/firefox\/([0-9.]+)/)
    return { browser: 'Firefox', version: match ? match[1] : '' }
  }

  // Safari (必须在Chrome检测之后)
  if (userAgentLower.includes('safari/') && !userAgentLower.includes('chrome')) {
    const match = userAgentLower.match(/version\/([0-9.]+)/)
    return { browser: 'Safari', version: match ? match[1] : '' }
  }

  // Opera
  if (userAgentLower.includes('opera') || userAgentLower.includes('opr/')) {
    const match = userAgentLower.match(/(?:opera\/|opr\/)([0-9.]+)/)
    return { browser: 'Opera', version: match ? match[1] : '' }
  }

  // Internet Explorer
  if (userAgentLower.includes('msie') || userAgentLower.includes('trident')) {
    const match = userAgentLower.match(/msie ([0-9.]+)/)
    if (match) {
      return { browser: 'Internet Explorer', version: match[1] }
    }
    if (userAgentLower.includes('trident')) {
      return { browser: 'Internet Explorer', version: '11' }
    }
    return { browser: 'Internet Explorer', version: '' }
  }

  return { browser: 'Unknown', version: '' }
}

/**
 * 解析操作系统信息
 */
function parseOS(userAgent: string, userAgentLower: string): { os: string; version: string; platform: string } {
  // Windows
  if (userAgentLower.includes('windows')) {
    const platform = 'Windows'
    if (userAgentLower.includes('windows nt 10.0')) {
      return { os: 'Windows 10/11', version: '10.0', platform }
    }
    if (userAgentLower.includes('windows nt 6.3')) {
      return { os: 'Windows 8.1', version: '6.3', platform }
    }
    if (userAgentLower.includes('windows nt 6.2')) {
      return { os: 'Windows 8', version: '6.2', platform }
    }
    if (userAgentLower.includes('windows nt 6.1')) {
      return { os: 'Windows 7', version: '6.1', platform }
    }
    const match = userAgentLower.match(/windows nt ([0-9.]+)/)
    return { os: 'Windows', version: match ? match[1] : '', platform }
  }

  // macOS
  if (userAgentLower.includes('mac os x') || userAgentLower.includes('macos')) {
    const platform = 'macOS'
    const match = userAgentLower.match(/mac os x ([0-9_]+)/)
    if (match) {
      const version = match[1].replace(/_/g, '.')
      return { os: 'macOS', version, platform }
    }
    return { os: 'macOS', version: '', platform }
  }

  // iOS
  if (userAgentLower.includes('iphone') || userAgentLower.includes('ipad') || userAgentLower.includes('ipod')) {
    const platform = 'iOS'
    const match = userAgentLower.match(/os ([0-9_]+)/)
    if (match) {
      const version = match[1].replace(/_/g, '.')
      return { os: 'iOS', version, platform }
    }
    return { os: 'iOS', version: '', platform }
  }

  // Android
  if (userAgentLower.includes('android')) {
    const platform = 'Android'
    const match = userAgentLower.match(/android ([0-9.]+)/)
    return { os: 'Android', version: match ? match[1] : '', platform }
  }

  // Linux
  if (userAgentLower.includes('linux')) {
    const platform = 'Linux'
    if (userAgentLower.includes('ubuntu')) {
      return { os: 'Ubuntu', version: '', platform }
    }
    if (userAgentLower.includes('fedora')) {
      return { os: 'Fedora', version: '', platform }
    }
    if (userAgentLower.includes('centos')) {
      return { os: 'CentOS', version: '', platform }
    }
    return { os: 'Linux', version: '', platform }
  }

  return { os: 'Unknown', version: '', platform: 'Unknown' }
}

/**
 * 解析设备类型
 */
function parseDeviceType(userAgent: string, userAgentLower: string): 'desktop' | 'mobile' | 'tablet' {
  // 移动设备
  if (
    userAgentLower.includes('mobile') ||
    userAgentLower.includes('iphone') ||
    userAgentLower.includes('ipod') ||
    (userAgentLower.includes('android') && userAgentLower.includes('mobile'))
  ) {
    return 'mobile'
  }

  // 平板设备
  if (
    userAgentLower.includes('tablet') ||
    userAgentLower.includes('ipad') ||
    (userAgentLower.includes('android') && !userAgentLower.includes('mobile'))
  ) {
    return 'tablet'
  }

  // 默认为桌面设备
  return 'desktop'
}

/**
 * 获取当前设备的类型
 */
export function getDeviceType(): 'desktop' | 'mobile' | 'tablet' {
  if (typeof navigator === 'undefined') return 'desktop'
  return parseUserAgent().deviceType
}

/**
 * 获取当前浏览器名称
 */
export function getBrowser(): string {
  if (typeof navigator === 'undefined') return 'Unknown'
  return parseUserAgent().browser
}

/**
 * 获取当前操作系统名称
 */
export function getOS(): string {
  if (typeof navigator === 'undefined') return 'Unknown'
  return parseUserAgent().os
}

/**
 * 获取屏幕尺寸信息
 */
export function getScreenSize(): string {
  if (typeof window === 'undefined') return ''
  return `${window.screen.width}x${window.screen.height}`
}

/**
 * 获取完整的设备信息
 */
export function getDeviceInfo(): DeviceInfo & { screenSize: string; userAgent: string } {
  const deviceInfo = parseUserAgent()
  return {
    ...deviceInfo,
    screenSize: getScreenSize(),
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : ''
  }
}

/**
 * 获取设备类型的中文名称
 */
export function getDeviceTypeChinese(deviceType: string): string {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return '手机'
    case 'tablet':
      return '平板'
    case 'desktop':
    default:
      return '桌面'
  }
}

/**
 * 判断是否为移动设备
 */
export function isMobile(): boolean {
  return getDeviceType() === 'mobile'
}

/**
 * 判断是否为平板设备
 */
export function isTablet(): boolean {
  return getDeviceType() === 'tablet'
}

/**
 * 判断是否为桌面设备
 */
export function isDesktop(): boolean {
  return getDeviceType() === 'desktop'
}

/**
 * 判断是否为触屏设备
 */
export function isTouchDevice(): boolean {
  const deviceType = getDeviceType()
  return deviceType === 'mobile' || deviceType === 'tablet'
}