"use client"

import { usePathname } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { ChevronRight, Home } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { cn } from '@/lib/utils'

interface BreadcrumbItem {
  label: string
  href?: string
  isActive?: boolean
}

export function AdminBreadcrumb() {
  const pathname = usePathname()
  const t = useTranslations()

  // Remove locale prefix and split path
  const pathWithoutLocale = pathname.replace(/^\/[a-z]{2}(?:\/|$)/, '/')
  const segments = pathWithoutLocale.split('/').filter(Boolean)

  // Generate breadcrumb items based on path
  const generateBreadcrumbs = (): BreadcrumbItem[] => {
    const items: BreadcrumbItem[] = [
      {
        label: t('nav.admin'),
        href: '/admin',
        isActive: pathWithoutLocale === '/admin'
      }
    ]

    if (segments.length > 1) {
      const [, section, subsection, id] = segments

      switch (section) {
        case 'articles':
          items.push({
            label: t('admin.articles'),
            href: '/admin',
            isActive: false
          })
          
          if (subsection === 'new') {
            items.push({
              label: t('admin.createArticle'),
              isActive: true
            })
          } else if (subsection && id) {
            items.push({
              label: t('admin.editArticle'),
              isActive: true
            })
          }
          break

        case 'categories':
          items.push({
            label: t('admin.categories'),
            href: '/admin',
            isActive: false
          })
          
          if (subsection === 'new') {
            items.push({
              label: t('admin.createCategory'),
              isActive: true
            })
          } else if (subsection && id) {
            items.push({
              label: t('admin.editCategory'),
              isActive: true
            })
          }
          break

        case 'settings':
          items.push({
            label: t('admin.settings'),
            isActive: true
          })
          break

        case 'media':
          items.push({
            label: t('admin.media'),
            isActive: true
          })
          break

        case 'analytics':
          items.push({
            label: t('admin.analytics'),
            isActive: true
          })
          break

        default:
          // For any other sections, just add the section name
          items.push({
            label: section.charAt(0).toUpperCase() + section.slice(1),
            isActive: true
          })
      }
    }

    return items
  }

  const breadcrumbs = generateBreadcrumbs()

  if (breadcrumbs.length <= 1) {
    return null
  }

  return (
    <nav className="flex items-center space-x-1 text-sm text-muted-foreground mb-6">
      <Link 
        href="/" 
        className="flex items-center hover:text-foreground transition-colors"
      >
        <Home className="h-4 w-4" />
      </Link>
      
      {breadcrumbs.map((item, index) => (
        <div key={index} className="flex items-center space-x-1">
          <ChevronRight className="h-4 w-4" />
          {item.href && !item.isActive ? (
            <Link
              href={item.href}
              className="hover:text-foreground transition-colors"
            >
              {item.label}
            </Link>
          ) : (
            <span className={cn(
              item.isActive && "text-foreground font-medium"
            )}>
              {item.label}
            </span>
          )}
        </div>
      ))}
    </nav>
  )
}