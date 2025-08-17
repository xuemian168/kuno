/**
 * 设备图标 Hook
 * 处理图标加载和错误回退
 */

import { useState, useEffect } from 'react'

interface IconState {
  src: string
  loaded: boolean
  error: boolean
}

/**
 * 使用图标并处理加载状态
 */
export function useIcon(iconPath: string) {
  const [state, setState] = useState<IconState>({
    src: iconPath,
    loaded: false,
    error: false
  })

  useEffect(() => {
    if (!iconPath) {
      setState(prev => ({ ...prev, error: true }))
      return
    }

    const img = new Image()
    img.onload = () => {
      setState(prev => ({ ...prev, loaded: true, error: false }))
    }
    img.onerror = () => {
      setState(prev => ({ ...prev, loaded: false, error: true }))
    }
    img.src = iconPath

    return () => {
      img.onload = null
      img.onerror = null
    }
  }, [iconPath])

  return state
}

/**
 * 浏览器图标路径映射
 */
const BROWSER_ICON_MAP: Record<string, string> = {
  chrome: '/browsers/chrome.svg',
  firefox: '/browsers/firefox.svg',
  safari: '/browsers/safari.svg',
  edge: '/browsers/edge.svg',
  opera: '/browsers/opera.svg',
  wechat: '/browsers/wechat.svg',
  '微信': '/browsers/wechat.svg',
  qq: '/browsers/qq.svg',
  uc: '/browsers/uc.svg',
  baidu: '/browsers/baidu.svg',
  '百度': '/browsers/baidu.svg',
  sogou: '/browsers/sogou.svg',
  '搜狗': '/browsers/sogou.svg',
  '360': '/browsers/360.svg'
}

/**
 * 操作系统图标路径映射
 */
const OS_ICON_MAP: Record<string, string> = {
  windows: '/devices/windows.svg',
  macos: '/devices/macos.svg',
  ios: '/devices/ios.svg',
  android: '/devices/android.svg',
  linux: '/devices/linux.svg'
}

/**
 * 获取浏览器图标路径
 */
export function getBrowserIconPath(browser: string): string | null {
  const browserLower = browser.toLowerCase()
  
  for (const [key, path] of Object.entries(BROWSER_ICON_MAP)) {
    if (browserLower.includes(key)) {
      return path
    }
  }
  
  return null
}

/**
 * 获取操作系统图标路径
 */
export function getOSIconPath(os: string): string | null {
  const osLower = os.toLowerCase()
  
  if (osLower.includes('windows')) return OS_ICON_MAP.windows
  if (osLower.includes('mac')) return OS_ICON_MAP.macos
  if (osLower.includes('ios') || osLower.includes('iphone') || osLower.includes('ipad')) return OS_ICON_MAP.ios
  if (osLower.includes('android')) return OS_ICON_MAP.android
  if (osLower.includes('linux')) return OS_ICON_MAP.linux
  
  return null
}

/**
 * 使用浏览器图标
 */
export function useBrowserIcon(browser: string) {
  const iconPath = getBrowserIconPath(browser)
  return useIcon(iconPath || '')
}

/**
 * 使用操作系统图标
 */
export function useOSIcon(os: string) {
  const iconPath = getOSIconPath(os)
  return useIcon(iconPath || '')
}