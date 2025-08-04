import { ImageResponse } from 'next/og'
 
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
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
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
  const siteIcon = await getSiteIcon()
  
  // If we have a site icon URL, try to use it
  if (siteIcon) {
    try {
      // For now, return the default kuno image since we can't easily fetch and convert images in edge runtime
      // This would require more complex image processing
      const kunoResponse = await fetch(new URL('/kuno.png', process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'))
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
  }
  
  // Fallback to generated icon with site title first letter
  const { locale } = await params
  let siteTitle = 'Blog'
  
  try {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api'
    const response = await fetch(`${apiUrl}/settings?lang=${locale}`)
    if (response.ok) {
      const settings = await response.json()
      siteTitle = settings.site_title || siteTitle
    }
  } catch (error) {
    console.error('Failed to fetch site title for icon:', error)
  }
  
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