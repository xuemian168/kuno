"use client"

import React, { Component, ReactNode } from 'react'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error?: Error
  errorInfo?: React.ErrorInfo
  retryCount: number
}

export class MermaidErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, retryCount: 0 }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    // Update state so the next render will show the fallback UI
    return { 
      hasError: true, 
      error 
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log the error for debugging
    console.error('Mermaid Error Boundary caught an error:', error, errorInfo)
    
    // Check for known React 18 DOM manipulation conflicts
    const isReactDOMConflict = 
      error.name === 'NotFoundError' ||
      error.message.includes('removeChild') ||
      error.message.includes('insertBefore') ||
      error.message.includes('replaceChild') ||
      error.message.includes('appendChild')
    
    const currentRetryCount = this.state.retryCount || 0
    
    // Only auto-retry DOM conflicts and limit retries to prevent infinite loops
    if (isReactDOMConflict && currentRetryCount < 2) {
      console.warn(`Caught React 18 DOM conflict (retry ${currentRetryCount + 1}/2) - auto-retrying...`)
      
      // Auto-retry after a brief delay for DOM conflicts
      setTimeout(() => {
        this.setState(prevState => ({
          hasError: false,
          error: undefined,
          errorInfo: undefined,
          retryCount: prevState.retryCount + 1
        }))
      }, 200 + currentRetryCount * 100) // Increasing delay
    } else {
      if (isReactDOMConflict && currentRetryCount >= 2) {
        console.warn('Max auto-retries reached for DOM conflict - showing error UI')
      }
      
      this.setState({
        error,
        errorInfo
      })
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined, retryCount: 0 })
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback
      }

      // Check if it's a React DOM conflict
      const isReactDOMConflict = this.state.error && (
        this.state.error.name === 'NotFoundError' ||
        this.state.error.message.includes('removeChild') ||
        this.state.error.message.includes('insertBefore') ||
        this.state.error.message.includes('replaceChild') ||
        this.state.error.message.includes('appendChild')
      )

      // Default error UI
      return (
        <div className={`p-4 border rounded-lg ${
          isReactDOMConflict 
            ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800' 
            : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800'
        }`}>
          <div className={`${
            isReactDOMConflict 
              ? 'text-blue-800 dark:text-blue-200' 
              : 'text-yellow-800 dark:text-yellow-200'
          }`}>
            <h3 className="font-medium mb-2">
              {isReactDOMConflict ? '图表正在重新加载' : '图表组件遇到问题'}
            </h3>
            <p className="text-sm opacity-75 mb-3">
              {isReactDOMConflict 
                ? '由于 React 18 并发渲染导致的临时冲突，组件正在自动重试...'
                : '这可能是由于 React 18 的并发渲染特性导致的 DOM 操作冲突。'
              }
            </p>
            <button 
              onClick={this.handleRetry}
              className={`px-3 py-1 rounded text-sm transition-colors ${
                isReactDOMConflict
                  ? 'bg-blue-200 dark:bg-blue-700 text-blue-800 dark:text-blue-200 hover:bg-blue-300 dark:hover:bg-blue-600'
                  : 'bg-yellow-200 dark:bg-yellow-700 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-300 dark:hover:bg-yellow-600'
              }`}
            >
              {isReactDOMConflict ? '强制重试' : '重试渲染'}
            </button>
            <details className="mt-3 text-xs opacity-75">
              <summary className="cursor-pointer hover:underline">错误详情</summary>
              <pre className={`mt-2 p-2 rounded overflow-auto ${
                isReactDOMConflict 
                  ? 'bg-blue-100 dark:bg-blue-900/40'
                  : 'bg-yellow-100 dark:bg-yellow-900/40'
              }`}>
                {this.state.error?.toString()}
              </pre>
            </details>
          </div>
        </div>
      )
    }

    return this.props.children
  }
}