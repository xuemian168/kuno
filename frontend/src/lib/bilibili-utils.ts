export const generateBilibiliThumbnail = (videoId: string): string => {
  try {
    const canvas = document.createElement('canvas')
    canvas.width = 480
    canvas.height = 270
    const ctx = canvas.getContext('2d')
    
    if (ctx) {
      // Create gradient background using Bilibili brand colors
      const gradient = ctx.createLinearGradient(0, 0, 480, 270)
      gradient.addColorStop(0, '#00A1D6')
      gradient.addColorStop(1, '#0084C7')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, 480, 270)
      
      // Add Bilibili branding
      ctx.fillStyle = 'white'
      ctx.font = 'bold 32px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('哔哩哔哩', 240, 100)
      
      // Add video ID
      ctx.font = '18px monospace'
      ctx.fillText(videoId, 240, 140)
      
      // Add subtitle
      ctx.font = '16px sans-serif'
      ctx.fillText('Bilibili Video', 240, 170)
      
      // Add play icon
      ctx.beginPath()
      ctx.moveTo(200, 200)
      ctx.lineTo(280, 235)
      ctx.lineTo(200, 270)
      ctx.closePath()
      ctx.fillStyle = 'rgba(255, 255, 255, 0.8)'
      ctx.fill()
      
      return canvas.toDataURL()
    }
    
    return `https://via.placeholder.com/480x270/00A1D6/FFFFFF?text=Bilibili+${videoId}`
  } catch (error) {
    console.error('Failed to generate Bilibili thumbnail:', error)
    return `https://via.placeholder.com/480x270/00A1D6/FFFFFF?text=Bilibili+Video`
  }
}

export const getBiliBiliVideoInfo = (url: string): { id: string; type: 'bv' | 'av' } | null => {
  const patterns = [
    /(?:bilibili\.com\/video\/)?(BV[a-zA-Z0-9]+)/,
    /(?:bilibili\.com\/video\/)?av(\d+)/,
    /b23\.tv\/(BV[a-zA-Z0-9]+)/,
    /b23\.tv\/av(\d+)/,
  ]

  for (const pattern of patterns) {
    const match = url.match(pattern)
    if (match && match[1]) {
      if (match[1].startsWith('BV')) {
        return { id: match[1], type: 'bv' }
      } else {
        return { id: match[1], type: 'av' }
      }
    }
  }
  return null
}