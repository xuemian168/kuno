import { BaseTranslationProvider } from './base'
import { TranslationResult, AuthHeaderType, TranslationModelProfile } from '../types'
import { DEFAULT_AI_MODELS } from '../../ai-providers/models'
import { formatErrorMessage } from '../error-messages'
import { getGeminiEndpoint, getProviderEndpoint, PROVIDER_DEFAULTS, shouldUseBrowserProxy } from '../../ai-providers/utils'
import { createTranslationModelProfile } from '../model-profiles'
import { buildBatchTranslationSystemPrompt, buildTranslationSystemPrompt } from '../prompt-utils'

export class GeminiProvider extends BaseTranslationProvider {
  name = 'Gemini'
  private model = DEFAULT_AI_MODELS.gemini
  private baseUrl?: string
  private authType: AuthHeaderType = 'bearer'
  private customAuthHeader?: string

  constructor(apiKey?: string, model?: string, baseUrl?: string, authType?: AuthHeaderType, customAuthHeader?: string) {
    super(apiKey)
    if (model) this.model = model
    if (baseUrl) this.baseUrl = baseUrl
    if (authType) this.authType = authType
    if (customAuthHeader) this.customAuthHeader = customAuthHeader
  }

  private isUsingCustomBaseUrl(): boolean {
    return !!this.baseUrl && this.baseUrl !== PROVIDER_DEFAULTS.gemini.baseUrl
  }

  private isUsingProxy(): boolean {
    return shouldUseBrowserProxy(this.baseUrl)
  }

  private getEndpoint(): string {
    if (!this.apiKey) {
      throw this.createError('Gemini API key not configured', 'NOT_CONFIGURED')
    }

    // 如果使用自定义 Base URL，不在 URL 中传递 API key
    if (this.isUsingCustomBaseUrl()) {
      const base = getProviderEndpoint(
        this.baseUrl,
        PROVIDER_DEFAULTS.gemini.baseUrl
      )
      const path = PROVIDER_DEFAULTS.gemini.generateContentPath.replace('{model}', this.model)
      return `${base}${path}`
    }

    // 官方 Gemini API：在 URL 中传递 key
    return getGeminiEndpoint(this.baseUrl, this.model, this.apiKey)
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Browser requests use the same-origin proxy and need the key in headers.
    // Server-side official Gemini calls keep using the key in the URL.
    if (!this.isUsingCustomBaseUrl() && !this.isUsingProxy()) {
      return headers
    }

    // 使用自定义 Base URL 时，使用认证头部
    if (!this.apiKey) {
      return headers
    }

    switch (this.authType) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${this.apiKey}`
        break
      case 'x-api-key':
        headers['x-api-key'] = this.apiKey
        break
      case 'x-goog-api-key':
        headers['x-goog-api-key'] = this.apiKey
        break
      case 'api-key':
        headers['api-key'] = this.apiKey
        break
      case 'custom':
        if (this.customAuthHeader) {
          headers[this.customAuthHeader] = this.apiKey
          if (this.isUsingProxy()) {
            headers['x-kuno-forward-auth-header'] = this.customAuthHeader
          }
        } else {
          headers['Authorization'] = `Bearer ${this.apiKey}`
        }
        break
      default:
        headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  getModelProfile(): TranslationModelProfile {
    return createTranslationModelProfile('gemini', this.model)
  }

  private getMaxOutputTokens(text: string): number {
    return Math.min(Math.max(Math.ceil(text.length * 1.8), 1024), this.getModelProfile().maxOutputTokens)
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('Gemini API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.buildAuthHeaders(),
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${buildTranslationSystemPrompt(fromLang, toLang)}

Text to translate:
${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: this.getMaxOutputTokens(text),
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        // Enhanced error parsing for different Gemini error formats
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'
        
        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.status || error.error.code || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }
        
        // Get user-friendly Chinese error message
        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)
        
        throw this.createError(friendlyMessage, errorCode)
      }

      const data = await response.json()
      
      if (!data.candidates || data.candidates.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }
      
      const translatedText = data.candidates[0].content.parts[0].text.trim()
      return translatedText
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Gemini error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateWithUsage(text: string, from: string, to: string): Promise<TranslationResult> {
    if (!this.isConfigured()) {
      throw this.createError('Gemini API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.buildAuthHeaders(),
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${buildTranslationSystemPrompt(fromLang, toLang)}

Text to translate:
${text}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: this.getMaxOutputTokens(text),
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        // Enhanced error parsing for different Gemini error formats
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'
        
        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.status || error.error.code || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }
        
        // Get user-friendly Chinese error message
        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)
        
        throw this.createError(friendlyMessage, errorCode)
      }

      const data = await response.json()
      
      if (!data.candidates || data.candidates.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }
      
      if (!data.candidates[0]?.content?.parts?.[0]?.text) {
        throw this.createError('Invalid translation response format', 'INVALID_RESPONSE')
      }
      
      const translatedText = data.candidates[0].content.parts[0].text.trim()
      
      // Extract token usage if available
      const inputTokens = data.usageMetadata?.promptTokenCount || 0
      const outputTokens = data.usageMetadata?.candidatesTokenCount || 0
      const totalTokens = data.usageMetadata?.totalTokenCount || inputTokens + outputTokens
      
      // Calculate estimated cost based on model
      let estimatedCost = 0
      const currency = 'USD'
      
      // Gemini pricing as of 2026-05 (per 1M tokens)
      const pricing: Record<string, { input: number, output: number }> = {
        'gemini-2.5-pro': { input: 1.25, output: 10.00 },
        'gemini-2.5-flash': { input: 0.30, output: 2.50 },
        'gemini-2.5-flash-lite': { input: 0.10, output: 0.40 },
        'gemini-1.5-flash': { input: 0.075, output: 0.30 },
        'gemini-1.5-flash-8b': { input: 0.0375, output: 0.15 },
        'gemini-1.5-pro': { input: 3.50, output: 10.50 },
        'gemini-1.0-pro': { input: 0.50, output: 1.50 }
      }
      
      const modelPricing = pricing[this.model] || pricing[DEFAULT_AI_MODELS.gemini]
      estimatedCost = (inputTokens / 1000000) * modelPricing.input + (outputTokens / 1000000) * modelPricing.output

      return {
        translatedText,
        usage: {
          inputTokens,
          outputTokens,
          totalTokens,
          estimatedCost,
          currency
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Gemini error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('Gemini API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      // Format texts as a numbered list for batch translation
      const numberedTexts = texts.map((text, i) => `${i + 1}. ${text}`).join('\n\n')

      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.buildAuthHeaders(),
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: `${buildBatchTranslationSystemPrompt(fromLang, toLang)}

Texts to translate:
${numberedTexts}`
            }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: this.getMaxOutputTokens(numberedTexts),
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
              threshold: "BLOCK_ONLY_HIGH"
            },
            {
              category: "HARM_CATEGORY_DANGEROUS_CONTENT",
              threshold: "BLOCK_ONLY_HIGH"
            }
          ]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        // Enhanced error parsing for different Gemini error formats
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'
        
        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.status || error.error.code || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }
        
        // Get user-friendly Chinese error message
        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)
        
        throw this.createError(friendlyMessage, errorCode)
      }

      const data = await response.json()
      
      if (!data.candidates || data.candidates.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }
      
      const translatedText = data.candidates[0].content.parts[0].text.trim()
      
      // Parse the numbered response
      const translations = translatedText
        .split(/\n+/)
        .filter((line: string) => line.match(/^\d+\./))
        .map((line: string) => line.replace(/^\d+\.\s*/, ''))

      if (translations.length !== texts.length) {
        // Fallback to individual translations if parsing fails
        return super.translateBatch(texts, from, to)
      }

      return translations
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Gemini error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  getSupportedLanguages(): string[] {
    // Gemini supports all major languages
    return [
      'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt',
      'it', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu',
      'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'uk', 'be',
      'tr', 'he', 'fa', 'ur', 'hi', 'bn', 'ta', 'te', 'ml', 'kn',
      'gu', 'pa', 'mr', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am',
      'sw', 'zu', 'af', 'sq', 'hy', 'az', 'eu', 'ca', 'cy', 'ga',
      'is', 'mt', 'vi', 'th', 'id', 'ms', 'tl', 'haw', 'mi', 'sm',
      'to', 'fj'
    ]
  }

  private getLanguageName(code: string): string {
    const names: Record<string, string> = {
      'zh': 'Chinese',
      'en': 'English',
      'ja': 'Japanese',
      'ko': 'Korean',
      'es': 'Spanish',
      'fr': 'French',
      'de': 'German',
      'ru': 'Russian',
      'ar': 'Arabic',
      'pt': 'Portuguese',
      'it': 'Italian',
      'nl': 'Dutch',
      'sv': 'Swedish',
      'da': 'Danish',
      'no': 'Norwegian',
      'fi': 'Finnish',
      'pl': 'Polish',
      'cs': 'Czech',
      'sk': 'Slovak',
      'hu': 'Hungarian',
      'ro': 'Romanian',
      'bg': 'Bulgarian',
      'hr': 'Croatian',
      'sr': 'Serbian',
      'sl': 'Slovenian',
      'et': 'Estonian',
      'lv': 'Latvian',
      'lt': 'Lithuanian',
      'uk': 'Ukrainian',
      'be': 'Belarusian',
      'tr': 'Turkish',
      'he': 'Hebrew',
      'fa': 'Persian',
      'ur': 'Urdu',
      'hi': 'Hindi',
      'bn': 'Bengali',
      'ta': 'Tamil',
      'te': 'Telugu',
      'ml': 'Malayalam',
      'kn': 'Kannada',
      'gu': 'Gujarati',
      'pa': 'Punjabi',
      'mr': 'Marathi',
      'ne': 'Nepali',
      'si': 'Sinhala',
      'my': 'Myanmar',
      'km': 'Khmer',
      'lo': 'Lao',
      'ka': 'Georgian',
      'am': 'Amharic',
      'sw': 'Swahili',
      'zu': 'Zulu',
      'af': 'Afrikaans',
      'sq': 'Albanian',
      'hy': 'Armenian',
      'az': 'Azerbaijani',
      'eu': 'Basque',
      'ca': 'Catalan',
      'cy': 'Welsh',
      'ga': 'Irish',
      'is': 'Icelandic',
      'mt': 'Maltese',
      'vi': 'Vietnamese',
      'th': 'Thai',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Tagalog',
      'haw': 'Hawaiian',
      'mi': 'Maori',
      'sm': 'Samoan',
      'to': 'Tongan',
      'fj': 'Fijian'
    }
    return names[code] || code
  }
}
