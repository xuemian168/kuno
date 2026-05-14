interface ClaudeMessagesRequestOptions {
  model: string
  userPrompt: string
  systemPrompt?: string
  temperature?: number
  maxOutputTokens: number
}

interface ClaudeTextBlock {
  type?: string
  text?: string
}

export function buildClaudeMessagesRequestBody({
  model,
  userPrompt,
  systemPrompt,
  temperature,
  maxOutputTokens,
}: ClaudeMessagesRequestOptions): Record<string, unknown> {
  const body: Record<string, unknown> = {
    model,
    max_tokens: maxOutputTokens,
    messages: [
      {
        role: 'user',
        content: userPrompt,
      },
    ],
  }

  if (systemPrompt) {
    body.system = systemPrompt
  }

  if (typeof temperature === 'number') {
    body.temperature = temperature
  }

  return body
}

export function getClaudeResponseText(data: any): string {
  const content = data?.content

  if (!Array.isArray(content)) {
    return ''
  }

  return content
    .map((item: ClaudeTextBlock | string) => {
      if (typeof item === 'string') {
        return item
      }

      if (item?.type === 'text' && typeof item.text === 'string') {
        return item.text
      }

      return ''
    })
    .join('\n')
    .trim()
}
