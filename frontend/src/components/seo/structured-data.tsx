interface StructuredDataProps {
  data: object
}

export function StructuredData({ data }: StructuredDataProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{
        __html: JSON.stringify(data, null, 2)
      }}
    />
  )
}

// Website structured data
export function WebsiteStructuredData({ 
  name, 
  description, 
  url, 
  locale 
}: {
  name: string
  description: string
  url: string
  locale: string
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": name,
    "description": description,
    "url": url,
    "inLanguage": locale,
    "potentialAction": {
      "@type": "SearchAction",
      "target": {
        "@type": "EntryPoint",
        "urlTemplate": `${url}/search?q={search_term_string}`
      },
      "query-input": "required name=search_term_string"
    }
  }

  return <StructuredData data={structuredData} />
}

// Article structured data
export function ArticleStructuredData({
  title,
  description,
  url,
  datePublished,
  dateModified,
  author,
  locale,
  content
}: {
  title: string
  description: string
  url: string
  datePublished: string
  dateModified?: string
  author: string
  locale: string
  content: string
}) {
  // Calculate reading time (rough estimate: 200 words per minute)
  const wordCount = content.split(' ').length
  const readingTimeMinutes = Math.ceil(wordCount / 200)
  
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    "headline": title,
    "description": description,
    "url": url,
    "datePublished": datePublished,
    "dateModified": dateModified || datePublished,
    "author": {
      "@type": "Person",
      "name": author
    },
    "publisher": {
      "@type": "Organization",
      "name": author
    },
    "inLanguage": locale,
    "wordCount": wordCount,
    "timeRequired": `PT${readingTimeMinutes}M`,
    "articleBody": content.substring(0, 500) + (content.length > 500 ? '...' : '')
  }

  return <StructuredData data={structuredData} />
}

// Breadcrumb structured data
export function BreadcrumbStructuredData({ 
  items 
}: {
  items: Array<{ name: string; url: string }>
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": items.map((item, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": item.name,
      "item": item.url
    }))
  }

  return <StructuredData data={structuredData} />
}

// Video structured data for YouTube/Bilibili embeds
export function VideoStructuredData({
  name,
  description,
  embedUrl,
  thumbnailUrl,
  uploadDate,
  duration,
  url
}: {
  name: string
  description: string
  embedUrl: string
  thumbnailUrl?: string
  uploadDate?: string
  duration?: string
  url: string
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "VideoObject",
    "name": name,
    "description": description,
    "embedUrl": embedUrl,
    "url": url,
    ...(thumbnailUrl && { "thumbnailUrl": thumbnailUrl }),
    ...(uploadDate && { "uploadDate": uploadDate }),
    ...(duration && { "duration": duration })
  }

  return <StructuredData data={structuredData} />
}

// Image structured data
export function ImageStructuredData({
  name,
  description,
  url,
  width,
  height,
  encodingFormat
}: {
  name: string
  description?: string
  url: string
  width?: number
  height?: number
  encodingFormat?: string
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ImageObject",
    "name": name,
    "url": url,
    ...(description && { "description": description }),
    ...(width && { "width": width }),
    ...(height && { "height": height }),
    ...(encodingFormat && { "encodingFormat": encodingFormat })
  }

  return <StructuredData data={structuredData} />
}

// Media Gallery structured data
export function MediaGalleryStructuredData({
  name,
  description,
  images
}: {
  name: string
  description?: string
  images: Array<{
    url: string
    name: string
    description?: string
  }>
}) {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "ImageGallery",
    "name": name,
    ...(description && { "description": description }),
    "image": images.map(img => ({
      "@type": "ImageObject",
      "url": img.url,
      "name": img.name,
      ...(img.description && { "description": img.description })
    }))
  }

  return <StructuredData data={structuredData} />
}