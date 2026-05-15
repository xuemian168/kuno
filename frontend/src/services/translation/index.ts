import { TranslationProvider, TranslationConfig, TranslationModelProfile, TranslationResult } from './types'
import { GoogleTranslateProvider } from './providers/google'
import { DeepLProvider } from './providers/deepl'
import { OpenAIProvider } from './providers/openai'
import { GeminiProvider } from './providers/gemini'
import { VolcanoProvider } from './providers/volcano'
import { ClaudeProvider } from './providers/claude'
import { LibreTranslateProvider } from './providers/libre-translate'
import { MyMemoryProvider } from './providers/mymemory'
import { GoogleFreeProvider } from './providers/google-free'
import { aiUsageTracker } from '../ai-usage-tracker'
import {
  protectTranslatableContent,
  restoreProtectedContent,
  splitMarkdownIntoSemanticChunks,
  validateRestoredContent,
  validateTranslatedContent
} from './content-pipeline'
import { createTranslationModelProfile, estimateTranslationTokens, getAdaptiveChunkTokenBudget } from './model-profiles'

export * from './types'

// Translation usage tracking
export interface TranslationUsageStats {
  totalTranslations: number
  totalTokens: number
  totalCost: number
  currency: string
  sessionStats: {
    translations: number
    tokens: number
    cost: number
  }
}

interface SelectiveCommentPlaceholder {
  placeholder: string
  commentText: string
  lineNumber: number
}

interface CodeCommentSegment {
  start: number
  end: number
  text: string
}

export class TranslationService {
  private providers: Map<string, TranslationProvider> = new Map()
  private activeProvider?: TranslationProvider
  private selectedComments: any[] = []
  private usageStats: TranslationUsageStats = {
    totalTranslations: 0,
    totalTokens: 0,
    totalCost: 0,
    currency: 'USD',
    sessionStats: {
      translations: 0,
      tokens: 0,
      cost: 0
    }
  }

  registerProvider(name: string, provider: TranslationProvider): void {
    this.providers.set(name, provider)
  }

  setActiveProvider(name: string): void {
    const provider = this.providers.get(name)
    if (!provider) {
      throw new Error(`Translation provider '${name}' not found`)
    }
    this.activeProvider = provider
  }

  getActiveProvider(): TranslationProvider | undefined {
    return this.activeProvider
  }

  getProviders(): string[] {
    return Array.from(this.providers.keys())
  }

  isConfigured(): boolean {
    return !!this.activeProvider && this.activeProvider.isConfigured()
  }

  getUsageStats(): TranslationUsageStats {
    return { ...this.usageStats }
  }

  resetSessionStats(): void {
    this.usageStats.sessionStats = {
      translations: 0,
      tokens: 0,
      cost: 0
    }
  }

  private updateUsageStats(usage: TranslationUsageStats['sessionStats']): void {
    this.usageStats.totalTranslations += usage.translations
    this.usageStats.totalTokens += usage.tokens
    this.usageStats.totalCost += usage.cost
    this.usageStats.sessionStats.translations += usage.translations
    this.usageStats.sessionStats.tokens += usage.tokens
    this.usageStats.sessionStats.cost += usage.cost
  }

  private getActiveProviderProfile(): TranslationModelProfile {
    return this.activeProvider?.getModelProfile?.() || createTranslationModelProfile('generic')
  }

  private estimateActiveProviderTokens(text: string): number {
    return this.activeProvider?.estimateTokens?.(text) || estimateTranslationTokens(text)
  }

  private mergeUsage(
    current: TranslationResult['usage'] | undefined,
    next: TranslationResult['usage'] | undefined
  ): TranslationResult['usage'] | undefined {
    if (!current && !next) {
      return undefined
    }

    return {
      inputTokens: (current?.inputTokens || 0) + (next?.inputTokens || 0),
      outputTokens: (current?.outputTokens || 0) + (next?.outputTokens || 0),
      totalTokens: (current?.totalTokens || 0) + (next?.totalTokens || 0),
      estimatedCost: (current?.estimatedCost || 0) + (next?.estimatedCost || 0),
      currency: next?.currency || current?.currency || 'USD'
    }
  }

  private async callActiveProvider(text: string, from: string, to: string): Promise<{
    translatedText: string
    usage?: TranslationResult['usage']
  }> {
    if (!this.activeProvider) {
      throw new Error('No active translation provider')
    }

    if (this.activeProvider.translateWithUsage) {
      const result = await this.activeProvider.translateWithUsage(text, from, to)
      return {
        translatedText: result.translatedText,
        usage: result.usage
      }
    }

    return {
      translatedText: await this.activeProvider.translate(text, from, to)
    }
  }

  private async translateAdaptively(text: string, from: string, to: string): Promise<{
    translatedText: string
    usage?: TranslationResult['usage']
    inputText: string
    strategy: 'direct' | 'semantic_chunks'
    chunkCount: number
  }> {
    const protectedContent = protectTranslatableContent(text)

    if (protectedContent.text.trim() === '') {
      return {
        translatedText: text,
        inputText: protectedContent.text,
        strategy: 'direct',
        chunkCount: 0
      }
    }

    const profile = this.getActiveProviderProfile()
    const chunkBudget = getAdaptiveChunkTokenBudget(profile)
    const chunks = splitMarkdownIntoSemanticChunks(
      protectedContent.text,
      chunkBudget,
      (value) => this.estimateActiveProviderTokens(value)
    )
    const strategy = chunks.length > 1 ? 'semantic_chunks' : 'direct'
    let mergedTranslation = ''
    let mergedUsage: TranslationResult['usage'] | undefined

    for (const chunk of chunks) {
      const result = await this.callActiveProvider(chunk.text, from, to)
      const issues = validateTranslatedContent(chunk.text, result.translatedText, chunk.id)

      if (issues.length > 0) {
        throw new Error(`Translation QA failed: ${issues.map((issue) => issue.message).join('; ')}`)
      }

      mergedTranslation = mergedTranslation
        ? `${mergedTranslation}\n\n${result.translatedText}`
        : result.translatedText
      mergedUsage = this.mergeUsage(mergedUsage, result.usage)
    }

    const restoredText = restoreProtectedContent(mergedTranslation, protectedContent.items)
    const restoreIssues = validateRestoredContent(restoredText)

    if (restoreIssues.length > 0) {
      throw new Error(`Translation restore failed: ${restoreIssues.map((issue) => issue.message).join('; ')}`)
    }

    if (strategy === 'semantic_chunks') {
      console.info('Adaptive translation completed', {
        provider: this.activeProvider?.name,
        model: profile.model,
        chunkCount: chunks.length,
        chunkBudget,
        inputTokens: this.estimateActiveProviderTokens(protectedContent.text)
      })
    }

    return {
      translatedText: restoredText,
      usage: mergedUsage,
      inputText: protectedContent.text,
      strategy,
      chunkCount: chunks.length
    }
  }

  private getFencedCodeLineNumbers(text: string): Set<number> {
    const codeLineNumbers = new Set<number>()
    let inCodeBlock = false

    text.split('\n').forEach((line, index) => {
      const lineNumber = index + 1

      if (line.trim().startsWith('```')) {
        inCodeBlock = !inCodeBlock
        return
      }

      if (inCodeBlock) {
        codeLineNumbers.add(lineNumber)
      }
    })

    return codeLineNumbers
  }

  private findInlineSlashCommentIndex(line: string): number {
    let slashIndex = line.indexOf('//')

    while (slashIndex >= 0) {
      const beforeSlash = line.substring(0, slashIndex).toLowerCase()
      const nearbyPrefix = line.substring(Math.max(0, slashIndex - 8), slashIndex).toLowerCase()

      if (!nearbyPrefix.includes('http:') && !nearbyPrefix.includes('https:') && !beforeSlash.endsWith(':')) {
        return slashIndex
      }

      slashIndex = line.indexOf('//', slashIndex + 2)
    }

    return -1
  }

  private findInlineHashCommentIndex(line: string): number {
    let hashIndex = line.indexOf('#')

    while (hashIndex >= 0) {
      const beforeHash = line.substring(0, hashIndex).toLowerCase()

      if (!beforeHash.includes('http') && !beforeHash.includes('www.') && !/\[[^\]]+\]\([^)]*$/.test(beforeHash)) {
        return hashIndex
      }

      hashIndex = line.indexOf('#', hashIndex + 1)
    }

    return -1
  }

  private createCodeCommentSegment(line: string, start: number, end: number): CodeCommentSegment | null {
    let textStart = start
    let textEnd = end

    while (textStart < textEnd && /\s/.test(line[textStart])) {
      textStart++
    }

    while (textEnd > textStart && /\s/.test(line[textEnd - 1])) {
      textEnd--
    }

    if (textStart >= textEnd) {
      return null
    }

    return {
      start: textStart,
      end: textEnd,
      text: line.slice(textStart, textEnd)
    }
  }

  private getCodeCommentSegment(line: string): CodeCommentSegment | null {
    const xmlMatch = line.match(/^(.*?<!--\s*)([\s\S]*?)(\s*-->.*)$/)
    if (xmlMatch) {
      return this.createCodeCommentSegment(
        line,
        xmlMatch[1].length,
        xmlMatch[1].length + xmlMatch[2].length
      )
    }

    const hashLineMatch = line.match(/^(\s*#\s*)(.+)$/)
    if (hashLineMatch) {
      return this.createCodeCommentSegment(line, hashLineMatch[1].length, line.length)
    }

    const slashLineMatch = line.match(/^(\s*\/\/\s*)(.+)$/)
    if (slashLineMatch) {
      return this.createCodeCommentSegment(line, slashLineMatch[1].length, line.length)
    }

    const slashIndex = this.findInlineSlashCommentIndex(line)
    if (slashIndex >= 0) {
      return this.createCodeCommentSegment(line, slashIndex + 2, line.length)
    }

    const hashIndex = this.findInlineHashCommentIndex(line)
    if (hashIndex >= 0) {
      return this.createCodeCommentSegment(line, hashIndex + 1, line.length)
    }

    return null
  }

  private isSelectedCodeComment(lineNumber: number, commentText: string): boolean {
    const normalizedCommentText = commentText.trim()

    return this.selectedComments.some((comment) => {
      if (comment.lineNumber !== lineNumber) {
        return false
      }

      if (!comment.commentText) {
        return true
      }

      return comment.commentText.trim() === normalizedCommentText
    })
  }

  private prepareSelectiveCommentPlaceholders(text: string): {
    text: string
    comments: SelectiveCommentPlaceholder[]
  } {
    const fencedCodeLineNumbers = this.getFencedCodeLineNumbers(text)
    const comments: SelectiveCommentPlaceholder[] = []

    const lines = text.split('\n').map((line, index) => {
      const lineNumber = index + 1

      if (!fencedCodeLineNumbers.has(lineNumber)) {
        return line
      }

      const segment = this.getCodeCommentSegment(line)
      if (!segment || !this.isSelectedCodeComment(lineNumber, segment.text)) {
        return line
      }

      const placeholder = `{{KUNO_COMMENT_${String(comments.length).padStart(4, '0')}}}`
      comments.push({
        placeholder,
        commentText: segment.text,
        lineNumber
      })

      return `${line.slice(0, segment.start)}${placeholder}${line.slice(segment.end)}`
    })

    return {
      text: lines.join('\n'),
      comments
    }
  }

  private restoreSelectiveCommentPlaceholders(
    text: string,
    translatedComments: Map<string, string>
  ): string {
    let result = text

    translatedComments.forEach((translatedComment, placeholder) => {
      result = result.split(placeholder).join(translatedComment.trim())
    })

    return result
  }

  private async translateWithSelectiveComments(text: string, from: string, to: string): Promise<string> {
    const preparedText = this.prepareSelectiveCommentPlaceholders(text)
    const providerName = this.activeProvider!.name.toLowerCase()
    const startTime = Date.now()
    let success = false
    let errorMessage: string | undefined
    let usage: TranslationResult['usage'] | undefined

    try {
      const result = await this.translateAdaptively(preparedText.text, from, to)
      usage = result.usage
      const translatedComments = new Map<string, string>()

      for (const comment of preparedText.comments) {
        const translatedComment = await this.callActiveProvider(comment.commentText, from, to)
        translatedComments.set(comment.placeholder, translatedComment.translatedText)
        usage = this.mergeUsage(usage, translatedComment.usage)
      }

      const translatedText = this.restoreSelectiveCommentPlaceholders(
        result.translatedText,
        translatedComments
      )
      success = true

      if (usage) {
        this.updateUsageStats({
          translations: 1,
          tokens: usage.totalTokens || 0,
          cost: usage.estimatedCost || 0
        })
      }
      
      // Track usage with detailed metrics
      const responseTime = Date.now() - startTime
      await aiUsageTracker.trackUsage({
        serviceType: 'translation',
        provider: providerName,
        operation: 'translate_text',
        language: `${from}->${to}`,
        inputLength: result.inputText.length + preparedText.comments.reduce((sum, comment) => sum + comment.commentText.length, 0),
        outputLength: translatedText.length,
        inputTokens: usage?.inputTokens || 0,
        outputTokens: usage?.outputTokens || 0,
        totalTokens: usage?.totalTokens || 0,
        estimatedCost: usage?.estimatedCost || 0,
        currency: usage?.currency || 'USD',
        success,
        responseTime,
        errorMessage
      })
      
      return translatedText
      
    } catch (error) {
      success = false
      errorMessage = error instanceof Error ? error.message : 'Unknown error'
      
      // Track failed usage
      const responseTime = Date.now() - startTime
      await aiUsageTracker.trackUsage({
        serviceType: 'translation',
        provider: providerName,
        operation: 'translate_text',
        language: `${from}->${to}`,
        inputLength: preparedText.text.length,
        outputLength: 0,
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
        estimatedCost: 0,
        currency: 'USD',
        success,
        responseTime,
        errorMessage
      })
      
      console.error('Translation with selective comments failed:', error)
      throw error
    }
  }

  // Public method to clean up corrupted protected content
  public cleanupProtectedContent(text: string): string {
    let cleanedText = text

    // Remove various placeholder patterns that might have been left behind
    const placeholderPatterns = [
      // New cache placeholder patterns
      /CACHED-PATTERN-\d+-\d+-CACHED/gi,
      /cached-pattern-\d+-\d+-cached/gi,
      // New cache placeholder patterns
      /CACHED_PATTERN_\d+_\d+_CACHED/gi,
      /cached_pattern_\d+_\d+_cached/gi,
      // Old placeholder patterns for compatibility
      /XPROTECTCODEX\d+XPROTECTCODEX/gi,
      /xprotectcodex\d+xprotectcodex/gi,
      /XPROTECTX\d+X\d+XPROTECTX/gi,
      /xprotectx\d+x\d+xprotectx/gi,
      /___TRANSLATION_PROTECT_\d+_\d+___/gi,
      /____translation_protect_\d+_\d+___/gi,
      /__ Protected_\d+_\d+__/gi,
      /__PROTECTED_\d+_\d+__/gi,
      /__ Translation_Protect_\d+_\d+__/gi,
      /__ translation_protect_\d+_\d+__/gi,
      // Partial placeholder patterns
      /_TRANSLATION_PROTECT_\d+_\d+_/gi,
      /TRANSLATION_PROTECT_\d+_\d+/gi,
      /Protected_\d+_\d+/gi,
      // Leading underscores before specific content
      /^_+(?=<YouTubeEmbed)/gm,
      /^_+(?=<youtubeembed)/gmi,
      /^_+(?=<BilibiliEmbed)/gm,
      /^_+(?=<bilibiliembed)/gmi,
      /^_+(?=```)/gm,
      /^_+(?=<[a-zA-Z])/gm,
      // Underscores at start of lines that look like leftovers
      /(?:\n|^)_+(?=\S)/gm,
    ]

    placeholderPatterns.forEach(pattern => {
      cleanedText = cleanedText.replace(pattern, '')
    })

    // Clean up extra whitespace that might result from removing placeholders
    cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n')
    cleanedText = cleanedText.replace(/^\s+|\s+$/g, '')

    return cleanedText
  }

  async translate(text: string, from: string, to: string, selectedComments?: any[]): Promise<string> {
    // Use selectedComments parameter or existing stored comments
    const commentsToUse = selectedComments || this.selectedComments

    if (!this.activeProvider) {
      throw new Error('No active translation provider')
    }

    if (!this.activeProvider.isConfigured()) {
      throw new Error(`Translation provider '${this.activeProvider.name}' is not configured`)
    }
    
    // If we have selected comments, use direct selective translation
    if (commentsToUse && commentsToUse.length > 0) {
      // Store for use in translateWithSelectiveComments
      this.selectedComments = commentsToUse
      return await this.translateWithSelectiveComments(text, from, to)
    }

    try {
      const providerName = this.activeProvider.name.toLowerCase()
      const startTime = Date.now()
      let success = false
      let errorMessage: string | undefined
      let usage: TranslationResult['usage'] | undefined

      try {
        const result = await this.translateAdaptively(text, from, to)
        usage = result.usage

        // Update local usage stats if available
        if (usage) {
          this.updateUsageStats({
            translations: 1,
            tokens: usage.totalTokens || 0,
            cost: usage.estimatedCost || 0
          })
        }

        success = true
        
        // Track usage with detailed metrics
        const responseTime = Date.now() - startTime
        await aiUsageTracker.trackUsage({
          serviceType: 'translation',
          provider: providerName,
          operation: 'translate_text',
          language: `${from}->${to}`,
          inputLength: result.inputText.length,
          outputLength: result.translatedText.length,
          inputTokens: usage?.inputTokens || 0,
          outputTokens: usage?.outputTokens || 0,
          totalTokens: usage?.totalTokens || 0,
          estimatedCost: usage?.estimatedCost || 0,
          currency: usage?.currency || 'USD',
          success,
          responseTime,
          errorMessage
        })
        
        return result.translatedText
      } catch (error) {
        success = false
        errorMessage = error instanceof Error ? error.message : 'Unknown error'
        
        // Track failed usage
        const responseTime = Date.now() - startTime
        await aiUsageTracker.trackUsage({
          serviceType: 'translation',
          provider: providerName,
          operation: 'translate_text',
          language: `${from}->${to}`,
          inputLength: text.length,
          outputLength: 0,
          inputTokens: 0,
          outputTokens: 0,
          totalTokens: 0,
          estimatedCost: 0,
          currency: 'USD',
          success,
          responseTime,
          errorMessage
        })
        
        throw error
      }
    } catch (error) {
      console.error('Translation failed:', error)
      // Rethrow error to let caller handle it
      throw error
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.activeProvider) {
      throw new Error('No active translation provider')
    }

    if (!this.activeProvider.isConfigured()) {
      throw new Error(`Translation provider '${this.activeProvider.name}' is not configured`)
    }

    // Process each text individually to handle protected content properly
    const results: string[] = []
    
    for (const text of texts) {
      try {
        // Pass selectedComments to each translate call
        const translated = await this.translate(text, from, to, this.selectedComments)
        results.push(translated)
      } catch (error) {
        results.push(text) // Return original text on failure
      }
    }

    return results
  }

  async translateArticle(article: {
    title: string
    content: string
    summary: string
  }, from: string, to: string, selectedComments?: any[]): Promise<{
    title: string
    content: string
    summary: string
  }> {
    // Store selected comments for use in translation
    this.selectedComments = selectedComments || []
    
    const [title, content, summary] = await this.translateBatch(
      [article.title, article.content, article.summary],
      from,
      to
    )

    // Clear selected comments after translation
    this.selectedComments = []

    return { title, content, summary }
  }

  configureFromSettings(config: TranslationConfig): void {
    let provider: TranslationProvider

    switch (config.provider) {
      case 'google':
        provider = new GoogleTranslateProvider(config.apiKey)
        break
      case 'deepl':
        provider = new DeepLProvider(config.apiKey)
        break
      case 'openai':
        provider = new OpenAIProvider(
          config.apiKey,
          config.model,
          config.baseUrl,
          config.authType,
          config.customAuthHeader
        )
        break
      case 'gemini':
        provider = new GeminiProvider(config.apiKey, config.model, config.baseUrl, config.authType, config.customAuthHeader)
        break
      case 'volcano':
        provider = new VolcanoProvider(
          config.apiKey,
          config.model,
          config.region,
          config.baseUrl,
          config.authType,
          config.customAuthHeader
        )
        break
      case 'claude':
        provider = new ClaudeProvider(
          config.apiKey,
          config.model,
          config.baseUrl,
          config.authType,
          config.customAuthHeader
        )
        break
      case 'libretranslate':
        provider = new LibreTranslateProvider(config.apiKey, config.apiUrl)
        break
      case 'mymemory':
        provider = new MyMemoryProvider(config.apiKey, config.email)
        break
      case 'google-free':
        provider = new GoogleFreeProvider()
        break
      default:
        throw new Error(`Unsupported translation provider: ${config.provider}`)
    }

    this.registerProvider(config.provider, provider)
    this.setActiveProvider(config.provider)
  }
}

// Create a singleton instance
export const translationService = new TranslationService()

// Helper function to initialize translation service from localStorage
export function initializeTranslationService(): void {
  try {
    const settingsStr = localStorage.getItem('blog_settings')
    let settings = null
    
    if (settingsStr) {
      settings = JSON.parse(settingsStr)
    }
    
    // If no translation settings exist, use default free provider
    if (!settings || !settings.translation || !settings.translation.provider) {
      const defaultConfig: TranslationConfig = {
        provider: 'google-free'
      }
      
      // Save default config to localStorage
      const newSettings = {
        ...(settings || {}),
        translation: defaultConfig
      }
      localStorage.setItem('blog_settings', JSON.stringify(newSettings))
      
      translationService.configureFromSettings(defaultConfig)
    } else {
      translationService.configureFromSettings(settings.translation)
    }
  } catch (error) {
    console.error('Failed to initialize translation service:', error)
    
    // Fallback to default free provider on error
    try {
      const defaultConfig: TranslationConfig = {
        provider: 'google-free'
      }
      translationService.configureFromSettings(defaultConfig)
    } catch (fallbackError) {
      console.error('Failed to set default translation provider:', fallbackError)
    }
  }
}
