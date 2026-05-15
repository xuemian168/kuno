import { TranslationConfig, TranslationModelProfile } from './types'

type ProviderName = TranslationConfig['provider'] | string

const DEFAULT_PROFILE: TranslationModelProfile = {
  provider: 'generic',
  contextWindow: 8000,
  maxOutputTokens: 2000,
  supportsSystemPrompt: false,
  supportsJsonSchema: false,
  supportsBatch: false,
  supportsPromptCache: false,
  tokenizer: 'heuristic',
  safetyMarginRatio: 0.25,
  preferredChunkTokens: 1200
}

const AI_PROVIDER_DEFAULTS: Record<string, Partial<TranslationModelProfile>> = {
  openai: {
    contextWindow: 128000,
    maxOutputTokens: 16000,
    supportsSystemPrompt: true,
    supportsJsonSchema: true,
    supportsBatch: true,
    supportsPromptCache: true,
    tokenizer: 'openai',
    preferredChunkTokens: 9000
  },
  claude: {
    contextWindow: 200000,
    maxOutputTokens: 12000,
    supportsSystemPrompt: true,
    supportsJsonSchema: false,
    supportsBatch: true,
    supportsPromptCache: true,
    tokenizer: 'anthropic',
    preferredChunkTokens: 7000
  },
  gemini: {
    contextWindow: 1000000,
    maxOutputTokens: 16000,
    supportsSystemPrompt: false,
    supportsJsonSchema: true,
    supportsBatch: true,
    supportsPromptCache: true,
    tokenizer: 'google',
    preferredChunkTokens: 9000
  },
  volcano: {
    contextWindow: 128000,
    maxOutputTokens: 12000,
    supportsSystemPrompt: true,
    supportsJsonSchema: false,
    supportsBatch: true,
    supportsPromptCache: false,
    tokenizer: 'heuristic',
    preferredChunkTokens: 7000
  }
}

const MODEL_OVERRIDES: Record<string, Partial<TranslationModelProfile>> = {
  'gpt-5.5': { contextWindow: 400000, maxOutputTokens: 32000, preferredChunkTokens: 18000 },
  'gpt-5.4': { contextWindow: 400000, maxOutputTokens: 32000, preferredChunkTokens: 18000 },
  'gpt-5.4-mini': { contextWindow: 400000, maxOutputTokens: 24000, preferredChunkTokens: 14000 },
  'gpt-5.4-nano': { contextWindow: 400000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'gpt-5': { contextWindow: 400000, maxOutputTokens: 24000, preferredChunkTokens: 14000 },
  'gpt-5-mini': { contextWindow: 400000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'gpt-5-nano': { contextWindow: 400000, maxOutputTokens: 12000, preferredChunkTokens: 7000 },
  'gpt-4.1': { contextWindow: 1000000, maxOutputTokens: 32000, preferredChunkTokens: 18000 },
  'gpt-4.1-mini': { contextWindow: 1000000, maxOutputTokens: 24000, preferredChunkTokens: 14000 },
  'gpt-4.1-nano': { contextWindow: 1000000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'gpt-4o': { contextWindow: 128000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'gpt-4o-mini': { contextWindow: 128000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  o3: { contextWindow: 200000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'o4-mini': { contextWindow: 200000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },

  'claude-opus-4-7': { contextWindow: 200000, maxOutputTokens: 32000, preferredChunkTokens: 18000 },
  'claude-sonnet-4-6': { contextWindow: 200000, maxOutputTokens: 32000, preferredChunkTokens: 18000 },
  'claude-haiku-4-5': { contextWindow: 200000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'claude-haiku-4-5-20251001': { contextWindow: 200000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'claude-3-7-sonnet-20250219': { contextWindow: 200000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'claude-3-5-sonnet-20241022': { contextWindow: 200000, maxOutputTokens: 8192, preferredChunkTokens: 4500 },
  'claude-3-5-haiku-20241022': { contextWindow: 200000, maxOutputTokens: 8192, preferredChunkTokens: 4500 },
  'claude-3-opus-20240229': { contextWindow: 200000, maxOutputTokens: 4096, preferredChunkTokens: 2200 },
  'claude-3-sonnet-20240229': { contextWindow: 200000, maxOutputTokens: 4096, preferredChunkTokens: 2200 },
  'claude-3-haiku-20240307': { contextWindow: 200000, maxOutputTokens: 4096, preferredChunkTokens: 2200 },

  'gemini-2.5-pro': { contextWindow: 1000000, maxOutputTokens: 32000, preferredChunkTokens: 18000 },
  'gemini-2.5-flash': { contextWindow: 1000000, maxOutputTokens: 24000, preferredChunkTokens: 14000 },
  'gemini-2.5-flash-lite': { contextWindow: 1000000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'gemini-1.5-pro': { contextWindow: 1000000, maxOutputTokens: 8192, preferredChunkTokens: 4500 },
  'gemini-1.5-flash': { contextWindow: 1000000, maxOutputTokens: 8192, preferredChunkTokens: 4500 },

  'doubao-seed-2-0-pro-260215': { contextWindow: 256000, maxOutputTokens: 24000, preferredChunkTokens: 14000 },
  'doubao-seed-2-0-lite-260215': { contextWindow: 128000, maxOutputTokens: 16000, preferredChunkTokens: 9000 },
  'doubao-seed-2-0-mini-260215': { contextWindow: 128000, maxOutputTokens: 12000, preferredChunkTokens: 7000 },
  'doubao-seed-1-8-251228': { contextWindow: 128000, maxOutputTokens: 12000, preferredChunkTokens: 7000 },
  'doubao-seed-1-6-251015': { contextWindow: 128000, maxOutputTokens: 8192, preferredChunkTokens: 4500 },
  'doubao-seed-1-6-flash-250828': { contextWindow: 128000, maxOutputTokens: 8192, preferredChunkTokens: 4500 },
  'doubao-1-5-lite-32k-250115': { contextWindow: 32000, maxOutputTokens: 4096, preferredChunkTokens: 2200 }
}

const TRANSLATION_API_PROFILES: Record<string, Partial<TranslationModelProfile>> = {
  google: {
    contextWindow: 30000,
    maxOutputTokens: 8000,
    supportsBatch: true,
    preferredChunkTokens: 4000
  },
  deepl: {
    contextWindow: 30000,
    maxOutputTokens: 8000,
    supportsBatch: true,
    preferredChunkTokens: 4000
  },
  libretranslate: {
    contextWindow: 8000,
    maxOutputTokens: 3000,
    supportsBatch: true,
    preferredChunkTokens: 1500
  },
  mymemory: {
    contextWindow: 4000,
    maxOutputTokens: 1000,
    supportsBatch: false,
    preferredChunkTokens: 600
  },
  'google-free': {
    contextWindow: 4000,
    maxOutputTokens: 1000,
    supportsBatch: false,
    preferredChunkTokens: 600
  }
}

export function createTranslationModelProfile(provider: ProviderName, model?: string): TranslationModelProfile {
  const providerDefaults = AI_PROVIDER_DEFAULTS[provider] || TRANSLATION_API_PROFILES[provider] || {}
  const modelDefaults = model ? MODEL_OVERRIDES[model] || inferModelProfile(model) : {}

  return {
    ...DEFAULT_PROFILE,
    ...providerDefaults,
    ...modelDefaults,
    provider,
    model
  }
}

export function estimateTranslationTokens(text: string): number {
  if (!text) {
    return 0
  }

  let ascii = 0
  let cjk = 0
  let other = 0

  for (const char of text) {
    const code = char.charCodeAt(0)
    if (
      (code >= 0x4e00 && code <= 0x9fff) ||
      (code >= 0x3040 && code <= 0x30ff) ||
      (code >= 0xac00 && code <= 0xd7af)
    ) {
      cjk++
    } else if (code <= 0x007f) {
      ascii++
    } else {
      other++
    }
  }

  return Math.ceil(ascii / 4 + cjk * 1.15 + other / 2.5)
}

export function getAdaptiveChunkTokenBudget(profile: TranslationModelProfile): number {
  const reservedPromptTokens = 900
  const reservedOutputTokens = Math.max(800, Math.ceil(profile.maxOutputTokens * 0.9))
  const contextBudget = Math.floor(
    (profile.contextWindow - reservedPromptTokens - reservedOutputTokens) *
    (1 - profile.safetyMarginRatio)
  )
  const outputBoundBudget = Math.floor(profile.maxOutputTokens * 0.55)
  const preferredBudget = profile.preferredChunkTokens || outputBoundBudget

  return Math.max(300, Math.min(contextBudget, outputBoundBudget, preferredBudget))
}

function inferModelProfile(model: string): Partial<TranslationModelProfile> {
  const normalized = model.toLowerCase()

  if (normalized.includes('32k')) {
    return { contextWindow: 32000, maxOutputTokens: 4096, preferredChunkTokens: 2200 }
  }

  if (normalized.includes('128k')) {
    return { contextWindow: 128000, maxOutputTokens: 8192, preferredChunkTokens: 4500 }
  }

  if (normalized.includes('flash') || normalized.includes('mini') || normalized.includes('lite')) {
    return { maxOutputTokens: 8192, preferredChunkTokens: 4500 }
  }

  return {}
}
