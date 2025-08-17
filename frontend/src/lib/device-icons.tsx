/**
 * 设备图标工具库
 * 提供统一的设备、浏览器、操作系统图标
 * 基于 analytics 组件中已有的图标系统
 */

import React, { ReactElement } from 'react'
import { Monitor, Smartphone, Tablet, Globe } from 'lucide-react'

/**
 * 获取设备类型图标
 */
export function getDeviceIcon(deviceType: string): ReactElement {
  switch (deviceType?.toLowerCase()) {
    case 'mobile':
      return <Smartphone className="h-4 w-4" />
    case 'tablet':
      return <Tablet className="h-4 w-4" />
    case 'desktop':
    default:
      return <Monitor className="h-4 w-4" />
  }
}

/**
 * 获取浏览器图标
 */
export function getBrowserIcon(browser: string): ReactElement {
  const browserName = browser.toLowerCase()
  
  // 尝试使用自定义图标，如果失败则使用默认图标
  if (browserName.includes('chrome')) {
    return (
      <img 
        src="/browsers/chrome.svg" 
        alt="Chrome" 
        className="h-4 w-4" 
        onError={(e) => {
          e.currentTarget.style.display = 'none'
          e.currentTarget.nextElementSibling?.classList.remove('hidden')
        }}
      />
    )
  } else if (browserName.includes('firefox')) {
    return (
      <img 
        src="/browsers/firefox.svg" 
        alt="Firefox" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('safari')) {
    return (
      <img 
        src="/browsers/safari.svg" 
        alt="Safari" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('edge')) {
    return (
      <img 
        src="/browsers/edge.svg" 
        alt="Edge" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('opera')) {
    return (
      <img 
        src="/browsers/opera.svg" 
        alt="Opera" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('微信') || browserName.includes('wechat')) {
    return (
      <img 
        src="/browsers/wechat.svg" 
        alt="微信浏览器" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('qq')) {
    return (
      <img 
        src="/browsers/qq.svg" 
        alt="QQ浏览器" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('uc')) {
    return (
      <img 
        src="/browsers/uc.svg" 
        alt="UC浏览器" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('百度') || browserName.includes('baidu')) {
    return (
      <img 
        src="/browsers/baidu.svg" 
        alt="百度浏览器" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('搜狗') || browserName.includes('sogou')) {
    return (
      <img 
        src="/browsers/sogou.svg" 
        alt="搜狗浏览器" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (browserName.includes('360')) {
    return (
      <img 
        src="/browsers/360.svg" 
        alt="360浏览器" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }
  
  // 默认浏览器图标
  return <Globe className="h-4 w-4" />
}

/**
 * 获取操作系统图标
 */
export function getOSIcon(os: string): ReactElement {
  const osName = os.toLowerCase()
  
  if (osName.includes('android')) {
    return (
      <img 
        src="/devices/android.svg" 
        alt="Android" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (osName.includes('ios') || osName.includes('iphone') || osName.includes('ipad')) {
    return (
      <img 
        src="/devices/ios.svg" 
        alt="iOS" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (osName.includes('windows')) {
    return (
      <img 
        src="/devices/windows.svg" 
        alt="Windows" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (osName.includes('mac') || osName.includes('macos')) {
    return (
      <img 
        src="/devices/macos.svg" 
        alt="macOS" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  } else if (osName.includes('linux') || osName.includes('ubuntu') || osName.includes('fedora')) {
    return (
      <img 
        src="/devices/linux.svg" 
        alt="Linux" 
        className="h-4 w-4"
        onError={(e) => {
          e.currentTarget.style.display = 'none'
        }}
      />
    )
  }
  
  return <Monitor className="h-4 w-4" />
}

/**
 * 获取设备类型的中文显示名称
 */
export function getDeviceTypeDisplay(deviceType: string, language: string = 'zh'): string {
  if (language === 'zh') {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return '手机'
      case 'tablet':
        return '平板'
      case 'desktop':
      default:
        return '桌面'
    }
  } else {
    switch (deviceType?.toLowerCase()) {
      case 'mobile':
        return 'Mobile'
      case 'tablet':
        return 'Tablet'
      case 'desktop':
      default:
        return 'Desktop'
    }
  }
}

/**
 * 获取浏览器的显示名称（处理中文浏览器）
 */
export function getBrowserDisplay(browser: string): string {
  const browserName = browser.toLowerCase()
  
  if (browserName.includes('微信') || browserName.includes('wechat')) {
    return '微信浏览器'
  } else if (browserName.includes('qq') && browserName.includes('浏览器')) {
    return 'QQ浏览器'
  } else if (browserName.includes('uc') && browserName.includes('浏览器')) {
    return 'UC浏览器'
  } else if (browserName.includes('百度') || (browserName.includes('baidu') && browserName.includes('浏览器'))) {
    return '百度浏览器'
  } else if (browserName.includes('搜狗') || (browserName.includes('sogou') && browserName.includes('浏览器'))) {
    return '搜狗浏览器'
  } else if (browserName.includes('360') && browserName.includes('浏览器')) {
    return '360浏览器'
  } else {
    return browser
  }
}

/**
 * 获取操作系统的显示名称
 */
export function getOSDisplay(os: string): string {
  return os
}

/**
 * 检查浏览器图标是否存在
 */
export function checkBrowserIconExists(browser: string): boolean {
  const browserName = browser.toLowerCase()
  const supportedBrowsers = [
    'chrome', 'firefox', 'safari', 'edge', 'opera', 
    '微信', 'wechat', 'qq', 'uc', '百度', 'baidu', 
    '搜狗', 'sogou', '360'
  ]
  
  return supportedBrowsers.some(supported => browserName.includes(supported))
}

/**
 * 检查操作系统图标是否存在
 */
export function checkOSIconExists(os: string): boolean {
  const osName = os.toLowerCase()
  const supportedOS = [
    'android', 'ios', 'iphone', 'ipad', 'windows', 
    'mac', 'macos', 'linux', 'ubuntu', 'fedora'
  ]
  
  return supportedOS.some(supported => osName.includes(supported))
}