import { AISummaryProvider } from '../types'

export abstract class BaseAISummaryProvider implements AISummaryProvider {
  abstract name: string
  protected apiKey?: string
  protected model?: string
  protected maxKeywords: number = 10
  protected summaryLength: 'short' | 'medium' | 'long' = 'medium'

  constructor(apiKey?: string, model?: string, maxKeywords?: number, summaryLength?: 'short' | 'medium' | 'long') {
    this.apiKey = apiKey
    this.model = model
    if (maxKeywords) this.maxKeywords = maxKeywords
    if (summaryLength) this.summaryLength = summaryLength
  }

  abstract generateSummary(content: string, language: string): Promise<any>
  abstract generateSEOKeywords(content: string, language: string): Promise<string[]>
  abstract generateTitle(content: string, language: string): Promise<string>

  isConfigured(): boolean {
    return !!this.apiKey
  }

  abstract getSupportedLanguages(): string[]

  protected createError(message: string, code: string): Error {
    const error = new Error(message) as any
    error.code = code
    error.provider = this.name
    return error
  }

  protected validateLanguage(language: string): void {
    const supported = this.getSupportedLanguages()
    if (!supported.includes(language)) {
      throw this.createError(
        `Unsupported language: ${language}`,
        'UNSUPPORTED_LANGUAGE'
      )
    }
  }

  protected getLanguageName(code: string): string {
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
      'vi': 'Vietnamese',
      'th': 'Thai',
      'id': 'Indonesian',
      'ms': 'Malay',
      'tl': 'Tagalog'
    }
    return names[code] || code
  }

  protected getSummaryLengthPrompt(): string {
    switch (this.summaryLength) {
      case 'short':
        return '1-2 sentences'
      case 'medium':
        return '3-4 sentences'
      case 'long':
        return '5-6 sentences'
      default:
        return '3-4 sentences'
    }
  }

  protected cleanContent(content: string): string {
    // Remove markdown syntax and clean up content for analysis
    return content
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')
      // Remove inline code
      .replace(/`[^`\n]+`/g, '')
      // Remove images
      .replace(/!\[.*?\]\(.*?\)/g, '')
      // Remove links but keep text
      .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
      // Remove HTML tags
      .replace(/<[^>]*>/g, '')
      // Remove excessive whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }
}