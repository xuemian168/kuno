'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Globe } from 'lucide-react'
import { useClientLocale } from '@/hooks/useClientLocale'

export default function LanguageSwitcher() {
  const { currentLocale, availableLocales, localeNames, switchLocale } = useClientLocale()

  const currentLocaleName = localeNames[currentLocale] || currentLocale

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Globe className="h-4 w-4" />
          {currentLocaleName}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {availableLocales.map((availableLocale) => (
          <DropdownMenuItem 
            key={availableLocale}
            onClick={() => switchLocale(availableLocale)}
            className={currentLocale === availableLocale ? 'bg-accent' : ''}
          >
            {localeNames[availableLocale] || availableLocale}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}