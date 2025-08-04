import { NextResponse } from 'next/server'
import { readFile } from 'fs/promises'
import { join } from 'path'

export async function GET() {
  try {
    // Try to serve the favicon.ico from public directory
    const faviconPath = join(process.cwd(), 'public', 'favicon.ico')
    
    try {
      const faviconBuffer = await readFile(faviconPath)
      
      return new NextResponse(faviconBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'image/x-icon',
          'Cache-Control': 'public, max-age=31536000, immutable', // Cache for 1 year
          'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString(),
        },
      })
    } catch (fileError) {
      // If favicon.ico doesn't exist, try to serve kuno.png
      const kunoPath = join(process.cwd(), 'public', 'kuno.png')
      
      try {
        const kunoBuffer = await readFile(kunoPath)
        
        return new NextResponse(kunoBuffer, {
          status: 200,
          headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=31536000, immutable',
            'Expires': new Date(Date.now() + 31536000 * 1000).toUTCString(),
          },
        })
      } catch (kunoError) {
        // Return 204 No Content if neither file exists
        return new NextResponse(null, {
          status: 204,
          headers: {
            'Cache-Control': 'public, max-age=3600',
          },
        })
      }
    }
  } catch (error) {
    console.error('Error serving favicon:', error)
    return new NextResponse(null, { status: 404 })
  }
}