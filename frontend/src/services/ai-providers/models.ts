export type AIModelProvider = 'openai' | 'gemini' | 'volcano' | 'claude'

export interface AIModelOption {
  value: string
  label: string
  group?: string
}

export const DEFAULT_AI_MODELS: Record<AIModelProvider, string> = {
  openai: 'gpt-5.4-mini',
  gemini: 'gemini-2.5-flash',
  volcano: 'doubao-seed-2-0-lite-260215',
  claude: 'claude-sonnet-4-6',
}

export const AI_MODEL_OPTIONS: Record<AIModelProvider, AIModelOption[]> = {
  openai: [
    { value: 'gpt-5.5', label: 'GPT-5.5 (Latest)', group: 'GPT-5.5' },
    { value: 'gpt-5.4', label: 'GPT-5.4', group: 'GPT-5.4' },
    { value: 'gpt-5.4-mini', label: 'GPT-5.4 Mini (Recommended)', group: 'GPT-5.4' },
    { value: 'gpt-5.4-nano', label: 'GPT-5.4 Nano (Fast)', group: 'GPT-5.4' },
    { value: 'gpt-5', label: 'GPT-5 (Previous)', group: 'GPT-5 Legacy' },
    { value: 'gpt-5-mini', label: 'GPT-5 Mini (Previous)', group: 'GPT-5 Legacy' },
    { value: 'gpt-5-nano', label: 'GPT-5 Nano (Previous)', group: 'GPT-5 Legacy' },
    { value: 'gpt-4.1', label: 'GPT-4.1', group: 'GPT-4' },
    { value: 'gpt-4.1-mini', label: 'GPT-4.1 Mini', group: 'GPT-4' },
    { value: 'gpt-4.1-nano', label: 'GPT-4.1 Nano (Fast)', group: 'GPT-4' },
    { value: 'gpt-4o', label: 'GPT-4o', group: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini', group: 'GPT-4o' },
    { value: 'o3', label: 'o3 (Reasoning)', group: 'Reasoning' },
    { value: 'o4-mini', label: 'o4-mini (Reasoning)', group: 'Reasoning' },
  ],
  gemini: [
    { value: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Latest)', group: 'Gemini 2.5' },
    { value: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Recommended)', group: 'Gemini 2.5' },
    { value: 'gemini-2.5-flash-lite', label: 'Gemini 2.5 Flash-Lite (Fast)', group: 'Gemini 2.5' },
    { value: 'gemini-1.5-pro', label: 'Gemini 1.5 Pro (Legacy)', group: 'Gemini 1.5' },
    { value: 'gemini-1.5-flash', label: 'Gemini 1.5 Flash (Legacy)', group: 'Gemini 1.5' },
  ],
  volcano: [
    { value: 'doubao-seed-2-0-pro-260215', label: 'Doubao Seed 2.0 Pro (Latest)', group: 'Doubao Seed 2.0' },
    { value: 'doubao-seed-2-0-lite-260215', label: 'Doubao Seed 2.0 Lite (Recommended)', group: 'Doubao Seed 2.0' },
    { value: 'doubao-seed-2-0-mini-260215', label: 'Doubao Seed 2.0 Mini (Fast)', group: 'Doubao Seed 2.0' },
    { value: 'doubao-seed-1-8-251228', label: 'Doubao Seed 1.8', group: 'Doubao Seed 1.x' },
    { value: 'doubao-seed-1-6-251015', label: 'Doubao Seed 1.6', group: 'Doubao Seed 1.x' },
    { value: 'doubao-seed-1-6-flash-250828', label: 'Doubao Seed 1.6 Flash', group: 'Doubao Seed 1.x' },
    { value: 'doubao-seed-1-6-250615', label: 'Doubao Seed 1.6 (Legacy)', group: 'Legacy' },
    { value: 'doubao-seed-1-6-flash-250615', label: 'Doubao Seed 1.6 Flash (Legacy)', group: 'Legacy' },
    { value: 'doubao-1-5-lite-32k-250115', label: 'Doubao 1.5 Lite 32K (Legacy)', group: 'Legacy' },
  ],
  claude: [
    { value: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Latest)', group: 'Claude 4' },
    { value: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Recommended)', group: 'Claude 4' },
    { value: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Fast)', group: 'Claude 4' },
    { value: 'claude-3-7-sonnet-20250219', label: 'Claude 3.7 Sonnet (Legacy)', group: 'Legacy' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet (Legacy)', group: 'Legacy' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku (Legacy)', group: 'Legacy' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus (Legacy)', group: 'Legacy' },
    { value: 'claude-3-sonnet-20240229', label: 'Claude 3 Sonnet (Legacy)', group: 'Legacy' },
    { value: 'claude-3-haiku-20240307', label: 'Claude 3 Haiku (Legacy)', group: 'Legacy' },
  ],
}

export function getAIModelOptions(provider: string): AIModelOption[] {
  return AI_MODEL_OPTIONS[provider as AIModelProvider] || []
}

export function isBuiltInAIModel(provider: string, model?: string): boolean {
  if (!model) {
    return false
  }

  return getAIModelOptions(provider).some((option) => option.value === model)
}
