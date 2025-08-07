'use client'

import { useState, useEffect } from 'react'
import { TocItem } from '@/lib/markdown-utils'

export function useTableOfContents(tocItems: TocItem[]) {
  const [activeId, setActiveId] = useState<string>('')

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Find the first visible heading
        const visibleHeading = entries.find(entry => entry.isIntersecting)
        if (visibleHeading) {
          setActiveId(visibleHeading.target.id)
        }
      },
      {
        rootMargin: '-80px 0px -80% 0px', // Adjust based on your header height
        threshold: 0
      }
    )

    // Observe all headings
    tocItems.forEach(item => {
      const element = document.getElementById(item.id)
      if (element) {
        observer.observe(element)
      }
    })

    return () => observer.disconnect()
  }, [tocItems])

  const scrollToHeading = (id: string) => {
    const element = document.getElementById(id)
    if (element) {
      const yOffset = -80 // Adjust based on your fixed header height
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset
      
      window.scrollTo({ top: y, behavior: 'smooth' })
      setActiveId(id)
    }
  }

  return { activeId, scrollToHeading }
}