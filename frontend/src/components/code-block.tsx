'use client'

import { useState, useRef, useEffect } from 'react'
import { Copy, Check, Palette } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter'
import { oneDark, oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism'
import { useTheme } from 'next-themes'
import { getLanguageIcon } from './language-icons'

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
  language?: string
  showLineNumbers?: boolean
  title?: string
  maxHeight?: number
}

export function CodeBlock({ 
  children, 
  className = '', 
  language, 
  showLineNumbers = true,
  title,
  maxHeight = 600
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const { theme, resolvedTheme } = useTheme()
  const codeRef = useRef<HTMLElement>(null)

  // Extract language from className (format: language-javascript)
  const detectedLanguage = language || className.replace(/language-/, '') || 'text'
  
  // Get the code content
  const getCodeContent = (): string => {
    return String(children)
  }

  // Get syntax highlighter theme based on current theme
  const getSyntaxTheme = () => {
    const isDark = resolvedTheme === 'dark'
    return isDark ? oneDark : oneLight
  }

  // Get language icon
  const LanguageIcon = getLanguageIcon(detectedLanguage)

  // Check if code block is tall and should be collapsible
  const codeLines = String(children).split('\n')
  const shouldBeCollapsible = codeLines.length > 20
  const displayHeight = shouldBeCollapsible && !isExpanded ? Math.min(maxHeight, 400) : undefined

  const copyToClipboard = async () => {
    try {
      const code = getCodeContent()
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy code:', err)
    }
  }

  return (
    <div className="group relative my-6 code-block-enhanced">
      {/* Code block header */}
      <div className="code-block-header">
        <div className="flex items-center gap-3">
          <div className="language-tag">
            <LanguageIcon className="h-3 w-3" />
            <span className="font-mono uppercase text-xs">
              {detectedLanguage}
            </span>
          </div>
          {title && (
            <span className="text-sm text-muted-foreground font-medium">
              {title}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {shouldBeCollapsible && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-7 px-2 text-xs opacity-70 hover:opacity-100 transition-opacity"
            >
              {isExpanded ? 'Collapse' : 'Expand'}
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            className={cn(
              "h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-all copy-button-enhanced",
              copied && "opacity-100"
            )}
          >
            {copied ? (
              <Check className="h-3 w-3 text-green-500" />
            ) : (
              <Copy className="h-3 w-3" />
            )}
          </Button>
        </div>
      </div>

      {/* Code content */}
      <div className="relative code-content">
        <div 
          className={cn(
            "overflow-hidden transition-all duration-300 ease-in-out",
            shouldBeCollapsible && !isExpanded && "relative"
          )}
          style={{
            maxHeight: displayHeight ? `${displayHeight}px` : undefined
          }}
        >
          <SyntaxHighlighter
            language={detectedLanguage === 'text' ? 'plaintext' : detectedLanguage}
            style={getSyntaxTheme()}
            showLineNumbers={showLineNumbers}
            customStyle={{
              margin: 0,
              padding: showLineNumbers ? '1.5rem 1.5rem 1.5rem 0' : '1.5rem',
              background: 'transparent',
              fontSize: '0.875rem',
              lineHeight: '1.5'
            }}
            codeTagProps={{
              className: 'code-scrollbar',
              style: {
                fontFamily: 'var(--font-mono), Consolas, "Courier New", monospace'
              }
            }}
            lineNumberStyle={{
              minWidth: '3rem',
              paddingRight: '1.5rem',
              paddingLeft: '1.5rem',
              color: 'hsl(var(--muted-foreground))',
              opacity: 0.6,
              userSelect: 'none',
              textAlign: 'right' as const,
              borderRight: '1px solid hsl(var(--border) / 0.3)',
              marginRight: '1.5rem',
              backgroundColor: 'hsl(var(--muted) / 0.3)'
            }}
            wrapLines={true}
            lineProps={(lineNumber) => ({
              className: 'code-line',
              style: {
                display: 'block',
                width: '100%'
              }
            })}
          >
            {String(children).replace(/\n$/, '')}
          </SyntaxHighlighter>
          
          {/* Fade overlay for collapsed long code */}
          {shouldBeCollapsible && !isExpanded && (
            <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-card to-transparent pointer-events-none" />
          )}
        </div>
      </div>
    </div>
  )
}