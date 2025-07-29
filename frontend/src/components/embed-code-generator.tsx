'use client'

import { useState } from 'react'
import { useTranslations } from 'next-intl'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Code } from 'lucide-react'
import { getSiteUrl } from '@/lib/utils'

interface EmbedCodeGeneratorProps {
  articleId: string | number
  articleTitle?: string
}

export default function EmbedCodeGenerator({ articleId, articleTitle }: EmbedCodeGeneratorProps) {
  const t = useTranslations()
  const [width, setWidth] = useState('100%')
  const [height, setHeight] = useState('600')
  const [theme, setTheme] = useState('light')
  const [copied, setCopied] = useState(false)

  const siteUrl = getSiteUrl()
  // Embed URLs should not include language prefix
  const embedUrl = `${siteUrl}/embed/${articleId}?theme=${theme}`

  const embedCode = `<iframe 
  src="${embedUrl}" 
  width="${width}" 
  height="${height}" 
  frameborder="0"
  title="${articleTitle || t('embed.embedArticle')}"
  style="border: 1px solid #e5e7eb; border-radius: 8px;"
  allowfullscreen>
</iframe>`

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(embedCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy:', err)
    }
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Code className="h-4 w-4 mr-2" />
          {t('embed.title')}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>{t('embed.embedArticle')}</DialogTitle>
          <DialogDescription>
            {t('embed.embedDescription')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="width">{t('embed.width')}</Label>
              <Input
                id="width"
                type="text"
                value={width}
                onChange={(e) => setWidth(e.target.value)}
                placeholder="e.g. 100% or 800px"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="height">{t('embed.height')}</Label>
              <Input
                id="height"
                type="number"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                min="300"
                step="50"
              />
            </div>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="theme">{t('embed.theme')}</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="light">{t('embed.lightTheme')}</SelectItem>
                <SelectItem value="dark">{t('embed.darkTheme')}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="embed-code">{t('embed.embedCode')}</Label>
            <Textarea
              id="embed-code"
              value={embedCode}
              readOnly
              className="font-mono text-sm"
              rows={8}
            />
          </div>

          <Button onClick={handleCopy} className="w-full">
            {copied ? t('embed.copied') : t('embed.copyCode')}
          </Button>

          <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
            <p>{t('embed.previewUrl')}: <code className="bg-gray-100 dark:bg-gray-800 px-1 rounded">{embedUrl}</code></p>
            <p>{t('embed.autoAdjustNote')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}