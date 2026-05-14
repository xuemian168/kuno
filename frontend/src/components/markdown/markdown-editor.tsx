"use client"

import { useRef, useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { MarkdownRenderer } from "./markdown-renderer"
import MediaSelector from "@/components/admin/media-selector"
import YouTubeEmbed from "@/components/youtube-embed"
import { Eye, Edit3, Image, Video } from "lucide-react"
import { MediaLibrary } from "@/lib/api"
import { getMediaUrl } from "@/lib/utils"
import { cn } from "@/lib/utils"

interface OnlineVideo {
  id: string
  url: string
  title: string
  thumbnail: string
  platform: 'youtube' | 'bilibili'
}

interface MarkdownEditorProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  language?: string
  availableLanguages?: { code: string; name: string }[]
  onLanguageChange?: (language: string) => void
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Write your markdown content here...",
  className = "",
  language,
  availableLanguages,
  onLanguageChange
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false)
  const [mediaSelectorType, setMediaSelectorType] = useState<'image' | 'video' | 'all'>('all')
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const [savedSelection, setSavedSelection] = useState({ start: 0, end: 0 })

  const saveSelection = () => {
    const textarea = textareaRef.current
    if (!textarea) return

    setSavedSelection({
      start: textarea.selectionStart,
      end: textarea.selectionEnd,
    })
  }

  const getSelectionRange = () => {
    const textarea = textareaRef.current
    if (!textarea) {
      return savedSelection
    }

    if (document.activeElement === textarea) {
      return {
        start: textarea.selectionStart,
        end: textarea.selectionEnd,
      }
    }

    return savedSelection
  }

  const insertBlockAtCursor = (blockText: string) => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end } = getSelectionRange()
    const beforeSelection = value.slice(0, start)
    const afterSelection = value.slice(end)
    const linePrefix = beforeSelection.slice(beforeSelection.lastIndexOf("\n") + 1)
    const nextLineBreakIndex = afterSelection.indexOf("\n")
    const lineSuffix = nextLineBreakIndex === -1 ? afterSelection : afterSelection.slice(0, nextLineBreakIndex)
    const contentBeforeLine = beforeSelection.slice(0, beforeSelection.length - linePrefix.length)
    const contentAfterLine = afterSelection.slice(lineSuffix.length)

    const segments = [linePrefix, blockText, lineSuffix].filter((segment) => segment.length > 0)
    const replacement = segments.join("\n")
    const newValue = contentBeforeLine + replacement + contentAfterLine
    const cursorOffset = linePrefix.length > 0 ? linePrefix.length + 1 + blockText.length : blockText.length

    onChange(newValue)
    setSavedSelection({
      start: contentBeforeLine.length + cursorOffset,
      end: contentBeforeLine.length + cursorOffset,
    })

    setTimeout(() => {
      textarea.focus()
      const newCursorPos = contentBeforeLine.length + cursorOffset
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const insertMarkdown = (syntax: string, placeholder: string = "") => {
    const textarea = textareaRef.current
    if (!textarea) return

    const { start, end } = getSelectionRange()
    const selectedText = value.substring(start, end)
    const replacement = selectedText || placeholder
    
    let newText = ""
    
    if (syntax === "**") {
      newText = value.substring(0, start) + `**${replacement}**` + value.substring(end)
    } else if (syntax === "*") {
      newText = value.substring(0, start) + `*${replacement}*` + value.substring(end)
    } else if (syntax === "`") {
      newText = value.substring(0, start) + `\`${replacement}\`` + value.substring(end)
    } else if (syntax === "```") {
      newText = value.substring(0, start) + `\`\`\`\n${replacement}\n\`\`\`` + value.substring(end)
    } else if (syntax === "link") {
      newText = value.substring(0, start) + `[${replacement || "link text"}](url)` + value.substring(end)
    } else if (syntax === "image") {
      newText = value.substring(0, start) + `![${replacement || "alt text"}](image-url)` + value.substring(end)
    } else if (syntax.startsWith("#")) {
      newText = value.substring(0, start) + `${syntax} ${replacement || "Heading"}` + value.substring(end)
    } else if (syntax === "list") {
      newText = value.substring(0, start) + `- ${replacement || "List item"}` + value.substring(end)
    } else if (syntax === "quote") {
      newText = value.substring(0, start) + `> ${replacement || "Quote"}` + value.substring(end)
    }
    
    onChange(newText)
    setSavedSelection({ start, end })
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + syntax.length + (replacement ? 0 : placeholder.length)
      textarea.setSelectionRange(newCursorPos, newCursorPos)
      setSavedSelection({ start: newCursorPos, end: newCursorPos })
    }, 0)
  }

  const openMediaSelector = (type: 'image' | 'video' | 'all') => {
    saveSelection()
    setMediaSelectorType(type)
    setMediaSelectorOpen(true)
  }

  const handleMediaSelect = (item: MediaLibrary | OnlineVideo, type: 'media' | 'online') => {
    const textarea = textareaRef.current
    if (!textarea) return

    let insertText = ""

    if (type === 'media') {
      const media = item as MediaLibrary
      const url = getMediaUrl(media.url)
      
      if (media.media_type === 'image') {
        insertText = `![${media.alt || media.original_name}](${url})`
      } else {
        insertText = `\n<video controls width="100%">\n  <source src="${url}" type="${media.mime_type}">\n  Your browser does not support the video tag.\n</video>\n`
      }
    } else {
      const video = item as OnlineVideo
      if (video.platform === 'youtube') {
        insertText = `\n<YouTubeEmbed url="${video.url}" title="${video.title}" />\n`
      } else {
        insertText = `\n<BiliBiliEmbed url="${video.url}" title="${video.title}" />\n`
      }
    }

    insertBlockAtCursor(insertText.trim())
    
    setMediaSelectorOpen(false)
  }

  return (
    <div className={cn("h-full min-h-0", className)}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")} className="h-full flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <TabsList>
              <TabsTrigger value="edit" className="flex items-center gap-2">
                <Edit3 className="h-4 w-4" />
                Edit
              </TabsTrigger>
              <TabsTrigger value="preview" className="flex items-center gap-2">
                <Eye className="h-4 w-4" />
                Preview
              </TabsTrigger>
            </TabsList>

            {language && availableLanguages && availableLanguages.length > 0 && onLanguageChange && (
              <Select value={language} onValueChange={onLanguageChange}>
                <SelectTrigger className="h-9 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguages.map((lang) => (
                    <SelectItem key={lang.code} value={lang.code}>
                      {lang.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
          
          {activeTab === "edit" && (
            <div className="flex flex-wrap gap-1">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("**", "bold text")}
              >
                <strong>B</strong>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("*", "italic text")}
              >
                <em>I</em>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("`", "code")}
              >
                {'<>'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("```", "code block")}
              >
                {'{}'}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("#", "Heading 1")}
              >
                H1
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("##", "Heading 2")}
              >
                H2
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("list")}
              >
                List
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("quote")}
              >
                Quote
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => insertMarkdown("link")}
              >
                Link
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openMediaSelector('image')}
              >
                <Image className="h-4 w-4 mr-1" />
                Image
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => openMediaSelector('video')}
              >
                <Video className="h-4 w-4 mr-1" />
                Video
              </Button>
            </div>
          )}
        </div>

        <TabsContent value="edit" className="mt-0 flex-1 min-h-0 pb-24">
          <Textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onSelect={saveSelection}
            onKeyUp={saveSelection}
            onClick={saveSelection}
            onFocus={saveSelection}
            placeholder={placeholder}
            className="h-full min-h-[360px] font-mono text-sm resize-y"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0 flex-1 min-h-0 pb-24">
          <Card className="h-full min-h-[360px] overflow-hidden">
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent className="h-full overflow-y-auto">
              {value ? (
                <MarkdownRenderer content={value} />
              ) : (
                <p className="text-muted-foreground">Nothing to preview...</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <MediaSelector
        open={mediaSelectorOpen}
        onOpenChange={setMediaSelectorOpen}
        onSelect={handleMediaSelect}
        acceptedTypes={mediaSelectorType}
      />
    </div>
  )
}