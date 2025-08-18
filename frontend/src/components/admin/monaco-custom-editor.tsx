"use client"

import { useRef, useEffect, forwardRef, useImperativeHandle } from 'react'
import * as monaco from 'monaco-editor'
import { useTheme } from 'next-themes'

export interface CustomMonacoEditorRef {
  getValue: () => string
  setValue: (value: string) => void
  getEditor: () => monaco.editor.IStandaloneCodeEditor | null
}

interface CustomMonacoEditorProps {
  value: string
  onChange?: (value: string) => void
  language?: string
  height?: string | number
  theme?: string
  options?: monaco.editor.IStandaloneEditorConstructionOptions
}

export const CustomMonacoEditor = forwardRef<
  CustomMonacoEditorRef,
  CustomMonacoEditorProps
>(({
  value,
  onChange,
  language = 'markdown',
  height = '400px',
  theme,
  options = {}
}, ref) => {
  const containerRef = useRef<HTMLDivElement>(null)
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null)
  const { resolvedTheme } = useTheme()
  
  const monacoTheme = theme || (resolvedTheme === 'dark' ? 'vs-dark' : 'vs')

  useEffect(() => {
    if (!containerRef.current) return

    // Ensure Monaco environment is configured
    if (typeof window !== 'undefined' && !(window as any).MonacoEnvironment) {
      (window as any).MonacoEnvironment = {
        getWorkerUrl: function (_moduleId: string, label: string) {
          switch (label) {
            case 'json':
              return '/_next/static/vs/json.worker.js';
            case 'css':
            case 'scss':
            case 'less':
              return '/_next/static/vs/css.worker.js';
            case 'html':
            case 'handlebars':
            case 'razor':
              return '/_next/static/vs/html.worker.js';
            case 'typescript':
            case 'javascript':
              return '/_next/static/vs/ts.worker.js';
            default:
              return '/_next/static/vs/editor.worker.js';
          }
        }
      };
    }

    // Create editor instance
    const editor = monaco.editor.create(containerRef.current, {
      value,
      language,
      theme: monacoTheme,
      automaticLayout: true,
      wordWrap: 'on',
      minimap: { enabled: false },
      scrollBeyondLastLine: false,
      fontSize: 14,
      lineHeight: 20,
      ...options
    })

    editorRef.current = editor

    // Listen for changes
    const disposable = editor.onDidChangeModelContent(() => {
      const newValue = editor.getValue()
      onChange?.(newValue)
    })

    return () => {
      disposable.dispose()
      editor.dispose()
    }
  }, [])

  // Update value when prop changes
  useEffect(() => {
    if (editorRef.current && editorRef.current.getValue() !== value) {
      editorRef.current.setValue(value)
    }
  }, [value])

  // Update theme when it changes
  useEffect(() => {
    if (editorRef.current) {
      monaco.editor.setTheme(monacoTheme)
    }
  }, [monacoTheme])

  useImperativeHandle(ref, () => ({
    getValue: () => editorRef.current?.getValue() || '',
    setValue: (newValue: string) => editorRef.current?.setValue(newValue),
    getEditor: () => editorRef.current
  }), [])

  return (
    <div 
      ref={containerRef} 
      style={{ height: typeof height === 'number' ? `${height}px` : height }}
      className="border border-border rounded-md overflow-hidden"
    />
  )
})

CustomMonacoEditor.displayName = "CustomMonacoEditor"