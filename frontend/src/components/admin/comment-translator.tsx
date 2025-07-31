"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Check, Code } from "lucide-react"

interface CommentTranslatorProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onConfirm: (selectedComments: CommentLine[]) => void
  codeContent: string
  locale?: string
  initialSelectedComments?: CommentLine[]
}

interface CommentLine {
  lineNumber: number
  originalLine: string
  commentText: string
  commentType: 'hash' | 'slash' | 'xml' | 'other'
  isSelected: boolean
}

export function CommentTranslator({ 
  open, 
  onOpenChange, 
  onConfirm, 
  codeContent, 
  locale = 'zh',
  initialSelectedComments = []
}: CommentTranslatorProps) {
  const [comments, setComments] = useState<CommentLine[]>([])

  // Extract comments from code
  const extractComments = (code: string): CommentLine[] => {
    const lines = code.split('\n')
    const commentLines: CommentLine[] = []
    
    lines.forEach((line, index) => {
      const trimmedLine = line.trim()
      let commentText = ''
      let commentType: CommentLine['commentType'] = 'other'
      
      // Detect different comment types
      if (trimmedLine.startsWith('#')) {
        // Shell, Python, etc. comments
        commentText = trimmedLine.substring(1).trim()
        commentType = 'hash'
      } else if (trimmedLine.startsWith('//')) {
        // JavaScript, C++, etc. comments
        commentText = trimmedLine.substring(2).trim()
        commentType = 'slash'
      } else if (trimmedLine.startsWith('<!--') && trimmedLine.endsWith('-->')) {
        // HTML/XML comments
        commentText = trimmedLine.substring(4, trimmedLine.length - 3).trim()
        commentType = 'xml'
      } else if (line.includes('//')) {
        // Check if // is part of a URL (http:// or https://)
        const slashIndex = line.indexOf('//')
        const isUrl = slashIndex > 0 && (
          line.substring(slashIndex - 5, slashIndex).includes('http') ||
          line.substring(slashIndex - 6, slashIndex).includes('https')
        )
        
        if (!isUrl) {
          // Inline comments
          commentText = line.substring(slashIndex + 2).trim()
          commentType = 'slash'
        }
      } else if (line.includes('#')) {
        // Check if # is part of a URL fragment or hash
        const hashIndex = line.indexOf('#')
        const beforeHash = line.substring(0, hashIndex)
        const isUrlFragment = beforeHash.includes('http') || beforeHash.includes('www.')
        
        if (!isUrlFragment) {
          // Inline hash comments
          commentText = line.substring(hashIndex + 1).trim()
          commentType = 'hash'
        }
      }
      
      if (commentText && commentText.length > 0) {
        commentLines.push({
          lineNumber: index + 1,
          originalLine: line,
          commentText,
          commentType,
          isSelected: false // Will be updated based on initialSelectedComments
        })
      }
    })
    
    return commentLines
  }

  // Initialize comments when dialog opens
  useEffect(() => {
    if (open && codeContent) {
      const extractedComments = extractComments(codeContent)
      
      // Apply initial selections based on saved data
      const commentsWithSelection = extractedComments.map(comment => {
        const wasPreviouslySelected = initialSelectedComments.some(saved => 
          saved.lineNumber === comment.lineNumber && 
          saved.commentText === comment.commentText
        )
        return {
          ...comment,
          isSelected: wasPreviouslySelected
        }
      })
      
      setComments(commentsWithSelection)
    }
  }, [open, codeContent, initialSelectedComments])

  const toggleCommentSelection = (index: number) => {
    setComments(prev => 
      prev.map((comment, i) => 
        i === index ? { ...comment, isSelected: !comment.isSelected } : comment
      )
    )
  }

  const selectAll = () => {
    setComments(prev => prev.map(comment => ({ ...comment, isSelected: true })))
  }

  const selectNone = () => {
    setComments(prev => prev.map(comment => ({ ...comment, isSelected: false })))
  }

  const confirmSelection = () => {
    const selectedComments = comments.filter(comment => comment.isSelected)
    onConfirm(selectedComments)
    onOpenChange(false)
  }

  const getCommentTypeIcon = (type: CommentLine['commentType']) => {
    switch (type) {
      case 'hash': return '#'
      case 'slash': return '//'
      case 'xml': return '<!-- -->'
      default: return '#'
    }
  }

  const selectedCount = comments.filter(c => c.isSelected).length

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Code className="h-5 w-5" />
            {locale === 'zh' ? '选择代码注释' : 'Select Code Comments'}
          </DialogTitle>
          <DialogDescription>
            {locale === 'zh' 
              ? '选择需要翻译的代码注释范围，支持 #、//、<!-- --> 等注释格式'
              : 'Select code comment ranges for translation. Supports #, //, <!-- --> and other comment formats'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Selection Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Badge variant="outline">
                {locale === 'zh' ? `找到 ${comments.length} 条注释` : `${comments.length} comments found`}
              </Badge>
              <Badge variant={selectedCount > 0 ? "default" : "secondary"}>
                {locale === 'zh' ? `已选择 ${selectedCount}` : `${selectedCount} selected`}
              </Badge>
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" size="sm" onClick={selectAll}>
                {locale === 'zh' ? '全选' : 'Select All'}
              </Button>
              <Button variant="ghost" size="sm" onClick={selectNone}>
                {locale === 'zh' ? '全不选' : 'Select None'}
              </Button>
            </div>
          </div>

          {/* Comments List */}
          <div className="flex-1 overflow-y-auto border rounded-lg">
            <div className="space-y-1 p-2">
              {comments.map((comment, index) => (
                <div 
                  key={comment.lineNumber}
                  className={`flex items-start gap-3 p-3 rounded-lg border ${
                    comment.isSelected ? 'bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800' : 'bg-muted/30'
                  }`}
                >
                  <Checkbox
                    checked={comment.isSelected}
                    onCheckedChange={() => toggleCommentSelection(index)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs font-mono">
                        {locale === 'zh' ? `行 ${comment.lineNumber}` : `Line ${comment.lineNumber}`}
                      </Badge>
                      <Badge variant="secondary" className="text-xs font-mono">
                        {getCommentTypeIcon(comment.commentType)}
                      </Badge>
                    </div>
                    <div className="space-y-2">
                      <div className="text-sm font-mono bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 p-2 rounded break-all overflow-x-auto max-w-full">
                        {comment.commentText}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {locale === 'zh' ? '取消' : 'Cancel'}
          </Button>
          <Button 
            onClick={confirmSelection} 
            className="bg-blue-600 hover:bg-blue-700"
          >
            <Check className="h-4 w-4 mr-2" />
            {selectedCount === 0 
              ? (locale === 'zh' ? '确认（不翻译）' : 'Confirm (No Translation)')
              : (locale === 'zh' ? `确认选择 (${selectedCount})` : `Confirm Selection (${selectedCount})`)
            }
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}