// Translation error message mappings for user-friendly Chinese messages

export interface TranslationErrorMapping {
  code: string
  message: string
  suggestion?: string
  retryable?: boolean
}

// Common error patterns and their Chinese translations
export const ERROR_MESSAGES: Record<string, TranslationErrorMapping> = {
  // Service unavailable / overload errors
  'UNAVAILABLE': {
    code: 'UNAVAILABLE',
    message: '翻译服务当前繁忙，请稍后重试',
    suggestion: '建议等待几分钟后再次尝试',
    retryable: true
  },
  '503': {
    code: '503',
    message: '翻译服务暂时过载，请稍后重试',
    suggestion: '服务器正在处理大量请求，请等待片刻',
    retryable: true
  },
  
  // Rate limiting errors
  'RATE_LIMIT': {
    code: 'RATE_LIMIT',
    message: '请求频率过高，请稍后重试',
    suggestion: '您的请求过于频繁，请等待一段时间后再试',
    retryable: true
  },
  '429': {
    code: '429',
    message: '请求次数超出限制，请稍后重试',
    suggestion: '请降低请求频率或等待配额重置',
    retryable: true
  },
  
  // Authentication errors
  'UNAUTHORIZED': {
    code: 'UNAUTHORIZED',
    message: 'API密钥无效或已过期',
    suggestion: '请检查设置中的API密钥配置',
    retryable: false
  },
  '401': {
    code: '401',
    message: '身份验证失败',
    suggestion: '请检查API密钥是否正确配置',
    retryable: false
  },
  
  // Request format errors
  'BAD_REQUEST': {
    code: 'BAD_REQUEST',
    message: '请求格式错误',
    suggestion: '请检查翻译内容格式是否正确',
    retryable: false
  },
  '400': {
    code: '400',
    message: '请求参数错误',
    suggestion: '请检查翻译设置和内容格式',
    retryable: false
  },
  
  // Configuration errors
  'NOT_CONFIGURED': {
    code: 'NOT_CONFIGURED',
    message: '翻译服务未配置',
    suggestion: '请在设置中配置翻译API密钥',
    retryable: false
  },
  
  // Network errors
  'NETWORK_ERROR': {
    code: 'NETWORK_ERROR',
    message: '网络连接错误',
    suggestion: '请检查网络连接后重试',
    retryable: true
  },
  'TIMEOUT': {
    code: 'TIMEOUT',
    message: '请求超时',
    suggestion: '网络连接可能不稳定，请重试',
    retryable: true
  },
  
  // Content errors
  'CONTENT_BLOCKED': {
    code: 'CONTENT_BLOCKED',
    message: '内容被安全策略阻止',
    suggestion: '请检查内容是否包含敏感信息',
    retryable: false
  },
  'CONTENT_TOO_LONG': {
    code: 'CONTENT_TOO_LONG',
    message: '翻译内容过长',
    suggestion: '请分段翻译或减少内容长度',
    retryable: false
  },
  
  // Generic fallbacks
  'TRANSLATION_ERROR': {
    code: 'TRANSLATION_ERROR',
    message: '翻译失败',
    suggestion: '请检查网络连接和API配置',
    retryable: true
  },
  'PROVIDER_ERROR': {
    code: 'PROVIDER_ERROR',
    message: '翻译服务提供商错误',
    suggestion: '请稍后重试或更换翻译服务',
    retryable: true
  }
}

// Provider-specific error patterns
export const PROVIDER_ERROR_PATTERNS: Record<string, Record<string, string>> = {
  // Gemini-specific error messages
  'gemini': {
    'The model is overloaded': 'UNAVAILABLE',
    'overloaded': 'UNAVAILABLE',
    'quota exceeded': 'RATE_LIMIT',
    'invalid api key': 'UNAUTHORIZED',
    'invalid request': 'BAD_REQUEST',
    'content filtered': 'CONTENT_BLOCKED'
  },
  
  // OpenAI-specific error messages  
  'openai': {
    'server is overloaded': 'UNAVAILABLE',
    'rate limit': 'RATE_LIMIT',
    'invalid api key': 'UNAUTHORIZED',
    'bad request': 'BAD_REQUEST',
    'content policy': 'CONTENT_BLOCKED',
    'context length exceeded': 'CONTENT_TOO_LONG'
  }
}

/**
 * Get user-friendly Chinese error message from error details
 */
export function getErrorMessage(
  errorMessage: string,
  errorCode?: string,
  providerName?: string
): TranslationErrorMapping {
  // First try direct code mapping
  if (errorCode && ERROR_MESSAGES[errorCode]) {
    return ERROR_MESSAGES[errorCode]
  }
  
  // Then try provider-specific pattern matching
  if (providerName && PROVIDER_ERROR_PATTERNS[providerName.toLowerCase()]) {
    const patterns = PROVIDER_ERROR_PATTERNS[providerName.toLowerCase()]
    for (const [pattern, mappedCode] of Object.entries(patterns)) {
      if (errorMessage.toLowerCase().includes(pattern.toLowerCase())) {
        return ERROR_MESSAGES[mappedCode] || ERROR_MESSAGES['TRANSLATION_ERROR']
      }
    }
  }
  
  // Try generic pattern matching
  const lowerMessage = errorMessage.toLowerCase()
  
  // Check for overload/unavailable patterns
  if (lowerMessage.includes('overload') || lowerMessage.includes('unavailable') || 
      lowerMessage.includes('busy') || lowerMessage.includes('503')) {
    return ERROR_MESSAGES['UNAVAILABLE']
  }
  
  // Check for rate limit patterns
  if (lowerMessage.includes('rate limit') || lowerMessage.includes('429') ||
      lowerMessage.includes('quota') || lowerMessage.includes('too many')) {
    return ERROR_MESSAGES['RATE_LIMIT']
  }
  
  // Check for auth patterns
  if (lowerMessage.includes('unauthorized') || lowerMessage.includes('401') ||
      lowerMessage.includes('invalid key') || lowerMessage.includes('api key')) {
    return ERROR_MESSAGES['UNAUTHORIZED']
  }
  
  // Check for network patterns
  if (lowerMessage.includes('network') || lowerMessage.includes('timeout') ||
      lowerMessage.includes('connection') || lowerMessage.includes('fetch')) {
    return ERROR_MESSAGES['NETWORK_ERROR']
  }
  
  // Fallback to generic error
  return ERROR_MESSAGES['TRANSLATION_ERROR']
}

/**
 * Create a formatted error message with suggestion
 */
export function formatErrorMessage(
  errorMessage: string,
  errorCode?: string,
  providerName?: string
): string {
  const mapping = getErrorMessage(errorMessage, errorCode, providerName)
  
  let formatted = mapping.message
  if (mapping.suggestion) {
    formatted += `\n提示：${mapping.suggestion}`
  }
  
  return formatted
}