import React, { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ChevronDown, ChevronUp, RotateCcw } from 'lucide-react'

interface BaseUrlInputProps {
  provider: string
  value: string | undefined
  onChange: (value: string) => void
  locale: string
}

const DEFAULT_URLS: Record<string, string> = {
  openai: 'https://api.openai.com/v1',
  gemini: 'https://generativelanguage.googleapis.com/v1beta',
  volcano: 'https://ark.cn-beijing.volces.com/api/v3',
}

const USE_CASES = {
  zh: [
    'OpenAI 兼容 API(如 OpenRouter、OpenAI-SB 等)',
    '本地部署的模型服务(如 LocalAI、Ollama 等)',
    'API 代理服务或中转服务',
  ],
  en: [
    'OpenAI-compatible APIs (e.g., OpenRouter, LocalAI)',
    'Locally deployed model services (e.g., LocalAI, Ollama)',
    'API proxy or relay services',
  ],
}

export function BaseUrlInput({ provider, value, onChange, locale }: BaseUrlInputProps) {
  const [showAdvanced, setShowAdvanced] = useState(false)
  const defaultUrl = DEFAULT_URLS[provider]
  const useCases = USE_CASES[locale as 'zh' | 'en'] || USE_CASES.en

  const handleReset = () => {
    onChange('')
  }

  if (!defaultUrl) {
    return null
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">
          {locale === 'zh' ? 'API Base URL (高级设置)' : 'API Base URL (Advanced)'}
        </Label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="h-7 text-xs"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="mr-1 h-3 w-3" />
              {locale === 'zh' ? '隐藏' : 'Hide'}
            </>
          ) : (
            <>
              <ChevronDown className="mr-1 h-3 w-3" />
              {locale === 'zh' ? '显示' : 'Show'}
            </>
          )}
        </Button>
      </div>

      {showAdvanced && (
        <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-4">
          <div className="flex items-end gap-2">
            <div className="flex-1 space-y-2">
              <Input
                type="text"
                value={value || ''}
                onChange={(e) => onChange(e.target.value)}
                placeholder={defaultUrl}
                className="font-mono text-xs"
              />
              <p className="text-xs text-muted-foreground">
                {locale === 'zh' ? '默认:' : 'Default:'}{' '}
                <code className="rounded bg-muted px-1 py-0.5 text-xs">{defaultUrl}</code>
              </p>
            </div>
            {value && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="h-9 px-3"
                title={locale === 'zh' ? '恢复默认' : 'Reset to default'}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>

          <div className="space-y-2 rounded-md bg-background/50 p-3">
            <p className="text-xs font-medium text-foreground">
              {locale === 'zh' ? '📌 自定义 Base URL 可用于:' : '📌 Custom Base URL can be used for:'}
            </p>
            <ul className="space-y-1 pl-4 text-xs text-muted-foreground">
              {useCases.map((useCase, index) => (
                <li key={index} className="list-disc">
                  {useCase}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {locale === 'zh'
                ? '💡 提示:留空将使用官方默认 endpoint'
                : '💡 Tip: Leave empty to use the official default endpoint'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
