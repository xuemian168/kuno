"use client"

import { useEffect } from 'react'
import { loader } from '@monaco-editor/react'
import * as monaco from 'monaco-editor'

// Monaco Environment initialization component
export function MonacoInit() {
  useEffect(() => {
    // Configure Monaco Environment for worker files FIRST
    if (typeof window !== 'undefined') {
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

    // Set Monaco instance directly to prevent CDN loading
    // This must be done BEFORE any Monaco components load
    loader.config({ monaco });

  }, [])

  // This component doesn't render anything
  return null
}