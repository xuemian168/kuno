'use client'

import { useState, useRef } from 'react'
import { Copy, Check, Code } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface CodeBlockProps {
  children: React.ReactNode
  className?: string
  language?: string
  showLineNumbers?: boolean
}

export function CodeBlock({ 
  children, 
  className = '', 
  language, 
  showLineNumbers = false 
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false)
  const codeRef = useRef<HTMLElement>(null)

  // Extract language from className (format: language-javascript)
  const detectedLanguage = language || className.replace(/language-/, '') || 'text'
  
  // Get the code content
  const getCodeContent = (): string => {
    if (codeRef.current) {
      return codeRef.current.textContent || ''
    }
    return String(children)
  }

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

  // Split code into lines for line numbers
  const codeLines = getCodeContent().split('\n')

  return (
    <div className="group relative my-6 overflow-hidden rounded-lg border border-border bg-muted">
      {/* Code block header */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Code className="h-3 w-3" />
          <span className="font-mono uppercase text-xs">
            {detectedLanguage}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
        >
          {copied ? (
            <Check className="h-3 w-3 text-green-500" />
          ) : (
            <Copy className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Code content */}
      <div className="relative">
        <pre className="bg-muted p-0 m-0 overflow-x-auto">
          <div className="flex">
            {/* Line numbers */}
            {showLineNumbers && (
              <div className="flex flex-col text-xs text-muted-foreground/50 select-none border-r border-border pr-3 pl-4 py-4 font-mono bg-muted/30">
                {codeLines.map((_, index) => (
                  <span key={index} className="leading-6">
                    {index + 1}
                  </span>
                ))}
              </div>
            )}
            
            {/* Code */}
            <code 
              ref={codeRef}
              className={cn(
                "block p-4 text-sm font-mono leading-6 bg-transparent min-w-0 flex-1",
                className
              )}
            >
              {children}
            </code>
          </div>
        </pre>
      </div>
    </div>
  )
}