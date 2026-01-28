import { BaseTranslationProvider } from './base'
import { TranslationResult } from '../types'
import { formatErrorMessage } from '../error-messages'
import { getProviderEndpoint, PROVIDER_DEFAULTS } from '../../ai-providers/utils'

export class OpenAIProvider extends BaseTranslationProvider {
  name = 'OpenAI'
  private model = 'gpt-3.5-turbo'
  private baseUrl?: string

  constructor(apiKey?: string, model?: string, baseUrl?: string) {
    super(apiKey)
    if (model) this.model = model
    if (baseUrl) this.baseUrl = baseUrl
  }

  private getEndpoint(): string {
    return getProviderEndpoint(
      this.baseUrl,
      PROVIDER_DEFAULTS.openai.baseUrl,
      PROVIDER_DEFAULTS.openai.chatCompletionsPath
    )
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('OpenAI API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}. 
                       Maintain the original formatting, tone, and style. 
                       Only provide the translation without any explanation or additional text.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3,
          max_tokens: Math.min(text.length * 2, 4000)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        // Enhanced error parsing for different OpenAI error formats
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'
        
        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.code || error.error.type || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }
        
        // Get user-friendly Chinese error message
        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)
        
        throw this.createError(friendlyMessage,
          error.error?.code || 'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      return data.choices[0].message.content.trim()
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const friendlyMessage = formatErrorMessage(errorMessage, 'PROVIDER_ERROR', this.name)
      throw this.createError(friendlyMessage,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateWithUsage(text: string, from: string, to: string): Promise<TranslationResult> {
    if (!this.isConfigured()) {
      throw this.createError('OpenAI API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}. 
                       Maintain the original formatting, tone, and style. 
                       Only provide the translation without any explanation or additional text.`
            },
            {
              role: 'user',
              content: text
            }
          ],
          temperature: 0.3,
          max_tokens: Math.min(text.length * 2, 4000)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        // Enhanced error parsing for different OpenAI error formats
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'
        
        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.code || error.error.type || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }
        
        // Get user-friendly Chinese error message
        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)
        
        throw this.createError(friendlyMessage,
          error.error?.code || 'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      
      // Calculate estimated cost based on model
      const inputTokens = data.usage?.prompt_tokens || 0
      const outputTokens = data.usage?.completion_tokens || 0
      const totalTokens = data.usage?.total_tokens || inputTokens + outputTokens
      
      let estimatedCost = 0
      const currency = 'USD'
      
      // Pricing as of 2024 (per 1K tokens)
      const pricing: Record<string, { input: number, output: number }> = {
        'gpt-3.5-turbo': { input: 0.0015, output: 0.002 },
        'gpt-4': { input: 0.03, output: 0.06 },
        'gpt-4-turbo-preview': { input: 0.01, output: 0.03 },
        'gpt-4o': { input: 0.005, output: 0.015 },
        'gpt-4o-mini': { input: 0.00015, output: 0.0006 }
      }
      
      const modelPricing = pricing[this.model] || pricing['gpt-3.5-turbo']
      estimatedCost = (inputTokens / 1000) * modelPricing.input + (outputTokens / 1000) * modelPricing.output

      return {
        translatedText: data.choices[0].message.content.trim(),
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const friendlyMessage = formatErrorMessage(errorMessage, 'PROVIDER_ERROR', this.name)
      throw this.createError(friendlyMessage,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('OpenAI API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      // Format texts as a numbered list for batch translation
      const numberedTexts = texts.map((text, i) => `${i + 1}. ${text}`).join('\n\n')

      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate the following numbered texts from ${fromLang} to ${toLang}. 
                       Maintain the original formatting, tone, and style for each text. 
                       Keep the same numbering format in your response.
                       Only provide the translations without any explanation.`
            },
            {
              role: 'user',
              content: numberedTexts
            }
          ],
          temperature: 0.3,
          max_tokens: Math.min(numberedTexts.length * 2, 4000)
        })
      })

      if (!response.ok) {
        const error = await response.json()
        // Enhanced error parsing for different OpenAI error formats
        let errorMessage = 'Translation failed'
        let errorCode = 'TRANSLATION_ERROR'
        
        if (error.error) {
          errorMessage = error.error.message || errorMessage
          errorCode = error.error.code || error.error.type || String(response.status)
        } else if (error.message) {
          errorMessage = error.message
          errorCode = String(response.status)
        }
        
        // Get user-friendly Chinese error message
        const friendlyMessage = formatErrorMessage(errorMessage, errorCode, this.name)
        
        throw this.createError(friendlyMessage,
          error.error?.code || 'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      const translatedText = data.choices[0].message.content.trim()
      
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
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      const friendlyMessage = formatErrorMessage(errorMessage, 'PROVIDER_ERROR', this.name)
      throw this.createError(friendlyMessage,
        'PROVIDER_ERROR'
      )
    }
  }

  getSupportedLanguages(): string[] {
    // OpenAI supports all major languages
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
      'pt': 'Portuguese'
    }
    return names[code] || code
  }
}