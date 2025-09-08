import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// 重新导出统一配置中的函数，保持向后兼容性
export { getBaseUrl, getSiteUrl, getMediaUrl } from './config'

/**
 * 截断文本并添加省略号
 * 中文字符按2个字符长度计算，英文按1个字符计算
 * @param text 要截断的文本
 * @param maxLength 最大字符长度（默认150）
 * @param suffix 超长时的后缀（默认"..."）
 * @returns 截断后的文本
 */
export function truncateText(text: string, maxLength: number = 150, suffix: string = '...'): string {
  if (!text) return ''
  
  let currentLength = 0
  let truncateIndex = 0
  
  for (let i = 0; i < text.length; i++) {
    // 中文字符或全角字符按2个字符长度计算，英文按1个字符计算
    const char = text[i]
    const charLength = /[\u4e00-\u9fff\uff01-\uff5e]/.test(char) ? 2 : 1
    
    if (currentLength + charLength > maxLength) {
      truncateIndex = i
      break
    }
    
    currentLength += charLength
    truncateIndex = i + 1
  }
  
  // 如果没有超长，直接返回原文本
  if (truncateIndex >= text.length) {
    return text
  }
  
  // 尝试在单词边界截断（对于英文）
  let finalIndex = truncateIndex
  if (truncateIndex > 0) {
    // 向前查找最近的空格或标点符号作为截断点
    for (let i = truncateIndex - 1; i >= Math.max(0, truncateIndex - 10); i--) {
      const char = text[i]
      if (/[\s\.,;!?，。；！？]/.test(char)) {
        finalIndex = i + 1
        break
      }
    }
  }
  
  return text.substring(0, finalIndex).trim() + suffix
}

/**
 * 根据分类名称生成一致的主题色
 * @param categoryName 分类名称
 * @returns 包含渐变色信息的对象
 */
export function generateCategoryTheme(categoryName: string) {
  // 预定义的颜色主题
  const themes = [
    {
      gradient: 'from-blue-500/20 to-blue-600/30',
      border: 'border-blue-200 dark:border-blue-800',
      accent: 'text-blue-600 dark:text-blue-400',
      bg: 'bg-blue-50 dark:bg-blue-950/50'
    },
    {
      gradient: 'from-purple-500/20 to-purple-600/30', 
      border: 'border-purple-200 dark:border-purple-800',
      accent: 'text-purple-600 dark:text-purple-400',
      bg: 'bg-purple-50 dark:bg-purple-950/50'
    },
    {
      gradient: 'from-green-500/20 to-green-600/30',
      border: 'border-green-200 dark:border-green-800', 
      accent: 'text-green-600 dark:text-green-400',
      bg: 'bg-green-50 dark:bg-green-950/50'
    },
    {
      gradient: 'from-orange-500/20 to-orange-600/30',
      border: 'border-orange-200 dark:border-orange-800',
      accent: 'text-orange-600 dark:text-orange-400', 
      bg: 'bg-orange-50 dark:bg-orange-950/50'
    },
    {
      gradient: 'from-pink-500/20 to-pink-600/30',
      border: 'border-pink-200 dark:border-pink-800',
      accent: 'text-pink-600 dark:text-pink-400',
      bg: 'bg-pink-50 dark:bg-pink-950/50'
    },
    {
      gradient: 'from-indigo-500/20 to-indigo-600/30',
      border: 'border-indigo-200 dark:border-indigo-800',
      accent: 'text-indigo-600 dark:text-indigo-400',
      bg: 'bg-indigo-50 dark:bg-indigo-950/50'
    },
    {
      gradient: 'from-teal-500/20 to-teal-600/30',
      border: 'border-teal-200 dark:border-teal-800',
      accent: 'text-teal-600 dark:text-teal-400',
      bg: 'bg-teal-50 dark:bg-teal-950/50'
    },
    {
      gradient: 'from-rose-500/20 to-rose-600/30',
      border: 'border-rose-200 dark:border-rose-800',
      accent: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/50'
    }
  ]

  // 基于分类名称生成一致的哈希值
  let hash = 0
  for (let i = 0; i < categoryName.length; i++) {
    const char = categoryName.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 转换为32位整数
  }
  
  // 使用哈希值选择主题
  const themeIndex = Math.abs(hash) % themes.length
  return themes[themeIndex]
}

/**
 * 从文本中提取首字母作为装饰元素
 * @param text 文本内容
 * @returns 首字母或第一个字符
 */
export function getInitialLetter(text: string): string {
  if (!text) return '?'
  
  // 如果是中文，返回第一个字符
  if (/[\u4e00-\u9fff]/.test(text[0])) {
    return text[0]
  }
  
  // 如果是英文，返回首字母大写
  return text[0].toUpperCase()
}

/**
 * 解析SEO关键词字符串为关键词数组
 * @param keywordsString 逗号分隔的关键词字符串
 * @returns 清理后的关键词数组
 */
export function parseKeywords(keywordsString: string | undefined): string[] {
  if (!keywordsString || keywordsString.trim() === '') {
    return []
  }
  
  return keywordsString
    .split(/[,，、]/) // 支持中英文逗号和顿号分隔
    .map(keyword => keyword.trim())
    .filter(keyword => keyword.length > 0)
    .slice(0, 6) // 最多显示6个关键词
}

/**
 * 根据关键词内容和位置确定显示优先级
 * @param keywords 关键词数组
 * @returns 带优先级的关键词对象数组
 */
export function getKeywordPriority(keywords: string[]): Array<{
  text: string
  priority: 'primary' | 'secondary' | 'tertiary'
  size: string
}> {
  if (keywords.length === 0) return []
  
  return keywords.map((keyword, index) => {
    let priority: 'primary' | 'secondary' | 'tertiary'
    let size: string
    
    if (index === 0) {
      priority = 'primary'
      size = 'text-lg font-bold'
    } else if (index < 3) {
      priority = 'secondary' 
      size = 'text-sm font-medium'
    } else {
      priority = 'tertiary'
      size = 'text-xs font-normal'
    }
    
    return { text: keyword, priority, size }
  })
}

/**
 * 为关键词生成适合的显示布局
 * @param keywords 关键词数组
 * @returns 格式化的关键词显示信息
 */
export function formatKeywordDisplay(keywords: string[]): {
  hasKeywords: boolean
  primaryKeyword?: string
  secondaryKeywords: string[]
  displayKeywords: Array<{
    text: string
    priority: 'primary' | 'secondary' | 'tertiary'
    size: string
  }>
} {
  const prioritizedKeywords = getKeywordPriority(keywords)
  
  return {
    hasKeywords: keywords.length > 0,
    primaryKeyword: keywords[0],
    secondaryKeywords: keywords.slice(1, 4),
    displayKeywords: prioritizedKeywords
  }
}
