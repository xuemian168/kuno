import { estimateTranslationTokens } from './model-profiles'

export interface ProtectedContentItem {
  id: string
  placeholder: string
  original: string
}

export interface ProtectedContentResult {
  text: string
  items: ProtectedContentItem[]
}

export interface TranslationChunk {
  id: string
  text: string
  inputTokens: number
  sectionPath: string[]
}

export interface TranslationQualityIssue {
  code: 'MISSING_PLACEHOLDER' | 'LEFTOVER_PLACEHOLDER' | 'MARKDOWN_FENCE_MISMATCH'
  message: string
  chunkId?: string
}

interface ProtectedRange {
  start: number
  end: number
  value: string
}

const PLACEHOLDER_PREFIX = '__KUNO_PROTECT_'
const PLACEHOLDER_PATTERN = /__KUNO_PROTECT_\d{4}__/gi

export function protectTranslatableContent(text: string): ProtectedContentResult {
  if (!text) {
    return { text, items: [] }
  }

  const ranges = collectProtectedRanges(text)
  if (ranges.length === 0) {
    return { text, items: [] }
  }

  const items: ProtectedContentItem[] = []
  let result = ''
  let cursor = 0

  ranges.forEach((range, index) => {
    const id = String(index).padStart(4, '0')
    const placeholder = `${PLACEHOLDER_PREFIX}${id}__`

    result += text.slice(cursor, range.start)
    result += placeholder
    cursor = range.end

    items.push({
      id,
      placeholder,
      original: range.value
    })
  })

  result += text.slice(cursor)

  return { text: result, items }
}

export function restoreProtectedContent(text: string, items: ProtectedContentItem[]): string {
  return items.reduce((result, item) => {
    const pattern = new RegExp(escapeRegExp(item.placeholder), 'gi')
    return result.replace(pattern, item.original)
  }, text)
}

export function getPlaceholders(text: string): string[] {
  return Array.from(new Set(text.match(PLACEHOLDER_PATTERN) || []))
}

export function validateTranslatedContent(
  sourceText: string,
  translatedText: string,
  chunkId?: string
): TranslationQualityIssue[] {
  const issues: TranslationQualityIssue[] = []
  const sourcePlaceholders = getPlaceholders(sourceText).map((placeholder) => placeholder.toUpperCase())
  const translatedUpper = translatedText.toUpperCase()

  sourcePlaceholders.forEach((placeholder) => {
    if (!translatedUpper.includes(placeholder)) {
      issues.push({
        code: 'MISSING_PLACEHOLDER',
        message: `Protected placeholder ${placeholder} was not preserved`,
        chunkId
      })
    }
  })

  const sourceFenceCount = countMarkdownFences(sourceText)
  const translatedFenceCount = countMarkdownFences(translatedText)
  if (sourceFenceCount !== translatedFenceCount) {
    issues.push({
      code: 'MARKDOWN_FENCE_MISMATCH',
      message: `Markdown code fence count changed from ${sourceFenceCount} to ${translatedFenceCount}`,
      chunkId
    })
  }

  return issues
}

export function validateRestoredContent(text: string): TranslationQualityIssue[] {
  PLACEHOLDER_PATTERN.lastIndex = 0
  if (!PLACEHOLDER_PATTERN.test(text)) {
    PLACEHOLDER_PATTERN.lastIndex = 0
    return []
  }

  PLACEHOLDER_PATTERN.lastIndex = 0
  return [{
    code: 'LEFTOVER_PLACEHOLDER',
    message: 'One or more protected placeholders remained after restoration'
  }]
}

export function splitMarkdownIntoSemanticChunks(
  text: string,
  maxTokens: number,
  estimateTokens: (value: string) => number = estimateTranslationTokens
): TranslationChunk[] {
  const inputTokens = estimateTokens(text)
  if (!text || inputTokens <= maxTokens) {
    return [{
      id: 'chunk-1',
      text,
      inputTokens,
      sectionPath: getSectionPath(text)
    }]
  }

  const blocks = splitMarkdownBlocks(text)
  const chunks: TranslationChunk[] = []
  let current = ''
  let currentSectionPath: string[] = []

  const flush = () => {
    if (!current.trim()) {
      current = ''
      return
    }

    const chunkText = trimChunkBoundary(current)
    chunks.push({
      id: `chunk-${chunks.length + 1}`,
      text: chunkText,
      inputTokens: estimateTokens(chunkText),
      sectionPath: currentSectionPath
    })
    current = ''
  }

  blocks.forEach((block) => {
    if (block.headingPath.length > 0) {
      currentSectionPath = block.headingPath
    }

    const candidate = current ? `${current}\n\n${block.text}` : block.text
    if (estimateTokens(candidate) <= maxTokens) {
      current = candidate
      return
    }

    flush()

    if (estimateTokens(block.text) <= maxTokens) {
      current = block.text
      return
    }

    splitOversizedBlock(block.text, maxTokens, estimateTokens).forEach((part) => {
      chunks.push({
        id: `chunk-${chunks.length + 1}`,
        text: part,
        inputTokens: estimateTokens(part),
        sectionPath: block.headingPath
      })
    })
  })

  flush()

  return chunks
}

function collectProtectedRanges(text: string): ProtectedRange[] {
  const ranges: ProtectedRange[] = []

  const addMatches = (pattern: RegExp) => {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(text)) !== null) {
      ranges.push({
        start: match.index,
        end: match.index + match[0].length,
        value: match[0]
      })

      if (match[0].length === 0) {
        pattern.lastIndex++
      }
    }
  }

  addMatches(/^---\n[\s\S]*?\n---(?=\n|$)/g)
  addMatches(/```[\s\S]*?```/g)
  addMatches(/~~~[\s\S]*?~~~/g)
  addMatches(/\$\$[\s\S]*?\$\$/g)
  addMatches(/`[^`\n]+`/g)
  addMatches(/<\/?[a-zA-Z][^>\n]*>/g)
  addMatches(/https?:\/\/[^\s<>"')\]]+/g)
  addMatches(/\((?:https?:\/\/[^)\s]+|#[^)]+|\/[^)\s]+|\.\/[^)\s]+|\.\.\/[^)\s]+|[^)\s]+\.(?:png|jpe?g|gif|webp|avif|svg|mp4|webm|pdf|zip|md|html?))\)/gi)
  addMatches(/!\[[^\]\n]*\]\[[^\]\n]+\]/g)
  addMatches(/\[[^\]\n]+\]:\s*\S+/g)
  addMatches(/\{\{[\s\S]*?\}\}/g)
  addMatches(/\{[%#][\s\S]*?[%#]\}/g)
  addMatches(/\$\{[^}]+\}/g)
  addMatches(/\{[A-Za-z0-9_.:-]+\}/g)

  return mergeProtectedRanges(ranges)
}

function mergeProtectedRanges(ranges: ProtectedRange[]): ProtectedRange[] {
  return ranges
    .sort((a, b) => a.start - b.start || b.end - a.end)
    .reduce<ProtectedRange[]>((merged, range) => {
      const previous = merged[merged.length - 1]

      if (previous && range.start < previous.end) {
        return merged
      }

      merged.push(range)
      return merged
    }, [])
}

function splitMarkdownBlocks(text: string): Array<{ text: string, headingPath: string[] }> {
  const lines = text.split('\n')
  const blocks: Array<{ text: string, headingPath: string[] }> = []
  const headingStack: string[] = []
  let current: string[] = []
  let inFence = false
  let currentPath: string[] = []

  const flush = () => {
    if (current.length === 0) {
      return
    }

    blocks.push({
      text: current.join('\n'),
      headingPath: [...currentPath]
    })
    current = []
  }

  lines.forEach((line) => {
    const trimmed = line.trim()
    const fenceStart = /^(```|~~~)/.test(trimmed)

    if (!inFence && /^#{1,6}\s+/.test(trimmed)) {
      flush()

      const level = trimmed.match(/^#+/)?.[0].length || 1
      const title = trimmed.replace(/^#{1,6}\s+/, '').trim()
      headingStack.splice(level - 1)
      headingStack[level - 1] = title
      currentPath = headingStack.filter(Boolean)
      current.push(line)
      return
    }

    current.push(line)

    if (fenceStart) {
      inFence = !inFence
    }

    if (!inFence && trimmed === '') {
      flush()
    }
  })

  flush()
  return blocks
}

function splitOversizedBlock(
  text: string,
  maxTokens: number,
  estimateTokens: (value: string) => number
): string[] {
  const lines = text.split('\n')
  const parts: string[] = []
  let current = ''

  const pushPart = () => {
    const part = trimChunkBoundary(current)
    if (part) {
      parts.push(part)
    }
    current = ''
  }

  lines.forEach((line) => {
    const candidate = current ? `${current}\n${line}` : line
    if (estimateTokens(candidate) <= maxTokens) {
      current = candidate
      return
    }

    pushPart()

    if (estimateTokens(line) <= maxTokens) {
      current = line
      return
    }

    splitLongLine(line, maxTokens, estimateTokens).forEach((part) => parts.push(part))
  })

  pushPart()
  return parts
}

function splitLongLine(
  line: string,
  maxTokens: number,
  estimateTokens: (value: string) => number
): string[] {
  const sentences = line.split(/(?<=[.!?。！？])\s+/)
  const parts: string[] = []
  let current = ''

  sentences.forEach((sentence) => {
    const candidate = current ? `${current} ${sentence}` : sentence
    if (estimateTokens(candidate) <= maxTokens) {
      current = candidate
      return
    }

    if (current) {
      parts.push(current)
      current = ''
    }

    if (estimateTokens(sentence) <= maxTokens) {
      current = sentence
      return
    }

    const approxChars = Math.max(500, Math.floor(maxTokens * 3))
    for (let i = 0; i < sentence.length; i += approxChars) {
      parts.push(sentence.slice(i, i + approxChars))
    }
  })

  if (current) {
    parts.push(current)
  }

  return parts
}

function getSectionPath(text: string): string[] {
  const heading = text.match(/^#{1,6}\s+(.+)$/m)
  return heading ? [heading[1].trim()] : []
}

function trimChunkBoundary(text: string): string {
  return text.replace(/^\n+|\n+$/g, '')
}

function countMarkdownFences(text: string): number {
  return (text.match(/^(```|~~~)/gm) || []).length
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
