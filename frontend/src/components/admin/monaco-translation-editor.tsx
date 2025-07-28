"use client"

import { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from "react"
import { DiffEditor } from "@monaco-editor/react"
import type { editor } from "monaco-editor"
import { cn } from "@/lib/utils"

export interface MonacoTranslationEditorRef {
  getOriginalValue: () => string
  getModifiedValue: () => string
  setOriginalValue: (value: string) => void
  setModifiedValue: (value: string) => void
  insertTextAtCursor: (text: string) => void
}

interface MonacoTranslationEditorProps {
  originalValue: string
  modifiedValue: string
  onOriginalChange?: (value: string) => void
  onModifiedChange?: (value: string) => void
  language?: string
  height?: string | number
  theme?: string
  readOnly?: boolean
  className?: string
  options?: editor.IStandaloneDiffEditorConstructionOptions
}

export const MonacoTranslationEditor = forwardRef<
  MonacoTranslationEditorRef,
  MonacoTranslationEditorProps
>(({
  originalValue,
  modifiedValue,
  onOriginalChange,
  onModifiedChange,
  language = "markdown",
  height = "400px",
  theme = "vs",
  readOnly = false,
  className,
  options = {}
}, ref) => {
  const diffEditorRef = useRef<editor.IStandaloneDiffEditor | null>(null)
  const [isReady, setIsReady] = useState(false)
  const [decorations, setDecorations] = useState<{ original: string[], modified: string[] }>({ original: [], modified: [] })
  const initialOriginalValue = useRef(originalValue)
  const initialModifiedValue = useRef(modifiedValue)
  const lastExternalOriginalValue = useRef(originalValue)
  const lastExternalModifiedValue = useRef(modifiedValue)

  // Function to filter out non-translatable content
  const filterNonTranslatableContent = (text: string): { filtered: string; placeholders: Map<string, string> } => {
    const lines = text.split('\n')
    const placeholders = new Map<string, string>()
    let placeholderIndex = 0
    
    const filteredLines = lines.map((line, index) => {
      const trimmedLine = line.trim()
      
      // Check if line should not be translated
      if (
        // Special symbols at start
        /^[⚠️❗️💡🔥✅❌⭐️📝💻🎯🚀🔔📋📊⚡️🎉🛠️🔗📁📖📌]+/.test(trimmedLine) ||
        // Markdown links
        /^\s*-\s*\[.*\]\(.*\)\s*$/.test(line) ||
        // URLs
        /^https?:\/\//.test(trimmedLine) ||
        // Common domains
        /\b(docs\.docker\.com|github\.com|stackoverflow\.com|npmjs\.com|reactjs\.org)\b/.test(line) ||
        // Image markdown
        /^!\[.*\]\(.*\)$/.test(trimmedLine) ||
        // Video/embed tags
        /<video\s+.*?>/.test(line) || line === '</video>' ||
        line === '  Your browser does not support the video tag.' ||
        /<YouTubeEmbed\s+.*?\/>/.test(line) ||
        /<BiliBiliEmbed\s+.*?\/>/.test(line)
      ) {
        const placeholder = `[NOTR-${placeholderIndex}-KEEP]`
        placeholderIndex++
        placeholders.set(placeholder, line)
        return placeholder
      }
      
      return line
    })
    
    return {
      filtered: filteredLines.join('\n'),
      placeholders
    }
  }

  // Function to restore non-translatable content
  const restoreNonTranslatableContent = (translatedText: string, placeholders: Map<string, string>): string => {
    let result = translatedText
    placeholders.forEach((originalLine, placeholder) => {
      const regex = new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
      result = result.replace(regex, originalLine)
    })
    return result
  }

  // Function to update line decorations for identical lines
  const updateIdenticalLineDecorations = useCallback(() => {
    if (!diffEditorRef.current) return

    const originalEditor = diffEditorRef.current.getOriginalEditor()
    const modifiedEditor = diffEditorRef.current.getModifiedEditor()
    
    const originalText = originalEditor.getValue()
    const modifiedText = modifiedEditor.getValue()
    
    const originalLines = originalText.split('\n')
    const modifiedLines = modifiedText.split('\n')
    
    const maxLines = Math.max(originalLines.length, modifiedLines.length)
    
    const originalDecorations: editor.IModelDeltaDecoration[] = []
    const modifiedDecorations: editor.IModelDeltaDecoration[] = []
    
    for (let i = 0; i < maxLines; i++) {
      const originalLine = originalLines[i] || ''
      const modifiedLine = modifiedLines[i] || ''
      
      // Only highlight if both lines exist and are identical (not empty)
      if (originalLine && modifiedLine && originalLine.trim() === modifiedLine.trim()) {
        const lineNumber = i + 1
        
        originalDecorations.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: originalLine.length + 1
          },
          options: {
            isWholeLine: true,
            className: 'untranslated-line'
          }
        })
        
        modifiedDecorations.push({
          range: {
            startLineNumber: lineNumber,
            startColumn: 1,
            endLineNumber: lineNumber,
            endColumn: modifiedLine.length + 1
          },
          options: {
            isWholeLine: true,
            className: 'untranslated-line'
          }
        })
      }
    }
    
    // Only update decorations if they actually changed
    try {
      const newOriginalDecorations = originalEditor.deltaDecorations(decorations.original, originalDecorations)
      const newModifiedDecorations = modifiedEditor.deltaDecorations(decorations.modified, modifiedDecorations)
      
      setDecorations({
        original: newOriginalDecorations,
        modified: newModifiedDecorations
      })
    } catch (error) {
      // Ignore decoration errors to prevent editing interruption
      console.warn('Failed to update decorations:', error)
    }
  }, [decorations])

  // Only update editor values when they change from external source (not from user input)
  useEffect(() => {
    if (isReady && diffEditorRef.current && originalValue !== lastExternalOriginalValue.current) {
      const originalEditor = diffEditorRef.current.getOriginalEditor()
      const currentValue = originalEditor.getValue()
      
      // Only update if the value is significantly different (to avoid cursor issues)
      if (currentValue !== originalValue) {
        originalEditor.setValue(originalValue)
        lastExternalOriginalValue.current = originalValue
        setTimeout(updateIdenticalLineDecorations, 100)
      }
    }
  }, [originalValue, isReady, updateIdenticalLineDecorations])

  useEffect(() => {
    if (isReady && diffEditorRef.current && modifiedValue !== lastExternalModifiedValue.current) {
      const modifiedEditor = diffEditorRef.current.getModifiedEditor()
      const currentValue = modifiedEditor.getValue()
      
      // Only update if the value is significantly different (to avoid cursor issues)
      if (currentValue !== modifiedValue) {
        modifiedEditor.setValue(modifiedValue)
        lastExternalModifiedValue.current = modifiedValue
        setTimeout(updateIdenticalLineDecorations, 100)
      }
    }
  }, [modifiedValue, isReady, updateIdenticalLineDecorations])

  // Expose methods through ref
  useImperativeHandle(ref, () => ({
    getOriginalValue: () => {
      return diffEditorRef.current?.getOriginalEditor().getValue() || ""
    },
    getModifiedValue: () => {
      return diffEditorRef.current?.getModifiedEditor().getValue() || ""
    },
    setOriginalValue: (value: string) => {
      if (diffEditorRef.current) {
        const originalEditor = diffEditorRef.current.getOriginalEditor()
        originalEditor.setValue(value)
        lastExternalOriginalValue.current = value
      }
    },
    setModifiedValue: (value: string) => {
      if (diffEditorRef.current) {
        const modifiedEditor = diffEditorRef.current.getModifiedEditor()
        modifiedEditor.setValue(value)
        lastExternalModifiedValue.current = value
      }
    },
    insertTextAtCursor: (text: string) => {
      if (diffEditorRef.current) {
        const modifiedEditor = diffEditorRef.current.getModifiedEditor()
        const selection = modifiedEditor.getSelection()
        if (selection) {
          modifiedEditor.executeEdits("insert-text", [{
            range: selection,
            text: text
          }])
          modifiedEditor.focus()
        }
      }
    }
  }), [])

  const handleEditorDidMount = (editor: editor.IStandaloneDiffEditor, monaco: any) => {
    diffEditorRef.current = editor
    setIsReady(true)

    // Add CSS styles for identical lines (untranslated) and hide default diff styles
    const styleElement = document.createElement('style')
    styleElement.textContent = `
      /* Custom styles for identical lines */
      .untranslated-line {
        background-color: rgba(255, 193, 7, 0.12) !important;
      }
      .monaco-editor .untranslated-line {
        background-color: rgba(255, 193, 7, 0.12) !important;
      }
      .monaco-editor.vs .untranslated-line {
        background-color: rgba(255, 193, 7, 0.12) !important;
      }
      .monaco-editor.vs-dark .untranslated-line {
        background-color: rgba(255, 193, 7, 0.18) !important;
      }
      
      /* Hide Monaco's default diff styling */
      .monaco-diff-editor .line-insert {
        background-color: transparent !important;
      }
      .monaco-diff-editor .line-delete {
        background-color: transparent !important;
      }
      .monaco-diff-editor .char-insert {
        background-color: transparent !important;
      }
      .monaco-diff-editor .char-delete {
        background-color: transparent !important;
      }
      .monaco-diff-editor .inline-added-margin-view-zone {
        background-color: transparent !important;
      }
      .monaco-diff-editor .inline-deleted-margin-view-zone {
        background-color: transparent !important;
      }
      .monaco-diff-editor .diagonal-fill {
        display: none !important;
      }
      .monaco-diff-editor .line-numbers {
        color: inherit !important;
      }
      /* Hide diff decorations */
      .monaco-diff-editor .margin-view-overlays .line-insert,
      .monaco-diff-editor .margin-view-overlays .line-delete {
        display: none !important;
      }
    `
    if (!document.querySelector('style[data-monaco-untranslated]')) {
      styleElement.setAttribute('data-monaco-untranslated', 'true')
      document.head.appendChild(styleElement)
    }

    // Get the modified editor (right side - editable)
    const modifiedEditor = editor.getModifiedEditor()
    const originalEditor = editor.getOriginalEditor()

    // Configure editors - both sides editable
    originalEditor.updateOptions({ 
      readOnly: readOnly,
      glyphMargin: false,
      folding: false,
      lineNumbers: 'on',
      minimap: { enabled: false }
    })
    
    modifiedEditor.updateOptions({ 
      readOnly: readOnly,
      glyphMargin: false,
      folding: false,
      lineNumbers: 'on',
      minimap: { enabled: false }
    })

    // Listen for changes in both editors
    let decorationTimeout: NodeJS.Timeout | null = null
    
    const scheduleDecorationUpdate = () => {
      if (decorationTimeout) {
        clearTimeout(decorationTimeout)
      }
      decorationTimeout = setTimeout(updateIdenticalLineDecorations, 500)
    }

    originalEditor.onDidChangeModelContent(() => {
      const newValue = originalEditor.getValue()
      onOriginalChange?.(newValue)
      scheduleDecorationUpdate()
    })

    modifiedEditor.onDidChangeModelContent(() => {
      const newValue = modifiedEditor.getValue()
      onModifiedChange?.(newValue)
      scheduleDecorationUpdate()
    })

    // Add keyboard shortcuts
    modifiedEditor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      // Prevent default save, let parent handle it
    })
  }

  const editorOptions: editor.IStandaloneDiffEditorConstructionOptions = {
    renderSideBySide: true,
    originalEditable: true,
    readOnly: readOnly,
    automaticLayout: true,
    scrollBeyondLastLine: false,
    fontSize: 14,
    lineHeight: 20,
    minimap: { enabled: false },
    renderIndicators: false, // 禁用默认的差异指示器
    renderMarginRevertIcon: false, // 禁用恢复图标
    renderOverviewRuler: false, // 禁用概览标尺
    ignoreTrimWhitespace: true, // 忽略空白差异
    wordWrap: 'on',
    glyphMargin: false,
    folding: false,
    lineNumbers: 'on',
    diffCodeLens: false, // 禁用代码透镜
    enableSplitViewResizing: false, // 禁用分割视图调整
    scrollbar: {
      vertical: 'visible',
      horizontal: 'visible',
      useShadows: false,
      verticalHasArrows: false,
      horizontalHasArrows: false,
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10
    },
    ...options
  }

  return (
    <div className={cn("border border-border rounded-md overflow-hidden", className)}>
      <DiffEditor
        height={height}
        language={language}
        original={initialOriginalValue.current}
        modified={initialModifiedValue.current}
        onMount={handleEditorDidMount}
        options={editorOptions}
        theme={theme}
        loading={
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading editor...</div>
          </div>
        }
      />
    </div>
  )
})

MonacoTranslationEditor.displayName = "MonacoTranslationEditor"