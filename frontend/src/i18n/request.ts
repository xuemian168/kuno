import { getRequestConfig } from 'next-intl/server'
import { routing } from './routing'
import { loadMessages } from './messages-loader'

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale

  if (!locale || !routing.locales.includes(locale as any)) {
    locale = routing.defaultLocale
  }

  try {
    // Try to load messages using the dynamic loader
    const messages = await loadMessages(locale as any)
    return {
      locale,
      messages
    }
  } catch (error) {
    // Fallback to default locale messages
    console.warn(`Failed to load messages for ${locale}, falling back to ${routing.defaultLocale}`)
    const fallbackMessages = await loadMessages(routing.defaultLocale as any)
    return {
      locale,
      messages: fallbackMessages
    }
  }
})