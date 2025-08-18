"use client"

import dynamic from 'next/dynamic'
import { Skeleton } from '@/components/ui/skeleton'

// Lazy load Monaco editors to avoid loading for regular visitors
const MonacoTranslationEditor = dynamic(
  () => import('./monaco-translation-editor').then(mod => ({ default: mod.MonacoTranslationEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="border border-border rounded-md overflow-hidden">
        <Skeleton className="w-full h-[400px]" />
      </div>
    )
  }
)

const DualLanguageEditor = dynamic(
  () => import('./dual-language-editor').then(mod => ({ default: mod.DualLanguageEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="h-[400px] flex flex-col">
        <Skeleton className="h-12 w-full mb-2" />
        <Skeleton className="flex-1 w-full" />
      </div>
    )
  }
)

// Custom Monaco editor that uses local Monaco directly
const CustomMonacoEditor = dynamic(
  () => import('./monaco-custom-editor').then(mod => ({ default: mod.CustomMonacoEditor })),
  {
    ssr: false,
    loading: () => (
      <div className="border border-border rounded-md overflow-hidden">
        <Skeleton className="w-full h-[400px]" />
      </div>
    )
  }
)

// Re-export lazy-loaded components
export { MonacoTranslationEditor as LazyMonacoTranslationEditor }
export { DualLanguageEditor as LazyDualLanguageEditor }
export { CustomMonacoEditor as LazyCustomMonacoEditor }