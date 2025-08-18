import { loader } from "@monaco-editor/react";

// Configure Monaco Editor to use locally bundled assets instead of CDN
export function configureMonaco() {
  // Force Monaco to use local worker files instead of CDN
  // The monaco-editor-webpack-plugin creates worker files in /_next/static/
  
  // Set worker override to prevent CDN loading
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
}

// Alternative configuration for CDN mirror (if needed)
export function configureMonacoWithMirror() {
  // Example configuration for using a mirror CDN:
  loader.config({
    paths: {
      vs: 'https://cdn.staticfile.net/monaco-editor/0.52.2/min/vs'
    }
  });
}