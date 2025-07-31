"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle } from "react"
import { Editor } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowLeftRight, Eye, EyeOff, Edit3 } from "lucide-react"
import { MarkdownRenderer } from "@/components/markdown/markdown-renderer"

export interface DualLanguageEditorRef {
  getLeftValue: () => string
  getRightValue: () => string
  setLeftValue: (value: string) => void
  setRightValue: (value: string) => void
}

interface DualLanguageEditorProps {
  leftValue: string
  rightValue: string
  leftLanguage: string
  rightLanguage: string
  leftLanguageName: string
  rightLanguageName: string
  onLeftChange?: (value: string) => void
  onRightChange?: (value: string) => void
  language?: string
  height?: string | number
  theme?: string
  className?: string
  options?: editor.IStandaloneEditorConstructionOptions
}

type PanelMode = 'edit' | 'preview'

export const DualLanguageEditor = forwardRef<
  DualLanguageEditorRef,
  DualLanguageEditorProps
>((props, ref) => {
  const {
    leftValue,
    rightValue,
    leftLanguage,
    rightLanguage,
    leftLanguageName,
    rightLanguageName,
    onLeftChange,
    onRightChange,
    language = "markdown",
    height = "400px",
    theme = "vs",
    className,
    options = {}
  } = props

  const leftEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const rightEditorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const [leftMode, setLeftMode] = useState<PanelMode>('edit')
  const [rightMode, setRightMode] = useState<PanelMode>('edit')

  const swapModes = () => {
    setLeftMode(rightMode)
    setRightMode(leftMode)
  }

  const toggleLeftMode = () => {
    setLeftMode(leftMode === 'edit' ? 'preview' : 'edit')
  }

  const toggleRightMode = () => {
    setRightMode(rightMode === 'edit' ? 'preview' : 'edit')
  }

  useImperativeHandle(ref, () => ({
    getLeftValue: () => {
      return leftEditorRef.current?.getValue() || leftValue
    },
    getRightValue: () => {
      return rightEditorRef.current?.getValue() || rightValue
    },
    setLeftValue: (value: string) => {
      if (leftEditorRef.current) {
        leftEditorRef.current.setValue(value)
      }
    },
    setRightValue: (value: string) => {
      if (rightEditorRef.current) {
        rightEditorRef.current.setValue(value)
      }
    }
  }), [leftValue, rightValue])

  const handleLeftEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    leftEditorRef.current = editor
    
    editor.updateOptions({
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 20,
      automaticLayout: true,
      ...options
    })

    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue()
      onLeftChange?.(newValue)
    })
  }

  const handleRightEditorMount = (editor: editor.IStandaloneCodeEditor) => {
    rightEditorRef.current = editor
    
    editor.updateOptions({
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 20,
      automaticLayout: true,
      ...options
    })

    editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue()
      onRightChange?.(newValue)
    })
  }

  return (
    <div className={cn("h-full flex flex-col", className)}>
      {/* Control Bar */}
      <div className="flex items-center justify-between p-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium">{leftLanguageName}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleLeftMode}
            className="h-6 w-6 p-0"
            title={leftMode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}
          >
            {leftMode === 'edit' ? <Eye className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleRightMode}
            className="h-6 w-6 p-0"
            title={rightMode === 'edit' ? 'Switch to Preview' : 'Switch to Edit'}
          >
            {rightMode === 'edit' ? <Eye className="h-3 w-3" /> : <Edit3 className="h-3 w-3" />}
          </Button>
          <span className="text-sm font-medium">{rightLanguageName}</span>
        </div>
      </div>

      {/* Editor Panels */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel */}
        <div className="flex-1 border-r overflow-hidden">
          {leftMode === 'edit' ? (
            <Editor
              height={height}
              language={language}
              value={leftValue}
              onMount={handleLeftEditorMount}
              theme={theme}
              options={{
                wordWrap: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineHeight: 20,
                automaticLayout: true,
                ...options
              }}
            />
          ) : (
            <div className="p-4 h-full overflow-y-auto overflow-x-hidden bg-background">
              <div className="max-w-full prose prose-sm dark:prose-invert break-words overflow-wrap-anywhere">
                {leftValue ? (
                  <MarkdownRenderer content={leftValue} />
                ) : (
                  <p className="text-muted-foreground text-center mt-8">No content to preview</p>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel */}
        <div className="flex-1 overflow-hidden">
          {rightMode === 'edit' ? (
            <Editor
              height={height}
              language={language}
              value={rightValue}
              onMount={handleRightEditorMount}
              theme={theme}
              options={{
                wordWrap: 'on',
                minimap: { enabled: false },
                scrollBeyondLastLine: false,
                fontSize: 14,
                lineHeight: 20,
                automaticLayout: true,
                ...options
              }}
            />
          ) : (
            <div className="p-4 h-full overflow-y-auto overflow-x-hidden bg-background">
              <div className="max-w-full prose prose-sm dark:prose-invert break-words overflow-wrap-anywhere">
                {rightValue ? (
                  <MarkdownRenderer content={rightValue} />
                ) : (
                  <p className="text-muted-foreground text-center mt-8">No content to preview</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

DualLanguageEditor.displayName = "DualLanguageEditor"