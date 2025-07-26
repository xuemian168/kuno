// Utility to clean up corrupted protected content placeholders
export function cleanupProtectedContent(text: string): string {
  let cleanedText = text

  // Remove various placeholder patterns that might have been left behind
  const placeholderPatterns = [
    // Full placeholder patterns
    /___TRANSLATION_PROTECT_\d+_\d+___/gi,
    /__ Protected_\d+_\d+__/gi,
    /__PROTECTED_\d+_\d+__/gi,
    /__ Translation_Protect_\d+_\d+__/gi,
    /__ translation_protect_\d+_\d+__/gi,
    // Handle specific patterns seen in the user's content
    /__ Protected_0_0__/gi,
    /__ Protected_3_0__/gi,
    // Partial placeholder patterns
    /_TRANSLATION_PROTECT_\d+_\d+_/gi,
    /TRANSLATION_PROTECT_\d+_\d+/gi,
    /Protected_\d+_\d+/gi,
    // Leading underscores before specific content (the main issue)
    /^_+(?=<YouTubeEmbed)/gm,
    /^_+(?=<youtubeembed)/gmi,
    /^_+(?=<BilibiliEmbed)/gm,
    /^_+(?=<bilibiliembed)/gmi,
    /^_+(?=```)/gm,
    /^_+(?=<[a-zA-Z])/gm,
    // Underscores at start of lines that look like leftovers
    /(?:\n|^)_+(?=\S)/gm,
  ]

  placeholderPatterns.forEach(pattern => {
    cleanedText = cleanedText.replace(pattern, '')
  })

  // Clean up extra whitespace and line breaks that might result from removing placeholders
  cleanedText = cleanedText.replace(/\n\s*\n\s*\n/g, '\n\n')
  cleanedText = cleanedText.replace(/^\s+|\s+$/g, '')
  
  // Remove empty lines that might be left after cleanup
  cleanedText = cleanedText.replace(/\n{3,}/g, '\n\n')

  return cleanedText
}

// Function to check if text contains corrupted placeholders
export function hasCorruptedPlaceholders(text: string): boolean {
  const corruptedPatterns = [
    /__ Protected_\d+_\d+__/gi,
    /__ Translation_Protect_\d+_\d+__/gi,
    /__ translation_protect_\d+_\d+__/gi,
  ]

  return corruptedPatterns.some(pattern => pattern.test(text))
}