'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Play, Copy, Download, Settings } from 'lucide-react'
import { Editor } from '@monaco-editor/react'

interface ApiDemo {
  id: string
  name: string
  method: 'GET' | 'POST' | 'PUT' | 'DELETE'
  path: string
  description: string
  example: string
  headers?: Record<string, string>
}

const demoApis: ApiDemo[] = [
  {
    id: 'get-articles',
    name: '获取文章列表',
    method: 'GET',
    path: '/api/articles',
    description: '获取所有文章，支持分类筛选',
    example: `// 获取所有文章
fetch('/api/articles')
  .then(res => res.json())
  .then(data => console.log(data))

// 按分类筛选
fetch('/api/articles?category_id=1')
  .then(res => res.json())
  .then(data => console.log(data))`
  },
  {
    id: 'create-article',
    name: '创建文章',
    method: 'POST',
    path: '/api/articles',
    description: '创建新文章',
    example: `// 创建新文章
const articleData = {
  title: "新文章标题",
  content: "文章内容",
  summary: "文章摘要",
  category_id: 1,
  content_type: "markdown"
}

fetch('/api/articles', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(articleData)
})
.then(res => res.json())
.then(data => console.log(data))`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  },
  {
    id: 'get-categories',
    name: '获取分类',
    method: 'GET',
    path: '/api/categories',
    description: '获取所有文章分类',
    example: `// 获取所有分类
fetch('/api/categories')
  .then(res => res.json())
  .then(data => console.log(data))`
  },
  {
    id: 'ai-summary',
    name: 'AI总结',
    method: 'POST',
    path: '/api/ai/summary',
    description: '使用AI生成内容摘要',
    example: `// AI内容总结
const summaryData = {
  content: "这里是要总结的文本内容...",
  max_length: 200
}

fetch('/api/ai/summary', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer YOUR_TOKEN'
  },
  body: JSON.stringify(summaryData)
})
.then(res => res.json())
.then(data => console.log(data))`,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_TOKEN'
    }
  },
  {
    id: 'recommendations',
    name: '推荐文章',
    method: 'GET',
    path: '/api/recommendations',
    description: '获取个性化推荐文章',
    example: `// 获取推荐文章
fetch('/api/recommendations?article_id=123&limit=5')
  .then(res => res.json())
  .then(data => console.log(data))`
  }
]

const methodColors = {
  GET: 'bg-green-100 text-green-800 border-green-200',
  POST: 'bg-blue-100 text-blue-800 border-blue-200',
  PUT: 'bg-yellow-100 text-yellow-800 border-yellow-200',
  DELETE: 'bg-red-100 text-red-800 border-red-200'
}

export function ApiPlayground() {
  const [selectedApi, setSelectedApi] = useState<ApiDemo>(demoApis[0])
  const [code, setCode] = useState(selectedApi.example)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)

  const handleApiSelect = (api: ApiDemo) => {
    setSelectedApi(api)
    setCode(api.example)
    setOutput('')
  }

  const handleRunCode = async () => {
    setLoading(true)
    setOutput('执行中...')
    
    try {
      // 模拟API调用
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // 根据不同API返回模拟数据
      let mockResponse = {}
      
      switch (selectedApi.id) {
        case 'get-articles':
          mockResponse = {
            success: true,
            data: [
              { id: 1, title: '示例文章1', summary: '这是第一篇示例文章', created_at: '2024-01-01' },
              { id: 2, title: '示例文章2', summary: '这是第二篇示例文章', created_at: '2024-01-02' }
            ],
            total: 2
          }
          break
        case 'create-article':
          mockResponse = {
            success: true,
            data: { id: 123, title: '新文章标题', message: '文章创建成功' }
          }
          break
        case 'get-categories':
          mockResponse = {
            success: true,
            data: [
              { id: 1, name: '技术', description: '技术相关文章' },
              { id: 2, name: '生活', description: '生活随笔' }
            ]
          }
          break
        case 'ai-summary':
          mockResponse = {
            success: true,
            data: {
              summary: 'AI生成的内容摘要，这里是根据输入内容智能生成的简短总结。',
              word_count: 156,
              summary_length: 28
            }
          }
          break
        case 'recommendations':
          mockResponse = {
            success: true,
            data: [
              { id: 124, title: '相关文章1', similarity: 0.85 },
              { id: 125, title: '相关文章2', similarity: 0.78 }
            ]
          }
          break
        default:
          mockResponse = { success: true, message: 'API调用成功' }
      }
      
      setOutput(JSON.stringify(mockResponse, null, 2))
    } catch (error) {
      setOutput(`错误: ${error}`)
    } finally {
      setLoading(false)
    }
  }

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
  }

  const handleCopyOutput = () => {
    navigator.clipboard.writeText(output)
  }

  const handleDownloadOutput = () => {
    const blob = new Blob([output], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `api-response-${selectedApi.id}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* 顶部API选择按钮 */}
      <div className="flex-shrink-0 p-4 bg-white dark:bg-gray-800 border-b">
        <div className="flex flex-wrap gap-2 items-center">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mr-4">
            API 演示
          </h2>
          {demoApis.map((api) => (
            <Button
              key={api.id}
              variant={selectedApi.id === api.id ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleApiSelect(api)}
              className="flex items-center gap-2"
            >
              <Badge 
                variant="outline" 
                className={`text-xs px-1 py-0 ${methodColors[api.method]}`}
              >
                {api.method}
              </Badge>
              {api.name}
            </Button>
          ))}
        </div>
        
        {/* API信息 */}
        <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
          <div className="flex items-center gap-2 mb-1">
            <Badge className={methodColors[selectedApi.method]}>
              {selectedApi.method}
            </Badge>
            <code className="text-sm font-mono bg-gray-200 dark:bg-gray-600 px-2 py-1 rounded">
              {selectedApi.path}
            </code>
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-300">
            {selectedApi.description}
          </p>
          {selectedApi.headers && (
            <div className="mt-2">
              <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                必需头部:
              </span>
              <div className="mt-1 space-y-1">
                {Object.entries(selectedApi.headers).map(([key, value]) => (
                  <div key={key} className="text-xs">
                    <code className="text-blue-600 dark:text-blue-400">{key}</code>
                    <span className="text-gray-500 mx-1">:</span>
                    <code className="text-green-600 dark:text-green-400">{value}</code>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 中间代码编辑器 */}
      <div className="flex-1 min-h-0 p-4">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">代码编辑器</CardTitle>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleCopyCode}>
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </Button>
                <Button 
                  size="sm" 
                  onClick={handleRunCode} 
                  disabled={loading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  <Play className="w-4 h-4 mr-1" />
                  {loading ? '执行中...' : '运行'}
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            <div className="h-full border rounded-md overflow-hidden">
              <Editor
                height="100%"
                defaultLanguage="javascript"
                value={code}
                onChange={(value) => setCode(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  fontSize: 14,
                  wordWrap: 'on',
                  automaticLayout: true
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <Separator />

      {/* 底部输出区域 */}
      <div className="flex-shrink-0 h-64 p-4">
        <Card className="h-full flex flex-col">
          <CardHeader className="flex-shrink-0 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">输出结果</CardTitle>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleCopyOutput}
                  disabled={!output}
                >
                  <Copy className="w-4 h-4 mr-1" />
                  复制
                </Button>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleDownloadOutput}
                  disabled={!output}
                >
                  <Download className="w-4 h-4 mr-1" />
                  下载
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0 min-h-0">
            <ScrollArea className="h-full">
              <pre className="p-4 text-sm font-mono bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 whitespace-pre-wrap break-words">
                {output || '点击"运行"按钮执行代码并查看输出结果...'}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}