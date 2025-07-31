import { BaseTranslationProvider } from './base'

export class VolcanoProvider extends BaseTranslationProvider {
  name = 'Volcano'
  private accessKeyId: string
  private accessKeySecret: string
  private region = 'cn-beijing'
  
  constructor(apiKey?: string, apiSecret?: string, region?: string) {
    super(apiKey, apiSecret)
    this.accessKeyId = apiKey || ''
    this.accessKeySecret = apiSecret || ''
    if (region) this.region = region
  }

  isConfigured(): boolean {
    return !!this.accessKeyId && !!this.accessKeySecret
  }

  private async generateSignature(method: string, canonicalUri: string, queryString: string, headers: Record<string, string>, payload: string): Promise<Record<string, string>> {
    const timestamp = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '')
    const date = timestamp.slice(0, 8)
    
    // Create canonical headers
    const canonicalHeaders = Object.entries(headers)
      .sort(([a], [b]) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(([key, value]) => `${key.toLowerCase()}:${value}`)
      .join('\n')
    
    const signedHeaders = Object.keys(headers)
      .sort((a, b) => a.toLowerCase().localeCompare(b.toLowerCase()))
      .map(h => h.toLowerCase())
      .join(';')
    
    // Create hash of payload
    const encoder = new TextEncoder()
    const data = encoder.encode(payload)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    const hashedPayload = Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
    
    // Create canonical request
    const canonicalRequest = [
      method,
      canonicalUri,
      queryString,
      canonicalHeaders + '\n',
      signedHeaders,
      hashedPayload
    ].join('\n')
    
    // Create string to sign
    const scope = `${date}/${this.region}/translate/request`
    const stringToSign = [
      'HMAC-SHA256',
      timestamp,
      scope,
      await this.sha256(canonicalRequest)
    ].join('\n')
    
    // Calculate signature
    const kDate = await this.hmacSHA256(`VOLCENGINE${this.accessKeySecret}`, date)
    const kRegion = await this.hmacSHA256(kDate, this.region)
    const kService = await this.hmacSHA256(kRegion, 'translate')
    const kSigning = await this.hmacSHA256(kService, 'request')
    const signature = await this.hmacSHA256Hex(kSigning, stringToSign)
    
    // Create authorization header
    const authorization = `HMAC-SHA256 Credential=${this.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
    
    return {
      ...headers,
      'Authorization': authorization,
      'X-Date': timestamp,
      'X-Content-Sha256': hashedPayload
    }
  }
  
  private async sha256(message: string): Promise<string> {
    const encoder = new TextEncoder()
    const data = encoder.encode(message)
    const hashBuffer = await crypto.subtle.digest('SHA-256', data)
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }
  
  private async hmacSHA256(key: ArrayBuffer | string, message: string): Promise<ArrayBuffer> {
    const encoder = new TextEncoder()
    const keyData = typeof key === 'string' ? encoder.encode(key) : key
    const messageData = encoder.encode(message)
    
    const cryptoKey = await crypto.subtle.importKey(
      'raw',
      keyData,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    
    return await crypto.subtle.sign('HMAC', cryptoKey, messageData)
  }
  
  private async hmacSHA256Hex(key: ArrayBuffer, message: string): Promise<string> {
    const result = await this.hmacSHA256(key, message)
    return Array.from(new Uint8Array(result))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')
  }

  async translate(text: string, from: string, to: string): Promise<string> {
    if (!this.isConfigured()) {
      throw this.createError('Volcano Engine credentials not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    try {
      const endpoint = 'https://translate.volcengineapi.com'
      const action = 'TranslateText'
      const version = '2020-06-01'
      
      const payload = JSON.stringify({
        SourceLanguage: this.mapLanguageCode(from),
        TargetLanguage: this.mapLanguageCode(to),
        TextList: [text]
      })
      
      const headers = {
        'Content-Type': 'application/json',
        'Host': 'translate.volcengineapi.com',
        'X-Service': 'translate',
        'X-Action': action,
        'X-Version': version,
        'X-Region': this.region
      }
      
      const signedHeaders = await this.generateSignature('POST', '/', '', headers, payload)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: signedHeaders,
        body: payload
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.ResponseMetadata?.Error?.Message || 'Translation failed',
          error.ResponseMetadata?.Error?.Code || 'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      
      if (!data.TranslationList || data.TranslationList.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }
      
      return data.TranslationList[0].Translation
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Volcano Engine error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  async translateBatch(texts: string[], from: string, to: string): Promise<string[]> {
    if (!this.isConfigured()) {
      throw this.createError('Volcano Engine credentials not configured', 'NOT_CONFIGURED')
    }

    this.validateLanguages(from, to)

    try {
      const endpoint = 'https://translate.volcengineapi.com'
      const action = 'TranslateText'
      const version = '2020-06-01'
      
      const payload = JSON.stringify({
        SourceLanguage: this.mapLanguageCode(from),
        TargetLanguage: this.mapLanguageCode(to),
        TextList: texts
      })
      
      const headers = {
        'Content-Type': 'application/json',
        'Host': 'translate.volcengineapi.com',
        'X-Service': 'translate',
        'X-Action': action,
        'X-Version': version,
        'X-Region': this.region
      }
      
      const signedHeaders = await this.generateSignature('POST', '/', '', headers, payload)
      
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: signedHeaders,
        body: payload
      })

      if (!response.ok) {
        const error = await response.json()
        throw this.createError(
          error.ResponseMetadata?.Error?.Message || 'Translation failed',
          error.ResponseMetadata?.Error?.Code || 'TRANSLATION_ERROR'
        )
      }

      const data = await response.json()
      
      if (!data.TranslationList || data.TranslationList.length === 0) {
        throw this.createError('No translation result returned', 'NO_RESULT')
      }
      
      return data.TranslationList.map((item: any) => item.Translation)
    } catch (error) {
      if (error instanceof Error && 'code' in error) {
        throw error
      }
      throw this.createError(
        `Volcano Engine error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        'PROVIDER_ERROR'
      )
    }
  }

  getSupportedLanguages(): string[] {
    // Volcano Engine supports these languages
    return [
      'zh', 'en', 'ja', 'ko', 'es', 'fr', 'de', 'ru', 'ar', 'pt',
      'it', 'nl', 'sv', 'da', 'no', 'fi', 'pl', 'cs', 'sk', 'hu',
      'ro', 'bg', 'hr', 'sr', 'sl', 'et', 'lv', 'lt', 'uk', 'be',
      'tr', 'he', 'fa', 'ur', 'hi', 'bn', 'ta', 'te', 'vi', 'th',
      'id', 'ms', 'tl'
    ]
  }

  private mapLanguageCode(code: string): string {
    // Map our standard codes to Volcano Engine codes
    const mapping: Record<string, string> = {
      'zh': 'zh',
      'en': 'en',
      'ja': 'ja',
      'ko': 'ko',
      'es': 'es',
      'fr': 'fr',
      'de': 'de',
      'ru': 'ru',
      'ar': 'ar',
      'pt': 'pt',
      'it': 'it',
      'nl': 'nl',
      'sv': 'sv',
      'da': 'da',
      'no': 'no',
      'fi': 'fi',
      'pl': 'pl',
      'cs': 'cs',
      'sk': 'sk',
      'hu': 'hu',
      'ro': 'ro',
      'bg': 'bg',
      'hr': 'hr',
      'sr': 'sr',
      'sl': 'sl',
      'et': 'et',
      'lv': 'lv',
      'lt': 'lt',
      'uk': 'uk',
      'be': 'be',
      'tr': 'tr',
      'he': 'he',
      'fa': 'fa',
      'ur': 'ur',
      'hi': 'hi',
      'bn': 'bn',
      'ta': 'ta',
      'te': 'te',
      'vi': 'vi',
      'th': 'th',
      'id': 'id',
      'ms': 'ms',
      'tl': 'tl'
    }
    
    return mapping[code] || code
  }
}