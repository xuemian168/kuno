import { BaseSEOAIProvider } from './base'
import {
  SEOGenerationResult,
  KeywordResult,
  SEOContent,
  SEOAnalysisResult,
  SEOTitleOptions,
  SEODescriptionOptions,
  KeywordOptions,
  AuthHeaderType
} from '../types'
import { getProviderEndpoint, PROVIDER_DEFAULTS } from '../../ai-providers/utils'

export class OpenAISEOProvider extends BaseSEOAIProvider {
  name = 'OpenAI SEO'
  protected model = 'gpt-3.5-turbo'
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

  private getEndpoint(): string {
    return getProviderEndpoint(
      this.baseUrl,
      PROVIDER_DEFAULTS.openai.baseUrl,
      PROVIDER_DEFAULTS.openai.chatCompletionsPath
    )
  }

  private buildAuthHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

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
        } else {
          // Fallback to bearer if custom header not specified
          headers['Authorization'] = `Bearer ${this.apiKey}`
        }
        break
      default:
        headers['Authorization'] = `Bearer ${this.apiKey}`
    }

    return headers
  }

  async generateSEOTitle(content: string, language: string, options: SEOTitleOptions = {}): Promise<SEOGenerationResult> {
    if (!this.isConfigured()) {
      throw this.createError('OpenAI API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)

    const {
      maxLength = 60,
      includeBrand = false,
      brandName = '',
      focus_keyword = '',
      tone = 'professional',
      target_audience = ''
    } = options

    const languageName = this.getLanguageName(language)
    const cleanContent = this.extractTextFromMarkdown(content)
    const excerpt = this.truncateText(cleanContent, 1000)

    const prompt = `You are an expert SEO specialist. Create an optimized SEO title for the following content.

Requirements:
- Language: ${languageName}
- Maximum length: ${maxLength} characters
- Tone: ${tone}
${focus_keyword ? `- Must include focus keyword: "${focus_keyword}"` : ''}
${includeBrand && brandName ? `- Include brand name: "${brandName}"` : ''}
${target_audience ? `- Target audience: ${target_audience}` : ''}

Content excerpt:
${excerpt}

Generate 3 variations of SEO titles, ranked by effectiveness. For each title:
1. Ensure it's compelling and click-worthy
2. Include relevant keywords naturally
3. Stay within the character limit
4. Match the specified tone
5. Be unique and descriptive

Respond in JSON format:
{
  "primary_title": "main title here",
  "alternatives": ["alternative 1", "alternative 2"],
  "confidence": 0.95,
  "suggestions": ["suggestion 1", "suggestion 2"]
}`

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.buildAuthHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO specialist who creates optimized titles for better search engine rankings.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 500
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'SEO title generation failed',
          error.error?.code || 'GENERATION_ERROR'
        )
      }

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)

      return {
        content: result.primary_title,
        confidence: result.confidence || 0.8,
        alternatives: result.alternatives || [],
        suggestions: result.suggestions || [],
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          estimatedCost: this.calculateCost(data.usage?.total_tokens || 0),
          currency: 'USD'
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `OpenAI SEO title generation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async generateSEODescription(content: string, language: string, options: SEODescriptionOptions = {}): Promise<SEOGenerationResult> {
    if (!this.isConfigured()) {
      throw this.createError('OpenAI API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)

    const {
      maxLength = 160,
      includeCallToAction = true,
      focus_keyword = '',
      tone = 'professional',
      target_audience = ''
    } = options

    const languageName = this.getLanguageName(language)
    const cleanContent = this.extractTextFromMarkdown(content)
    const excerpt = this.truncateText(cleanContent, 1500)

    const prompt = `You are an expert SEO specialist. Create an optimized meta description for the following content.

Requirements:
- Language: ${languageName}
- Maximum length: ${maxLength} characters
- Tone: ${tone}
${focus_keyword ? `- Must include focus keyword: "${focus_keyword}"` : ''}
${includeCallToAction ? '- Include a compelling call-to-action' : ''}
${target_audience ? `- Target audience: ${target_audience}` : ''}

Content excerpt:
${excerpt}

Generate a meta description that:
1. Accurately summarizes the content
2. Includes relevant keywords naturally
3. Entices users to click
4. Stays within the character limit
5. Is unique and descriptive

Respond in JSON format:
{
  "description": "meta description here",
  "confidence": 0.95,
  "alternatives": ["alternative 1", "alternative 2"],
  "suggestions": ["suggestion 1", "suggestion 2"]
}`

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.buildAuthHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO specialist who creates optimized meta descriptions for better search engine rankings and click-through rates.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 300
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'SEO description generation failed',
          error.error?.code || 'GENERATION_ERROR'
        )
      }

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)

      return {
        content: result.description,
        confidence: result.confidence || 0.8,
        alternatives: result.alternatives || [],
        suggestions: result.suggestions || [],
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          estimatedCost: this.calculateCost(data.usage?.total_tokens || 0),
          currency: 'USD'
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `OpenAI SEO description generation error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async extractKeywords(content: string, language: string, options: KeywordOptions = {}): Promise<KeywordResult> {
    if (!this.isConfigured()) {
      throw this.createError('OpenAI API key not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguage(language)

    const {
      maxKeywords = 20,
      includeRelatad = true,
      focus_topics = [],
      difficulty_level = 'medium'
    } = options

    const languageName = this.getLanguageName(language)
    const cleanContent = this.extractTextFromMarkdown(content)
    const excerpt = this.truncateText(cleanContent, 2000)

    const prompt = `You are an expert SEO keyword researcher. Extract and suggest relevant keywords for the following content.

Requirements:
- Language: ${languageName}
- Maximum keywords: ${maxKeywords}
- Difficulty level: ${difficulty_level}
${focus_topics.length > 0 ? `- Focus topics: ${focus_topics.join(', ')}` : ''}
${includeRelatad ? '- Include related and semantic keywords' : ''}

Content:
${excerpt}

Analyze the content and provide:
1. Primary keywords (3-5 main keywords)
2. Secondary keywords (5-10 supporting keywords)
3. Long-tail keywords (specific phrases)
4. Related suggestions

For each keyword, assess:
- Relevance to content (0-1 scale)
- Frequency in content
- Estimated difficulty
- Search volume potential

Respond in JSON format:
{
  "primary_keywords": [
    {"keyword": "example", "relevance": 0.95, "frequency": 5, "difficulty": "medium", "search_volume": "high"}
  ],
  "secondary_keywords": [
    {"keyword": "example", "relevance": 0.8, "frequency": 3, "difficulty": "easy", "search_volume": "medium"}
  ],
  "long_tail_keywords": [
    {"keyword": "example phrase", "relevance": 0.9, "frequency": 2, "difficulty": "easy", "search_volume": "low"}
  ],
  "suggestions": ["additional keyword 1", "additional keyword 2"]
}`

    try {
      const response = await fetch(this.getEndpoint(), {
        method: 'POST',
        headers: this.buildAuthHeaders(),
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert SEO keyword researcher who identifies optimal keywords for content optimization.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 800
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.error?.message || 'Keyword extraction failed',
          error.error?.code || 'EXTRACTION_ERROR'
        )
      }

      const data = await response.json()
      const result = JSON.parse(data.choices[0].message.content)

      return {
        primary_keywords: result.primary_keywords || [],
        secondary_keywords: result.secondary_keywords || [],
        long_tail_keywords: result.long_tail_keywords || [],
        suggestions: result.suggestions || [],
        usage: {
          inputTokens: data.usage?.prompt_tokens || 0,
          outputTokens: data.usage?.completion_tokens || 0,
          totalTokens: data.usage?.total_tokens || 0,
          estimatedCost: this.calculateCost(data.usage?.total_tokens || 0),
          currency: 'USD'
        }
      }
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `OpenAI keyword extraction error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async generateSEOSlug(title: string, language: string): Promise<string> {
    // For slug generation, we can use a simpler approach without API call
    return this.generateSlugFromTitle(title)
  }

  async analyzeSEOContent(content: SEOContent, language: string): Promise<SEOAnalysisResult> {
    // This would be a comprehensive analysis
    // For now, return a basic analysis structure
    const cleanContent = this.extractTextFromMarkdown(content.content)
    const wordCount = this.calculateWordCount(cleanContent)
    
    // Basic analysis implementation
    return {
      overall_score: 75,
      title_analysis: {
        score: 80,
        length: content.title.length,
        optimal_length: { min: 30, max: 60 },
        has_focus_keyword: true,
        brand_included: false,
        uniqueness: 0.9,
        issues: [],
        suggestions: []
      },
      description_analysis: {
        score: 70,
        length: content.description?.length || 0,
        optimal_length: { min: 120, max: 160 },
        has_focus_keyword: true,
        has_call_to_action: false,
        uniqueness: 0.8,
        issues: [],
        suggestions: []
      },
      content_analysis: {
        score: 75,
        word_count: wordCount,
        paragraph_count: cleanContent.split('\n\n').length,
        heading_structure: {
          h1_count: 1,
          h2_count: 3,
          h3_count: 2,
          structure_score: 85,
          has_keyword_in_headings: true,
          issues: []
        },
        keyword_density: [],
        internal_links: 0,
        external_links: 0,
        image_optimization: {
          total_images: 0,
          images_with_alt: 0,
          images_with_title: 0,
          optimized_images: 0,
          score: 0,
          issues: []
        },
        issues: [],
        suggestions: []
      },
      keyword_analysis: {
        score: 70,
        focus_keyword_usage: 5,
        keyword_distribution: [],
        keyword_density: 1.2,
        optimal_density: { min: 0.5, max: 2.5 },
        related_keywords_found: 3,
        issues: [],
        suggestions: []
      },
      readability_analysis: {
        score: 80,
        reading_level: 'Grade 8-9',
        avg_sentence_length: 15,
        avg_paragraph_length: 50,
        passive_voice_percentage: 10,
        transition_words_percentage: 15,
        issues: [],
        suggestions: []
      },
      suggestions: []
    }
  }

  getSupportedLanguages(): string[] {
    // OpenAI supports most major languages
    return [
      'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt',
      'it', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu',
      'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'uk', 'be',
      'tr', 'he', 'fa', 'ur', 'hi', 'bn', 'ta', 'te', 'ml', 'kn',
      'gu', 'pa', 'mr', 'ne', 'si', 'my', 'km', 'lo', 'ka', 'am',
      'sw', 'zu', 'af', 'sq', 'hy', 'az', 'eu', 'ca', 'cy', 'ga',
      'is', 'mt', 'vi', 'th', 'id', 'ms', 'tl'
    ]
  }

  private calculateCost(tokens: number): number {
    // GPT-3.5-turbo pricing (as of 2024)
    const costPer1000Tokens = 0.002 // $0.002 per 1K tokens
    return (tokens / 1000) * costPer1000Tokens
  }
}