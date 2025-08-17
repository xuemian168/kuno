'use client'

import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Upload, Download, ChevronDown, FileX } from 'lucide-react'
import { Link } from '@/i18n/routing'

interface ContentActionsDropdownProps {
  locale: string
  onExportAll: () => void
  exporting: boolean
}

export function ContentActionsDropdown({ locale, onExportAll, exporting }: ContentActionsDropdownProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileX className="h-4 w-4" />
          {locale === 'zh' ? '内容操作' : 'Content Actions'}
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem asChild>
          <Link href="/admin/import" className="flex w-full items-center gap-2">
            <Upload className="h-4 w-4" />
            {locale === 'zh' ? '内容导入' : 'Import Content'}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={onExportAll}
          disabled={exporting}
          className="flex w-full items-center gap-2 cursor-pointer"
        >
          {exporting ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
          ) : (
            <Download className="h-4 w-4" />
          )}
          {exporting ? 
            (locale === 'zh' ? '导出中...' : 'Exporting...') : 
            (locale === 'zh' ? '导出全部' : 'Export All')
          }
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}