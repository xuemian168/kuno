import { routing } from '@/i18n/routing'

// Generate static params for static export
export async function generateStaticParams() {
  const params = []
  
  // Generate for each locale and some sample article IDs
  for (const locale of routing.locales) {
    for (let id = 1; id <= 10; id++) {
      params.push({
        locale,
        id: id.toString()
      })
    }
  }
  
  return params
}