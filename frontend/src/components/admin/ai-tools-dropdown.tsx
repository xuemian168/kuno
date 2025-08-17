'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Brain, Sparkles, Users, FileText, ChevronDown } from 'lucide-react'
import { Link } from '@/i18n/routing'
import { useTranslations } from 'next-intl'

interface AIToolsDropdownProps {
  locale: string
}

export function AIToolsDropdown({ locale }: AIToolsDropdownProps) {
  const t = useTranslations()
  
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Brain className="h-4 w-4" />
          {t('admin.aiTools')}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/admin/embeddings" className="flex w-full items-center gap-2">
            <Brain className="h-4 w-4" />
            {locale === 'zh' ? 'RAG' : 'RAG'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/content-assistant" className="flex w-full items-center gap-2">
            <Sparkles className="h-4 w-4" />
            {t('admin.contentAssistant')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/recommendations" className="flex w-full items-center gap-2">
            <Users className="h-4 w-4" />
            {t('admin.recommendations')}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/admin/llms-txt" className="flex w-full items-center gap-2">
            <FileText className="h-4 w-4" />
            LLMs
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}