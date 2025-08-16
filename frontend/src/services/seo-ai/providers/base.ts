import { SEOAIProvider, SEOError } from '../types'

export abstract class BaseSEOAIProvider implements SEOAIProvider {
  abstract name: string
  protected apiKey?: string
  protected model?: string

  constructor(apiKey?: string, model?: string) {
    this.apiKey = apiKey
    this.model = model
  }

  abstract generateSEOTitle(content: string, language: string, options?: any): Promise<any>
  abstract generateSEODescription(content: string, language: string, options?: any): Promise<any>
  abstract extractKeywords(content: string, language: string, options?: any): Promise<any>
  abstract generateSEOSlug(title: string, language: string): Promise<string>
  abstract analyzeSEOContent(content: any, language: string): Promise<any>

  isConfigured(): boolean {
    return !!this.apiKey
  }

  abstract getSupportedLanguages(): string[]

  protected createError(message: string, code: string): SEOError {
    const error = new Error(message) as SEOError
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
    const languageNames: Record<string, string> = {
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
    return languageNames[code] || code
  }

  protected truncateText(text: string, maxLength: number): string {
    if (text.length <= maxLength) return text
    return text.substring(0, maxLength - 3) + '...'
  }

  protected extractTextFromMarkdown(markdown: string): string {
    // Remove markdown syntax for better text analysis
    return markdown
      .replace(/#{1,6}\s/g, '') // Remove headers
      .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
      .replace(/\*(.*?)\*/g, '$1') // Remove italic
      .replace(/`(.*?)`/g, '$1') // Remove inline code
      .replace(/```[\s\S]*?```/g, '') // Remove code blocks
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1') // Convert images to alt text
      .replace(/>\s*(.*)/g, '$1') // Remove blockquotes
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim()
  }

  protected calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  protected calculateReadingTime(text: string): number {
    const wordCount = this.calculateWordCount(text)
    return Math.ceil(wordCount / 200) // Assume 200 words per minute
  }

  protected generateSlugFromTitle(title: string): string {
    return title
      .toLowerCase()
      .trim()
      // Replace Chinese characters and spaces with hyphens
      .replace(/[\u4e00-\u9fff]+/g, (match) => {
        // For Chinese characters, use pinyin conversion if available
        // For now, replace with a placeholder or remove
        return match.replace(/./g, '-')
      })
      // Handle other languages
      .replace(/[^\w\s-]/g, '') // Remove special characters
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .replace(/^-|-$/g, '') // Remove leading/trailing hyphens
  }

  protected analyzeKeywordDensity(text: string, keywords: string[]): Array<{keyword: string, count: number, density: number}> {
    const cleanText = this.extractTextFromMarkdown(text).toLowerCase()
    const wordCount = this.calculateWordCount(cleanText)
    
    return keywords.map(keyword => {
      const keywordLower = keyword.toLowerCase()
      const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
      const matches = cleanText.match(regex) || []
      const count = matches.length
      const density = wordCount > 0 ? (count / wordCount) * 100 : 0
      
      return {
        keyword,
        count,
        density: Math.round(density * 100) / 100
      }
    })
  }

  protected calculateSEOScore(analysis: any): number {
    // Basic SEO scoring algorithm
    let score = 0
    const maxScore = 100

    // Title analysis (20 points)
    if (analysis.title_analysis) {
      score += Math.min(20, analysis.title_analysis.score * 0.2)
    }

    // Description analysis (20 points)
    if (analysis.description_analysis) {
      score += Math.min(20, analysis.description_analysis.score * 0.2)
    }

    // Content analysis (30 points)
    if (analysis.content_analysis) {
      score += Math.min(30, analysis.content_analysis.score * 0.3)
    }

    // Keyword analysis (20 points)
    if (analysis.keyword_analysis) {
      score += Math.min(20, analysis.keyword_analysis.score * 0.2)
    }

    // Readability analysis (10 points)
    if (analysis.readability_analysis) {
      score += Math.min(10, analysis.readability_analysis.score * 0.1)
    }

    return Math.round(score)
  }
}