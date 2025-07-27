"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { MarkdownRenderer } from "./markdown-renderer"
import MediaSelector from "@/components/admin/media-selector"
import YouTubeEmbed from "@/components/youtube-embed"
import { Eye, Edit3, Image, Video } from "lucide-react"
import { MediaLibrary } from "@/lib/api"
import { getMediaUrl } from "@/lib/utils"

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
}

export function MarkdownEditor({ 
  value, 
  onChange, 
  placeholder = "Write your markdown content here...",
  className = ""
}: MarkdownEditorProps) {
  const [activeTab, setActiveTab] = useState<"edit" | "preview">("edit")
  const [mediaSelectorOpen, setMediaSelectorOpen] = useState(false)
  const [mediaSelectorType, setMediaSelectorType] = useState<'image' | 'video' | 'all'>('all')

  const insertMarkdown = (syntax: string, placeholder: string = "") => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
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
    
    // Restore focus and cursor position
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + syntax.length + (replacement ? 0 : placeholder.length)
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  const openMediaSelector = (type: 'image' | 'video' | 'all') => {
    setMediaSelectorType(type)
    setMediaSelectorOpen(true)
  }

  const handleMediaSelect = (item: MediaLibrary | OnlineVideo, type: 'media' | 'online') => {
    const textarea = document.querySelector('textarea') as HTMLTextAreaElement
    if (!textarea) return

    const start = textarea.selectionStart
    const end = textarea.selectionEnd
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

    const newText = value.substring(0, start) + insertText + value.substring(end)
    onChange(newText)
    
    setMediaSelectorOpen(false)
    
    // Restore focus
    setTimeout(() => {
      textarea.focus()
      const newCursorPos = start + insertText.length
      textarea.setSelectionRange(newCursorPos, newCursorPos)
    }, 0)
  }

  return (
    <div className={className}>
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as "edit" | "preview")}>
        <div className="flex items-center justify-between mb-4">
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

        <TabsContent value="edit" className="mt-0">
          <Textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[400px] font-mono text-sm resize-y"
          />
        </TabsContent>

        <TabsContent value="preview" className="mt-0">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Preview</CardTitle>
            </CardHeader>
            <CardContent>
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