export interface TranslationProvider {
  name: string
  translate(text: string, from: string, to: string): Promise<string>
  translateBatch(texts: string[], from: string, to: string): Promise<string[]>
  translateWithUsage?(text: string, from: string, to: string): Promise<TranslationResult>
  isConfigured(): boolean
  getSupportedLanguages(): string[]
}

export interface TranslationResult {
  translatedText: string
  confidence?: number
  detectedSourceLanguage?: string
  usage?: {
    inputTokens?: number
    outputTokens?: number
    totalTokens?: number
    estimatedCost?: number
    currency?: string
  }
}

export type AuthHeaderType = 'bearer' | 'x-api-key' | 'x-goog-api-key' | 'api-key' | 'custom'

export interface TranslationConfig {
  provider: 'google' | 'deepl' | 'openai' | 'gemini' | 'volcano' | 'claude' | 'libretranslate' | 'mymemory' | 'google-free'
  apiKey?: string
  apiSecret?: string
  region?: string
  model?: string
  baseUrl?: string  // Custom base URL for AI providers (OpenAI, Gemini, Volcano, Claude)
  apiUrl?: string // For LibreTranslate custom instances (backward compatibility)
  email?: string // For MyMemory
  enabledLanguages?: SupportedLanguage[] // User-configured languages
  authType?: AuthHeaderType // API authentication method (default: bearer)
  customAuthHeader?: string // Custom header name when authType is 'custom'
}

export interface LanguageSettings {
  enabledLanguages: SupportedLanguage[]
  defaultSourceLanguage: SupportedLanguage
  adminInterfaceLanguages: ('zh' | 'en')[] // Admin interface only supports Chinese and English
}

export interface TranslationError extends Error {
  code: string
  provider: string
}

export const SUPPORTED_LANGUAGES = {
  zh: '中文 (Chinese)',
  en: 'English',
  ja: '日本語 (Japanese)',
  ko: '한국어 (Korean)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  de: 'Deutsch (German)',
  ru: 'Русский (Russian)',
  ar: 'العربية (Arabic)',
  pt: 'Português (Portuguese)',
  it: 'Italiano (Italian)',
  nl: 'Nederlands (Dutch)',
  sv: 'Svenska (Swedish)',
  da: 'Dansk (Danish)',
  no: 'Norsk (Norwegian)',
  fi: 'Suomi (Finnish)',
  pl: 'Polski (Polish)',
  cs: 'Čeština (Czech)',
  sk: 'Slovenčina (Slovak)',
  hu: 'Magyar (Hungarian)',
  ro: 'Română (Romanian)',
  bg: 'Български (Bulgarian)',
  hr: 'Hrvatski (Croatian)',
  sr: 'Српски (Serbian)',
  sl: 'Slovenščina (Slovenian)',
  et: 'Eesti (Estonian)',
  lv: 'Latviešu (Latvian)',
  lt: 'Lietuvių (Lithuanian)',
  uk: 'Українська (Ukrainian)',
  be: 'Беларуская (Belarusian)',
  tr: 'Türkçe (Turkish)',
  he: 'עברית (Hebrew)',
  fa: 'فارسی (Persian)',
  ur: 'اردو (Urdu)',
  hi: 'हिन्दी (Hindi)',
  bn: 'বাংলা (Bengali)',
  ta: 'தமிழ் (Tamil)',
  te: 'తెలుగు (Telugu)',
  ml: 'മലയാളം (Malayalam)',
  kn: 'ಕನ್ನಡ (Kannada)',
  gu: 'ગુજરાતી (Gujarati)',
  pa: 'ਪੰਜਾਬੀ (Punjabi)',
  mr: 'मराठी (Marathi)',
  ne: 'नेपाली (Nepali)',
  si: 'සිංහල (Sinhala)',
  my: 'မြန်မာ (Myanmar)',
  km: 'ខ្មែរ (Khmer)',
  lo: 'ລາວ (Lao)',
  ka: 'ქართული (Georgian)',
  am: 'አማርኛ (Amharic)',
  sw: 'Kiswahili (Swahili)',
  zu: 'isiZulu (Zulu)',
  af: 'Afrikaans',
  sq: 'Shqip (Albanian)',
  hy: 'Հայերեն (Armenian)',
  az: 'Azərbaycan (Azerbaijani)',
  eu: 'Euskera (Basque)',
  ca: 'Català (Catalan)',
  cy: 'Cymraeg (Welsh)',
  ga: 'Gaeilge (Irish)',
  is: 'Íslenska (Icelandic)',
  mt: 'Malti (Maltese)',
  vi: 'Tiếng Việt (Vietnamese)',
  th: 'ไทย (Thai)',
  id: 'Bahasa Indonesia (Indonesian)',
  ms: 'Bahasa Melayu (Malay)',
  tl: 'Filipino (Tagalog)',
  haw: 'ʻŌlelo Hawaiʻi (Hawaiian)',
  mi: 'Te Reo Māori (Maori)',
  sm: 'Gagana Samoa (Samoan)',
  to: 'Lea Fakatonga (Tongan)',
  fj: 'Na Vosa Vakaviti (Fijian)'
} as const

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES