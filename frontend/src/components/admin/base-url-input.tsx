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
  claude: 'https://api.anthropic.com/v1',
}

// 常见服务的预设 URL
const PRESET_URLS: Record<string, Array<{ label: string; labelZh: string; url: string; description?: string; descriptionZh?: string }>> = {
  openai: [
    {
      label: 'OpenAI Official',
      labelZh: 'OpenAI 官方',
      url: 'https://api.openai.com/v1',
      description: 'Official OpenAI API',
      descriptionZh: 'OpenAI 官方 API'
    },
    {
      label: 'TikHub AI',
      labelZh: 'TikHub AI',
      url: 'https://ai.tikhub.io/v1beta/models',
      description: 'TikHub AI API service',
      descriptionZh: 'TikHub AI API 服务'
    },
    {
      label: 'OpenRouter',
      labelZh: 'OpenRouter',
      url: 'https://openrouter.ai/api/v1',
      description: 'Access multiple AI models (GPT, Claude, etc.)',
      descriptionZh: '访问多个 AI 模型 (GPT、Claude 等)'
    },
    {
      label: 'OpenAI-SB',
      labelZh: 'OpenAI-SB',
      url: 'https://api.openai-sb.com/v1',
      description: 'OpenAI API proxy',
      descriptionZh: 'OpenAI API 代理'
    },
    {
      label: 'LocalAI',
      labelZh: 'LocalAI (本地)',
      url: 'http://localhost:8080/v1',
      description: 'Local AI models',
      descriptionZh: '本地 AI 模型'
    },
  ],
  gemini: [
    {
      label: 'Google AI Official',
      labelZh: 'Google AI 官方',
      url: 'https://generativelanguage.googleapis.com/v1beta',
      description: 'Official Google AI Studio API',
      descriptionZh: 'Google AI Studio 官方 API'
    },
  ],
  volcano: [
    {
      label: 'Volcano Engine Official',
      labelZh: '火山引擎官方',
      url: 'https://ark.cn-beijing.volces.com/api/v3',
      description: 'Official Volcano Engine API',
      descriptionZh: '火山引擎官方 API'
    },
  ],
  claude: [
    {
      label: 'Claude Official',
      labelZh: 'Claude 官方',
      url: 'https://api.anthropic.com/v1',
      description: 'Official Anthropic Claude API',
      descriptionZh: 'Anthropic Claude 官方 API'
    },
  ],
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
  const presets = PRESET_URLS[provider] || []
  const isZh = locale === 'zh'

  const handleReset = () => {
    onChange('')
  }

  const handlePresetSelect = (url: string) => {
    onChange(url === defaultUrl ? '' : url)
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
                {isZh ? '默认:' : 'Default:'}{' '}
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
                title={isZh ? '恢复默认' : 'Reset to default'}
              >
                <RotateCcw className="h-3 w-3" />
              </Button>
            )}
          </div>

          {/* 快速选择预设 */}
          {presets.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-foreground">
                {isZh ? '快速选择:' : 'Quick Select:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {presets.map((preset, index) => {
                  const isActive = value === preset.url || (!value && preset.url === defaultUrl)
                  return (
                    <Button
                      key={index}
                      type="button"
                      variant={isActive ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => handlePresetSelect(preset.url)}
                      className="h-auto flex-col items-start px-3 py-2 text-left"
                      title={isZh ? preset.descriptionZh : preset.description}
                    >
                      <span className="text-xs font-medium">
                        {isZh ? preset.labelZh : preset.label}
                      </span>
                      {(preset.description || preset.descriptionZh) && (
                        <span className="text-[10px] opacity-70 mt-0.5">
                          {isZh ? preset.descriptionZh : preset.description}
                        </span>
                      )}
                    </Button>
                  )
                })}
              </div>
            </div>
          )}

          <div className="space-y-2 rounded-md bg-background/50 p-3">
            <p className="text-xs font-medium text-foreground">
              {isZh ? '自定义 Base URL 可用于:' : 'Custom Base URL can be used for:'}
            </p>
            <ul className="space-y-1 pl-4 text-xs text-muted-foreground">
              {useCases.map((useCase, index) => (
                <li key={index} className="list-disc">
                  {useCase}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted-foreground">
              {isZh
                ? '提示: 留空将使用官方默认 endpoint'
                : 'Tip: Leave empty to use the official default endpoint'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
