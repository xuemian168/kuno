import { 
  SEOContent, 
  SEOAnalysisResult, 
  SEOTitleAnalysis, 
  SEODescriptionAnalysis,
  SEOContentAnalysis,
  SEOKeywordAnalysis,
  ReadabilityAnalysis,
  SEOSuggestion,
  HeadingAnalysis,
  KeywordDensity,
  KeywordDistribution,
  ImageSEOAnalysis
} from './types'

export class SEOAnalyzer {
  /**
   * Analyze complete SEO content
   */
  static analyzeSEOContent(content: SEOContent, language: string, focusKeyword?: string): SEOAnalysisResult {
    const titleAnalysis = this.analyzeSEOTitle(content.meta_title || content.title, focusKeyword)
    const descriptionAnalysis = this.analyzeSEODescription(content.meta_description || content.description || '', focusKeyword)
    const contentAnalysis = this.analyzeSEOContentStructure(content.content, focusKeyword)
    const keywordAnalysis = this.analyzeSEOKeywords(content, focusKeyword)
    const readabilityAnalysis = this.analyzeReadability(content.content, language)

    const suggestions = this.generateSuggestions(
      titleAnalysis,
      descriptionAnalysis,
      contentAnalysis,
      keywordAnalysis,
      readabilityAnalysis
    )

    const overallScore = this.calculateOverallScore(
      titleAnalysis.score,
      descriptionAnalysis.score,
      contentAnalysis.score,
      keywordAnalysis.score,
      readabilityAnalysis.score
    )

    return {
      overall_score: overallScore,
      title_analysis: titleAnalysis,
      description_analysis: descriptionAnalysis,
      content_analysis: contentAnalysis,
      keyword_analysis: keywordAnalysis,
      readability_analysis: readabilityAnalysis,
      suggestions
    }
  }

  /**
   * Analyze SEO title
   */
  static analyzeSEOTitle(title: string, focusKeyword?: string): SEOTitleAnalysis {
    const length = title.length
    const optimalLength = { min: 30, max: 60 }
    const issues: string[] = []
    const suggestions: string[] = []

    // Length check
    let lengthScore = 100
    if (length < optimalLength.min) {
      lengthScore = (length / optimalLength.min) * 100
      issues.push('标题过短，可能影响SEO效果')
      suggestions.push('增加更多描述性词汇来扩展标题')
    } else if (length > optimalLength.max) {
      lengthScore = Math.max(60, 100 - ((length - optimalLength.max) * 2))
      issues.push('标题过长，在搜索结果中可能被截断')
      suggestions.push('精简标题内容，保持在60字符以内')
    }

    // Focus keyword check
    const hasFocusKeyword = focusKeyword ? 
      title.toLowerCase().includes(focusKeyword.toLowerCase()) : false
    
    if (focusKeyword && !hasFocusKeyword) {
      issues.push('标题中未包含焦点关键词')
      suggestions.push(`在标题中自然地包含关键词 "${focusKeyword}"`)
    }

    // Brand check (simplified)
    const brandIncluded = title.includes(' - ') || title.includes(' | ')

    // Uniqueness (simplified check for special characters and numbers)
    const uniqueness = this.calculateUniqueness(title)

    const score = this.calculateTitleScore(lengthScore, hasFocusKeyword, uniqueness)

    return {
      score,
      length,
      optimal_length: optimalLength,
      has_focus_keyword: hasFocusKeyword,
      brand_included: brandIncluded,
      uniqueness,
      issues,
      suggestions
    }
  }

  /**
   * Analyze SEO description
   */
  static analyzeSEODescription(description: string, focusKeyword?: string): SEODescriptionAnalysis {
    const length = description.length
    const optimalLength = { min: 120, max: 160 }
    const issues: string[] = []
    const suggestions: string[] = []

    // Length check
    let lengthScore = 100
    if (length === 0) {
      lengthScore = 0
      issues.push('缺少元描述')
      suggestions.push('添加有吸引力的元描述来提高点击率')
    } else if (length < optimalLength.min) {
      lengthScore = (length / optimalLength.min) * 100
      issues.push('描述过短，未充分利用搜索结果显示空间')
      suggestions.push('扩展描述内容，更详细地描述页面内容')
    } else if (length > optimalLength.max) {
      lengthScore = Math.max(50, 100 - ((length - optimalLength.max) * 1.5))
      issues.push('描述过长，在搜索结果中可能被截断')
      suggestions.push('精简描述内容，保持在160字符以内')
    }

    // Focus keyword check
    const hasFocusKeyword = focusKeyword ? 
      description.toLowerCase().includes(focusKeyword.toLowerCase()) : false

    if (focusKeyword && !hasFocusKeyword) {
      issues.push('描述中未包含焦点关键词')
      suggestions.push(`在描述中自然地包含关键词 "${focusKeyword}"`)
    }

    // Call to action check
    const ctaWords = ['了解', '查看', '阅读', '点击', '发现', '探索', 'learn', 'discover', 'read', 'click', 'explore', 'find out']
    const hasCallToAction = ctaWords.some(word => 
      description.toLowerCase().includes(word.toLowerCase())
    )

    if (!hasCallToAction) {
      suggestions.push('添加行动号召词汇来提高点击率')
    }

    // Uniqueness
    const uniqueness = this.calculateUniqueness(description)

    const score = this.calculateDescriptionScore(lengthScore, hasFocusKeyword, hasCallToAction, uniqueness)

    return {
      score,
      length,
      optimal_length: optimalLength,
      has_focus_keyword: hasFocusKeyword,
      has_call_to_action: hasCallToAction,
      uniqueness,
      issues,
      suggestions
    }
  }

  /**
   * Analyze content structure
   */
  static analyzeSEOContentStructure(content: string, focusKeyword?: string): SEOContentAnalysis {
    const cleanContent = this.extractTextFromMarkdown(content)
    const wordCount = this.calculateWordCount(cleanContent)
    const paragraphCount = content.split('\n\n').filter(p => p.trim().length > 0).length

    const headingAnalysis = this.analyzeHeadingStructure(content, focusKeyword)
    const keywordDensity = focusKeyword ? this.calculateKeywordDensity(cleanContent, [focusKeyword]) : []
    const linkAnalysis = this.analyzeLinkStructure(content)
    const imageAnalysis = this.analyzeImageOptimization(content)

    const issues: string[] = []
    const suggestions: string[] = []

    // Word count check
    if (wordCount < 300) {
      issues.push('内容过短，可能被搜索引擎认为价值较低')
      suggestions.push('增加更多有价值的内容，建议至少300字')
    }

    // Paragraph structure
    if (paragraphCount < 3) {
      suggestions.push('适当分段可以提高可读性')
    }

    const score = this.calculateContentScore(wordCount, headingAnalysis.structure_score, linkAnalysis.score, imageAnalysis.score)

    return {
      score,
      word_count: wordCount,
      paragraph_count: paragraphCount,
      heading_structure: headingAnalysis,
      keyword_density: keywordDensity,
      internal_links: linkAnalysis.internal,
      external_links: linkAnalysis.external,
      image_optimization: imageAnalysis,
      issues,
      suggestions
    }
  }

  /**
   * Analyze keywords
   */
  static analyzeSEOKeywords(content: SEOContent, focusKeyword?: string): SEOKeywordAnalysis {
    if (!focusKeyword) {
      return {
        score: 50,
        focus_keyword_usage: 0,
        keyword_distribution: [],
        keyword_density: 0,
        optimal_density: { min: 0.5, max: 2.5 },
        related_keywords_found: 0,
        issues: ['未设置焦点关键词'],
        suggestions: ['设置一个主要关键词来优化内容']
      }
    }

    const allText = `${content.title} ${content.content} ${content.description || ''}`
    const cleanText = this.extractTextFromMarkdown(allText).toLowerCase()
    const keywordLower = focusKeyword.toLowerCase()
    
    // Count keyword usage
    const regex = new RegExp(`\\b${keywordLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi')
    const matches = cleanText.match(regex) || []
    const usage = matches.length

    // Calculate density
    const wordCount = this.calculateWordCount(cleanText)
    const density = wordCount > 0 ? (usage / wordCount) * 100 : 0

    // Analyze distribution
    const distribution = this.analyzeKeywordDistribution(content, focusKeyword)

    const issues: string[] = []
    const suggestions: string[] = []

    // Density check
    if (density < 0.5) {
      issues.push('关键词密度过低')
      suggestions.push('在内容中适当增加关键词使用')
    } else if (density > 2.5) {
      issues.push('关键词密度过高，可能被认为是关键词堆砌')
      suggestions.push('减少关键词使用，保持自然的写作风格')
    }

    // Usage check
    if (usage === 0) {
      issues.push('内容中未使用焦点关键词')
      suggestions.push('在内容中自然地使用焦点关键词')
    }

    const score = this.calculateKeywordScore(density, usage, distribution)

    return {
      score,
      focus_keyword_usage: usage,
      keyword_distribution: [distribution],
      keyword_density: Math.round(density * 100) / 100,
      optimal_density: { min: 0.5, max: 2.5 },
      related_keywords_found: 0, // This would require more sophisticated analysis
      issues,
      suggestions
    }
  }

  /**
   * Analyze readability
   */
  static analyzeReadability(content: string, language: string): ReadabilityAnalysis {
    const cleanContent = this.extractTextFromMarkdown(content)
    const sentences = cleanContent.split(/[.!?]+/).filter(s => s.trim().length > 0)
    const words = cleanContent.split(/\s+/).filter(w => w.length > 0)
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0)

    const avgSentenceLength = sentences.length > 0 ? words.length / sentences.length : 0
    const avgParagraphLength = paragraphs.length > 0 ? words.length / paragraphs.length : 0

    const issues: string[] = []
    const suggestions: string[] = []

    // Sentence length check
    if (avgSentenceLength > 20) {
      issues.push('句子过长，可能影响可读性')
      suggestions.push('使用较短的句子来提高可读性')
    }

    // Paragraph length check
    if (avgParagraphLength > 150) {
      issues.push('段落过长')
      suggestions.push('将长段落分解为较短的段落')
    }

    const score = this.calculateReadabilityScore(avgSentenceLength, avgParagraphLength)

    return {
      score,
      reading_level: this.getReadingLevel(avgSentenceLength),
      avg_sentence_length: Math.round(avgSentenceLength * 10) / 10,
      avg_paragraph_length: Math.round(avgParagraphLength * 10) / 10,
      passive_voice_percentage: 0, // Simplified
      transition_words_percentage: 0, // Simplified
      issues,
      suggestions
    }
  }

  // Helper methods
  private static extractTextFromMarkdown(markdown: string): string {
    return markdown
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*(.*?)\*\*/g, '$1')
      .replace(/\*(.*?)\*/g, '$1')
      .replace(/`(.*?)`/g, '$1')
      .replace(/```[\s\S]*?```/g, '')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
      .replace(/>\s*(.*)/g, '$1')
      .replace(/\n+/g, ' ')
      .trim()
  }

  private static calculateWordCount(text: string): number {
    return text.trim().split(/\s+/).filter(word => word.length > 0).length
  }

  private static calculateUniqueness(text: string): number {
    const specialChars = (text.match(/[^a-zA-Z0-9\s\u4e00-\u9fff]/g) || []).length
    const numbers = (text.match(/\d/g) || []).length
    const uniqueWords = new Set(text.toLowerCase().split(/\s+/)).size
    const totalWords = text.split(/\s+/).length

    return Math.min(1, (specialChars * 0.1 + numbers * 0.05 + uniqueWords / totalWords) / 1.5)
  }

  private static analyzeHeadingStructure(content: string, focusKeyword?: string): HeadingAnalysis {
    const h1Count = (content.match(/^#\s/gm) || []).length
    const h2Count = (content.match(/^##\s/gm) || []).length
    const h3Count = (content.match(/^###\s/gm) || []).length

    const issues: string[] = []
    
    if (h1Count === 0) {
      issues.push('缺少H1标题')
    } else if (h1Count > 1) {
      issues.push('H1标题过多，建议只使用一个')
    }

    if (h2Count === 0) {
      issues.push('建议添加H2标题来改善内容结构')
    }

    const hasKeywordInHeadings = focusKeyword ? 
      content.toLowerCase().includes(`# ${focusKeyword.toLowerCase()}`) ||
      content.toLowerCase().includes(`## ${focusKeyword.toLowerCase()}`) ||
      content.toLowerCase().includes(`### ${focusKeyword.toLowerCase()}`) : false

    const structureScore = this.calculateHeadingScore(h1Count, h2Count, h3Count)

    return {
      h1_count: h1Count,
      h2_count: h2Count,
      h3_count: h3Count,
      structure_score: structureScore,
      has_keyword_in_headings: hasKeywordInHeadings,
      issues
    }
  }

  private static calculateKeywordDensity(text: string, keywords: string[]): KeywordDensity[] {
    const cleanText = text.toLowerCase()
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
        density: Math.round(density * 100) / 100,
        optimal: density >= 0.5 && density <= 2.5
      }
    })
  }

  private static analyzeKeywordDistribution(content: SEOContent, keyword: string): KeywordDistribution {
    const keywordLower = keyword.toLowerCase()
    
    return {
      keyword,
      title: content.title.toLowerCase().includes(keywordLower),
      description: (content.description || '').toLowerCase().includes(keywordLower),
      h1: content.content.toLowerCase().includes(`# ${keywordLower}`),
      h2: content.content.toLowerCase().includes(`## ${keywordLower}`),
      content: content.content.toLowerCase().includes(keywordLower),
      first_paragraph: content.content.split('\n\n')[0]?.toLowerCase().includes(keywordLower) || false,
      last_paragraph: content.content.split('\n\n').slice(-1)[0]?.toLowerCase().includes(keywordLower) || false
    }
  }

  private static analyzeLinkStructure(content: string): { internal: number, external: number, score: number } {
    const internalLinks = (content.match(/\[([^\]]+)\]\((?!http)[^)]+\)/g) || []).length
    const externalLinks = (content.match(/\[([^\]]+)\]\(https?:\/\/[^)]+\)/g) || []).length
    
    const score = Math.min(100, (internalLinks * 10 + externalLinks * 5))
    
    return {
      internal: internalLinks,
      external: externalLinks,
      score
    }
  }

  private static analyzeImageOptimization(content: string): ImageSEOAnalysis {
    const images = content.match(/!\[([^\]]*)\]\([^)]+\)/g) || []
    const totalImages = images.length
    const imagesWithAlt = images.filter(img => {
      const altMatch = img.match(/!\[([^\]]*)\]/)
      return altMatch && altMatch[1].trim().length > 0
    }).length

    const score = totalImages > 0 ? (imagesWithAlt / totalImages) * 100 : 0
    const issues: string[] = []

    if (totalImages > 0 && imagesWithAlt < totalImages) {
      issues.push('部分图片缺少Alt文本')
    }

    return {
      total_images: totalImages,
      images_with_alt: imagesWithAlt,
      images_with_title: 0, // Simplified
      optimized_images: imagesWithAlt,
      score: Math.round(score),
      issues
    }
  }

  private static generateSuggestions(
    titleAnalysis: SEOTitleAnalysis,
    descriptionAnalysis: SEODescriptionAnalysis,
    contentAnalysis: SEOContentAnalysis,
    keywordAnalysis: SEOKeywordAnalysis,
    readabilityAnalysis: ReadabilityAnalysis
  ): SEOSuggestion[] {
    const suggestions: SEOSuggestion[] = []

    // High priority suggestions
    if (titleAnalysis.score < 70) {
      suggestions.push({
        type: 'title',
        priority: 'high',
        message: 'SEO标题需要优化',
        suggestion: titleAnalysis.suggestions.join('; '),
        impact: '提高搜索引擎排名和点击率'
      })
    }

    if (descriptionAnalysis.score < 70) {
      suggestions.push({
        type: 'description',
        priority: 'high',
        message: '元描述需要优化',
        suggestion: descriptionAnalysis.suggestions.join('; '),
        impact: '提高搜索结果点击率'
      })
    }

    if (keywordAnalysis.score < 70) {
      suggestions.push({
        type: 'keywords',
        priority: 'high',
        message: '关键词优化需要改进',
        suggestion: keywordAnalysis.suggestions.join('; '),
        impact: '提高相关关键词的搜索排名'
      })
    }

    // Medium priority suggestions
    if (contentAnalysis.score < 80) {
      suggestions.push({
        type: 'content',
        priority: 'medium',
        message: '内容结构可以优化',
        suggestion: contentAnalysis.suggestions.join('; '),
        impact: '提高用户体验和搜索引擎理解'
      })
    }

    if (readabilityAnalysis.score < 80) {
      suggestions.push({
        type: 'readability',
        priority: 'medium',
        message: '可读性可以提升',
        suggestion: readabilityAnalysis.suggestions.join('; '),
        impact: '提高用户体验和页面停留时间'
      })
    }

    return suggestions
  }

  // Scoring methods
  private static calculateOverallScore(...scores: number[]): number {
    const weights = [0.25, 0.25, 0.25, 0.15, 0.1] // title, description, content, keywords, readability
    const weightedSum = scores.reduce((sum, score, index) => sum + score * weights[index], 0)
    return Math.round(weightedSum)
  }

  private static calculateTitleScore(lengthScore: number, hasFocusKeyword: boolean, uniqueness: number): number {
    let score = lengthScore * 0.4
    score += hasFocusKeyword ? 30 : 0
    score += uniqueness * 30
    return Math.round(Math.min(100, score))
  }

  private static calculateDescriptionScore(lengthScore: number, hasFocusKeyword: boolean, hasCallToAction: boolean, uniqueness: number): number {
    let score = lengthScore * 0.4
    score += hasFocusKeyword ? 25 : 0
    score += hasCallToAction ? 15 : 0
    score += uniqueness * 20
    return Math.round(Math.min(100, score))
  }

  private static calculateContentScore(wordCount: number, headingScore: number, linkScore: number, imageScore: number): number {
    let score = 0
    
    // Word count score (max 40 points)
    if (wordCount >= 1000) score += 40
    else if (wordCount >= 500) score += 30
    else if (wordCount >= 300) score += 20
    else score += (wordCount / 300) * 20

    // Heading score (max 30 points)
    score += (headingScore / 100) * 30

    // Link score (max 20 points)
    score += Math.min(20, linkScore / 5)

    // Image score (max 10 points)
    score += (imageScore / 100) * 10

    return Math.round(Math.min(100, score))
  }

  private static calculateKeywordScore(density: number, usage: number, distribution: KeywordDistribution): number {
    let score = 0

    // Density score (max 40 points)
    if (density >= 0.5 && density <= 2.5) {
      score += 40
    } else if (density > 0) {
      const penalty = density > 2.5 ? (density - 2.5) * 10 : (0.5 - density) * 20
      score += Math.max(10, 40 - penalty)
    }

    // Usage score (max 30 points)
    if (usage >= 5) score += 30
    else if (usage >= 3) score += 25
    else if (usage >= 1) score += 15
    else score += 0

    // Distribution score (max 30 points)
    let distributionScore = 0
    if (distribution.title) distributionScore += 8
    if (distribution.description) distributionScore += 6
    if (distribution.h1 || distribution.h2) distributionScore += 8
    if (distribution.first_paragraph) distributionScore += 4
    if (distribution.content) distributionScore += 4

    score += distributionScore

    return Math.round(Math.min(100, score))
  }

  private static calculateHeadingScore(h1Count: number, h2Count: number, h3Count: number): number {
    let score = 0

    // H1 score
    if (h1Count === 1) score += 40
    else if (h1Count === 0) score += 0
    else score += 20 // Multiple H1s

    // H2 score
    if (h2Count >= 2) score += 40
    else if (h2Count === 1) score += 25
    else score += 0

    // H3 score
    if (h3Count > 0) score += 20

    return Math.round(Math.min(100, score))
  }

  private static calculateReadabilityScore(avgSentenceLength: number, avgParagraphLength: number): number {
    let score = 100

    // Sentence length penalty
    if (avgSentenceLength > 20) {
      score -= (avgSentenceLength - 20) * 2
    }

    // Paragraph length penalty
    if (avgParagraphLength > 100) {
      score -= (avgParagraphLength - 100) * 0.5
    }

    return Math.round(Math.max(0, score))
  }

  private static getReadingLevel(avgSentenceLength: number): string {
    if (avgSentenceLength <= 12) return '小学 6-8 年级'
    else if (avgSentenceLength <= 16) return '初中水平'
    else if (avgSentenceLength <= 20) return '高中水平'
    else return '大学水平'
  }
}