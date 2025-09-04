"use client"

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import rehypeRaw from 'rehype-raw'
import rehypeSlug from 'rehype-slug'
import YouTubeEmbed from '@/components/youtube-embed'
import BiliBiliEmbed from '@/components/bilibili-embed'
import { CodeBlock } from '@/components/code-block'
import { MermaidChart } from '@/components/mermaid-chart'
import { MermaidErrorBoundary } from '@/components/mermaid-error-boundary'
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table'

interface MarkdownRendererProps {
  content: string
  className?: string
  includeStructuredData?: boolean
}

export function MarkdownRenderer({ content, className = "", includeStructuredData = false }: MarkdownRendererProps) {

  const extractVideoId = (url: string): string | null => {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/v\/([^&\n?#]+)/,
      /youtube\.com\/embed\/([^&\n?#]+)/
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        return match[1]
      }
    }
    return null
  }

  const extractBiliBiliVideoInfo = (url: string): { id: string; type: 'bv' | 'av' } | null => {
    const patterns = [
      /(?:bilibili\.com\/video\/)?(BV[a-zA-Z0-9]+)/,
      /(?:bilibili\.com\/video\/)?av(\d+)/,
      /b23\.tv\/(BV[a-zA-Z0-9]+)/,
      /b23\.tv\/av(\d+)/,
    ]

    for (const pattern of patterns) {
      const match = url.match(pattern)
      if (match && match[1]) {
        if (match[1].startsWith('BV')) {
          return { id: match[1], type: 'bv' }
        } else {
          return { id: match[1], type: 'av' }
        }
      }
    }
    return null
  }

  // Process YouTube and Bilibili embeds
  let processedContent = content.replace(
    /<YouTubeEmbed\s+url="([^"]+)"\s+title="([^"]*)"[^>]*\/>/g,
    (match, url, title) => {
      const videoId = extractVideoId(url)
      if (videoId) {
        return `<div class="youtube-embed" data-video-id="${videoId}" data-title="${title}"></div>`
      }
      return match
    }
  )

  processedContent = processedContent.replace(
    /<BiliBiliEmbed\s+url="([^"]+)"\s+title="([^"]*)"[^>]*\/>/g,
    (match, url, title) => {
      const videoInfo = extractBiliBiliVideoInfo(url)
      if (videoInfo) {
        return `<div class="bilibili-embed" data-video-id="${videoInfo.id}" data-video-type="${videoInfo.type}" data-title="${title}"></div>`
      }
      return match
    }
  )

  return (
    <div className={`prose prose-neutral dark:prose-invert max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={{
          // Custom component for code blocks
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '')
            const language = match ? match[1] : undefined
            
            // Check if this is a block-level code by looking at className
            const isBlockCode = className && className.includes('language-')
            
            if (!isBlockCode) {
              // Inline code
              return (
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                  {children}
                </code>
              )
            }
            
            // Special handling for Mermaid diagrams
            if (language === 'mermaid') {
              const chartContent = String(children).replace(/\n$/, '')
              return (
                <div className="my-6">
                  <MermaidErrorBoundary>
                    <MermaidChart chart={chartContent} />
                  </MermaidErrorBoundary>
                </div>
              )
            }
            
            // Block code - use enhanced CodeBlock component
            return (
              <CodeBlock 
                className={className} 
                language={language}
                showLineNumbers={true}
              >
                {children}
              </CodeBlock>
            )
          },
          // Override pre to avoid double wrapping
          pre({ children }) {
            return <>{children}</>
          },
          // Custom component for headings with better spacing and IDs
          h1: ({ children, id }) => (
            <h1 id={id} className="text-3xl font-bold mt-8 mb-4 first:mt-0 scroll-mt-20">
              {children}
            </h1>
          ),
          h2: ({ children, id }) => (
            <h2 id={id} className="text-2xl font-semibold mt-6 mb-3 scroll-mt-20">
              {children}
            </h2>
          ),
          h3: ({ children, id }) => (
            <h3 id={id} className="text-xl font-semibold mt-5 mb-2 scroll-mt-20">
              {children}
            </h3>
          ),
          h4: ({ children, id }) => (
            <h4 id={id} className="text-lg font-semibold mt-4 mb-2 scroll-mt-20">
              {children}
            </h4>
          ),
          h5: ({ children, id }) => (
            <h5 id={id} className="text-base font-semibold mt-3 mb-2 scroll-mt-20">
              {children}
            </h5>
          ),
          h6: ({ children, id }) => (
            <h6 id={id} className="text-sm font-semibold mt-3 mb-2 scroll-mt-20">
              {children}
            </h6>
          ),
          // Enhanced table components
          table: ({ children }) => (
            <Table variant="striped">
              {children}
            </Table>
          ),
          thead: ({ children }) => (
            <TableHeader>
              {children}
            </TableHeader>
          ),
          tbody: ({ children }) => (
            <TableBody>
              {children}
            </TableBody>
          ),
          tr: ({ children }) => (
            <TableRow>
              {children}
            </TableRow>
          ),
          th: ({ children }) => (
            <TableHead>
              {children}
            </TableHead>
          ),
          td: ({ children }) => (
            <TableCell>
              {children}
            </TableCell>
          ),
          // Custom component for blockquotes
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary pl-4 italic text-muted-foreground">
              {children}
            </blockquote>
          ),
          // Custom component for links
          a: ({ href, children }) => (
            <a 
              href={href} 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              {children}
            </a>
          ),
          // Custom component for video embeds
          div: ({ className, ...props }) => {
            if (className === 'youtube-embed') {
              const videoId = (props as any)['data-video-id']
              const title = (props as any)['data-title'] || 'YouTube video'
              
              if (videoId) {
                return (
                  <div className="my-6">
                    <YouTubeEmbed 
                      url={`https://www.youtube.com/watch?v=${videoId}`} 
                      title={title}
                      includeStructuredData={includeStructuredData}
                    />
                  </div>
                )
              }
            }
            
            if (className === 'bilibili-embed') {
              const videoId = (props as any)['data-video-id']
              const videoType = (props as any)['data-video-type']
              const title = (props as any)['data-title'] || 'Bilibili video'
              
              if (videoId && videoType) {
                const url = videoType === 'bv' 
                  ? `https://www.bilibili.com/video/${videoId}`
                  : `https://www.bilibili.com/video/av${videoId}`
                
                return (
                  <div className="my-6">
                    <BiliBiliEmbed 
                      url={url}
                      title={title}
                      includeStructuredData={includeStructuredData}
                    />
                  </div>
                )
              }
            }
            
            return <div className={className} {...props} />
          },
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  )
}