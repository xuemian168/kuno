import { ImageResponse } from 'next/og'
import { getApiUrl } from '@/lib/config'
 
// Route segment config
export const runtime = 'edge'
 
// Image metadata
export const size = {
  width: 32,
  height: 32,
}
export const contentType = 'image/png'

// Fetch site favicon/logo from settings
async function getSiteIcon(): Promise<string | null> {
  try {
    const apiUrl = getApiUrl()
    const response = await fetch(`${apiUrl}/settings`, {
      next: { revalidate: 300 } // Cache for 5 minutes
    })
    
    if (response.ok) {
      const settings = await response.json()
      return settings.favicon_url || settings.logo_url || null
    }
  } catch (error) {
    console.error('Failed to fetch site settings for icon:', error)
  }
  
  return null
}
 
// Image generation
export default async function Icon({ params }: { params: Promise<{ locale: string }> }) {
  // Always use the default kuno.png for consistency
  try {
    // Try to get the static file from the public directory
    const kunoUrl = `${process.env.NODE_ENV === 'development' ? 'http://localhost:3000' : 'http://localhost'}/kuno.png`
    const kunoResponse = await fetch(kunoUrl)
    if (kunoResponse.ok) {
      return new Response(await kunoResponse.arrayBuffer(), {
        headers: {
          'Content-Type': 'image/png',
          'Cache-Control': 'public, max-age=3600',
        },
      })
    }
  } catch (error) {
    console.error('Failed to fetch kuno.png:', error)
  }
  
  // Fallback to generated icon with site title first letter
  const { locale } = await params
  const siteTitle = 'Kuno' // Default to 'Kuno' instead of fetching from API
  
  const firstLetter = siteTitle.charAt(0).toUpperCase()
  
  return new ImageResponse(
    (
      <div
        style={{
          fontSize: 24,
          background: '#00b043',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          borderRadius: '20%',
          fontWeight: 'bold',
        }}
      >
        {firstLetter}
      </div>
    ),
    {
      ...size,
    }
  )
}