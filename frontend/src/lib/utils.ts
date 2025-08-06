import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 重新导出统一配置中的函数，保持向后兼容性
export { getBaseUrl, getSiteUrl, getMediaUrl } from './config'
