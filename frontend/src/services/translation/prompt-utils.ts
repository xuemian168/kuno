export function buildTranslationSystemPrompt(fromLang: string, toLang: string): string {
  return `You are a professional translator. Translate the following text from ${fromLang} to ${toLang}.
Maintain the original formatting, tone, Markdown structure, line breaks, and style.
Do not translate, rewrite, remove, add spaces to, or change placeholders that match __KUNO_PROTECT_0000__.
Only provide the translation without any explanation or additional text.`
}

export function buildBatchTranslationSystemPrompt(fromLang: string, toLang: string): string {
  return `You are a professional translator. Translate the following numbered texts from ${fromLang} to ${toLang}.
Maintain the original formatting, tone, Markdown structure, line breaks, and style for each text.
Do not translate, rewrite, remove, add spaces to, or change placeholders that match __KUNO_PROTECT_0000__.
Keep the same numbering format in your response.
Only provide the translations without any explanation.`
}
