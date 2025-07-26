import { BaseTranslationProvider } from './base'

export class OpenAIProvider extends BaseTranslationProvider {
  name = 'OpenAI'
  private model = 'gpt-3.5-turbo'
  
  constructor(apiKey?: string, model?: string) {
    super(apiKey)
    if (model) this.model = model
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('OpenAI API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(from)
    const toLang = this.getLanguageName(to)

    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        throw this.createError(
          error.error?.message || 'Translation failed',
          error.error?.code || 'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      return data.choices[0].message.content.trim()
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `OpenAI error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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

      const response = await fetch('https://api.openai.com/v1/chat/completions', {
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
        throw this.createError(
          error.error?.message || 'Translation failed',
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
      throw this.createError(
        `OpenAI error: ${error instanceof Error ? error.message : 'Unknown error'}`,
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