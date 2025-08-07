import { BaseTranslationProvider } from './base'

export class VolcanoProvider extends BaseTranslationProvider {
  name = 'Volcano Engine'
  private arkApiKey: string
  private model: string
  private endpoint = 'https://ark.cn-beijing.volces.com/api/v3/chat/completions'
  
  constructor(apiKey?: string, model?: string, region?: string) {
    super(apiKey)
    this.arkApiKey = apiKey || ''
    this.model = model || 'doubao-seed-1-6-250615'
  }

  isConfigured(): boolean {
    return !!this.arkApiKey
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('Volcano Engine ARK API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(this.mapLanguageCode(from))
    const toLang = this.getLanguageName(this.mapLanguageCode(to))

    const systemPrompt = `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}. Return ONLY the translated text without any explanations or additional content.`
    
    const userPrompt = text

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.arkApiKey}`
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: systemPrompt
            },
            {
              role: 'user', 
              content: userPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
          stream: false
        })
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw this.createError(
          errorData.error?.message || `HTTP ${response.status}: ${response.statusText}`,
          'API_ERROR'
        )
      }

      const data = await response.json()
      
      if (!data.choices || data.choices.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }

      const translatedText = data.choices[0].message?.content?.trim()
      if (!translatedText) {
        throw this.createError('Empty translation result', 'EMPTY_RESULT')
      }

      // Log usage statistics for monitoring
      if (data.usage) {
        console.log('Volcano Translation Usage:', {
          inputTokens: data.usage.prompt_tokens,
          outputTokens: data.usage.completion_tokens,
          totalTokens: data.usage.total_tokens,
          estimatedCost: this.estimateCost(data.usage.total_tokens),
          model: data.model || this.model,
          inputLength: text.length,
          outputLength: translatedText.length
        })
      }

      return translatedText
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Volcano Engine error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('Volcano Engine ARK API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    const fromLang = this.getLanguageName(this.mapLanguageCode(from))
    const toLang = this.getLanguageName(this.mapLanguageCode(to))

    // For batch translation, we'll process them one by one to avoid token limits
    // In production, you might want to combine multiple texts smartly
    const results: string[] = []

    for (const text of texts) {
      try {
        const translated = await this.translate(text, from, to)
        results.push(translated)
      } catch (error) {
        // For batch processing, we'll return the original text if translation fails
        console.warn('Volcano batch translation failed for text:', text.substring(0, 50), error)
        results.push(text)
      }
    }

    console.log('Volcano Batch Translation completed:', {
      totalTexts: texts.length,
      successfulTranslations: results.filter((result, index) => result !== texts[index]).length,
      model: this.model
    })

    return results
  }

  getSupportedLanguages(): string[] {
    return [
      'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt',
      'it', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu',
      'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'uk', 'be',
      'tr', 'he', 'fa', 'ur', 'hi', 'bn', 'ta', 'te', 'vi', 'th',
      'id', 'ms', 'tl'
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
      'vi': 'Vietnamese',
      'th': 'Thai',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Tagalog'
    }
    return names[code] || code
  }

  private mapLanguageCode(code: string): string {
    // Map our standard codes to Volcano Engine codes
    const mapping: Record<string, string> = {
      'zh': 'zh',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'ru': 'ru',
      'ar': 'ar',
      'pt': 'pt',
      'it': 'it',
      'nl': 'nl',
      'sv': 'sv',
      'da': 'da',
      'no': 'no',
      'fi': 'fi',
      'pl': 'pl',
      'cs': 'cs',
      'sk': 'sk',
      'hu': 'hu',
      'ro': 'ro',
      'bg': 'bg',
      'hr': 'hr',
      'sr': 'sr',
      'sl': 'sl',
      'et': 'et',
      'lv': 'lv',
      'lt': 'lt',
      'uk': 'uk',
      'be': 'be',
      'tr': 'tr',
      'he': 'he',
      'fa': 'fa',
      'ur': 'ur',
      'hi': 'hi',
      'bn': 'bn',
      'ta': 'ta',
      'te': 'te',
      'vi': 'vi',
      'th': 'th',
      'id': 'id',
      'ms': 'ms',
      'tl': 'tl'
    }
    
    return mapping[code] || code
  }

  private estimateCost(totalTokens: number): number {
    // Volcano Engine pricing estimation (approximate)
    // This is an estimate - actual pricing may vary by model
    const costPerThousandTokens = this.model.includes('flash') ? 0.0005 : 0.002 // Flash models are cheaper
    return (totalTokens / 1000) * costPerThousandTokens
  }
}