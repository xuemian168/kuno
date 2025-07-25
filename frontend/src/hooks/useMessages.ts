'use client'

import { useState, useEffect } from 'react'
import { SupportedLanguage } from '@/services/translation/types'
import { loadMessages, createSimpleTranslator } from '@/i18n/messages-loader'

// Hook for using messages in components
export function useMessages(locale: string) {
  const [messages, setMessages] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadMessages(locale as SupportedLanguage).then((msgs) => {
      setMessages(msgs)
      setLoading(false)
    })
  }, [locale])

  return { messages, loading, t: createSimpleTranslator(messages) }
}