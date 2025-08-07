export interface TocItem {
  id: string
  text: string
  level: number
}

export function generateTocFromMarkdown(content: string): TocItem[] {
  const tocItems: TocItem[] = []
  const lines = content.split('\n')
  
  for (const line of lines) {
    const trimmedLine = line.trim()
    
    // Match heading lines (# ## ### etc.)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const text = headingMatch[2].trim()
      
      // Generate a URL-friendly ID from the heading text
      const id = text
        .toLowerCase()
        .replace(/[^\w\s\u4e00-\u9fff]/g, '') // Keep alphanumeric, spaces, and Chinese characters
        .replace(/\s+/g, '-')
        .replace(/^-+|-+$/g, '') // Remove leading/trailing dashes
      
      tocItems.push({ id, text, level })
    }
  }
  
  return tocItems
}

export function addHeadingIds(content: string): string {
  return content.replace(/^(#{1,6})\s+(.+)$/gm, (match, hashes, text) => {
    const id = text
      .toLowerCase()
      .replace(/[^\w\s\u4e00-\u9fff]/g, '')
      .replace(/\s+/g, '-')
      .replace(/^-+|-+$/g, '')
    
    return `${hashes} ${text} {#${id}}`
  })
}