interface OpenAIChatRequestOptions {
  model: string
  systemPrompt: string
  userPrompt: string
  temperature?: number
  maxOutputTokens?: number
  jsonObjectResponse?: boolean
}

interface OpenAIChatMessage {
  role: 'system' | 'developer' | 'user'
  content: string
}

export function isReasoningOpenAIModel(model: string): boolean {
  return /^gpt-5(?:[.-]|$)/.test(model) || /^o[1-9](?:[.-]|$)/.test(model)
}

export function buildOpenAIChatRequestBody({
  model,
  systemPrompt,
  userPrompt,
  temperature,
  maxOutputTokens,
  jsonObjectResponse = false,
}: OpenAIChatRequestOptions): Record<string, unknown> {
  const instructionRole: OpenAIChatMessage['role'] = isReasoningOpenAIModel(model) ? 'developer' : 'system'

  const body: Record<string, unknown> = {
    model,
    messages: [
      {
        role: instructionRole,
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ] satisfies OpenAIChatMessage[],
  }

  if (typeof temperature === 'number') {
    body.temperature = temperature
  }

  if (typeof maxOutputTokens === 'number') {
    if (isReasoningOpenAIModel(model)) {
      body.max_completion_tokens = maxOutputTokens
    } else {
      body.max_tokens = maxOutputTokens
    }
  }

  if (jsonObjectResponse) {
    body.response_format = { type: 'json_object' }
  }

  return body
}

export function getOpenAIResponseText(data: any): string {
  const content = data?.choices?.[0]?.message?.content

  if (typeof content === 'string') {
    return content.trim()
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => {
        if (typeof item === 'string') {
          return item
        }

        if (typeof item?.text === 'string') {
          return item.text
        }

        return ''
      })
      .join('\n')
      .trim()
  }

  return ''
}
