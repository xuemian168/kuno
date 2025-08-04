"use client"

import { useState, useEffect } from "react"
import { motion } from "framer-motion"
import { ArrowLeft, Upload, AlertCircle, CheckCircle } from "lucide-react"
import Image from "next/image"
import { useTranslations } from 'next-intl'
import { Link } from '@/i18n/routing'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { WordPressImport } from "@/components/admin/wordpress-import"
import { MarkdownImport } from "@/components/admin/markdown-import"
import { GhostImport } from "@/components/admin/ghost-import"

// Custom icon components for platform-specific logos
const WordPressIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/wordpress.svg" 
    alt="WordPress" 
    width={24} 
    height={24} 
    className={className}
  />
)

const MarkdownIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/markdown.svg" 
    alt="Markdown" 
    width={24} 
    height={24} 
    className={className}
  />
)

const GhostIcon = ({ className }: { className?: string }) => (
  <Image 
    src="/ghost.svg" 
    alt="Ghost" 
    width={24} 
    height={24} 
    className={className}
  />
)

interface ImportPageProps {
  params: Promise<{ locale: string }>
}

export default function ImportPage({ params }: ImportPageProps) {
  const t = useTranslations()
  const [locale, setLocale] = useState<string>('zh')
  const [activeTab, setActiveTab] = useState('wordpress')

  useEffect(() => {
    params.then(({ locale: paramLocale }) => {
      setLocale(paramLocale)
    })
  }, [params])

  const handleImportComplete = () => {
    // Could add success notification or redirect logic here
    console.log('Import completed successfully')
  }

  const importSources = [
    {
      id: 'wordpress',
      name: 'WordPress',
      description: locale === 'zh' ? '从WordPress XML导出文件批量导入文章' : 'Bulk import posts from WordPress XML export file',
      icon: WordPressIcon,
      status: 'available',
      features: [
        locale === 'zh' ? '支持文章、页面和分类' : 'Supports posts, pages and categories',
        locale === 'zh' ? '保留原始发布时间' : 'Preserves original publish dates',
        locale === 'zh' ? '自动处理图片和媒体' : 'Automatic image and media handling',
        locale === 'zh' ? '智能分类映射' : 'Smart category mapping'
      ]
    },
    {
      id: 'markdown',
      name: 'Markdown',
      description: locale === 'zh' ? '从Markdown文件批量导入文章（测试中）' : 'Bulk import from Markdown files (in testing)',
      icon: MarkdownIcon,
      status: 'available',
      features: [
        locale === 'zh' ? '支持Front Matter元数据' : 'Support for Front Matter metadata',
        locale === 'zh' ? '批量文件选择和预览' : 'Bulk file selection and preview',
        locale === 'zh' ? '智能分类映射' : 'Smart category mapping',
        locale === 'zh' ? '导入进度跟踪' : 'Import progress tracking'
      ]
    },
    {
      id: 'ghost',
      name: 'Ghost',
      description: locale === 'zh' ? '从Ghost JSON导出文件导入（测试中）' : 'Import from Ghost JSON export (in testing)',
      icon: GhostIcon,
      status: 'available',
      features: [
        locale === 'zh' ? '完整的文章数据' : 'Complete post data',
        locale === 'zh' ? '标签和分类支持' : 'Tags and categories support',
        locale === 'zh' ? '用户信息保留' : 'User information preservation',
        locale === 'zh' ? 'SEO设置导入' : 'SEO settings import'
      ]
    },
    {
      id: 'other',
      name: locale === 'zh' ? '其他格式' : 'Other Formats',
      description: locale === 'zh' ? '更多导入格式正在开发中' : 'More import formats in development',
      icon: Upload,
      status: 'future',
      features: [
        'Medium',
        'Notion',
        'Substack',
        locale === 'zh' ? '自定义CSV格式' : 'Custom CSV format'
      ]
    }
  ]

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'available':
        return (
          <div className="flex items-center gap-1 text-green-600 dark:text-green-400">
            <CheckCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {locale === 'zh' ? '可用' : 'Available'}
            </span>
          </div>
        )
      case 'planned':
        return (
          <div className="flex items-center gap-1 text-blue-600 dark:text-blue-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {locale === 'zh' ? '计划中' : 'Planned'}
            </span>
          </div>
        )
      case 'future':
        return (
          <div className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
            <AlertCircle className="h-4 w-4" />
            <span className="text-sm font-medium">
              {locale === 'zh' ? '未来版本' : 'Future'}
            </span>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="max-w-6xl mx-auto"
    >
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <Link href="/admin">
          <Button variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            {locale === 'zh' ? '返回Dashboard' : 'Back to Dashboard'}
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">
            {locale === 'zh' ? '内容导入' : 'Content Import'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {locale === 'zh' 
              ? '从其他平台批量导入文章和内容' 
              : 'Bulk import articles and content from other platforms'
            }
          </p>
        </div>
      </div>

      {/* Important Notice */}
      <Alert className="mb-8">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          {locale === 'zh' 
            ? '导入前请备份现有数据。大量数据导入可能需要较长时间，请耐心等待。' 
            : 'Please backup your existing data before importing. Large data imports may take a while, please be patient.'
          }
        </AlertDescription>
      </Alert>

      {/* Import Sources Overview */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">
          {locale === 'zh' ? '支持的导入格式' : 'Supported Import Formats'}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {importSources.map((source) => {
            const IconComponent = source.icon
            return (
              <Card key={source.id} className={source.status === 'available' ? 'ring-1 ring-primary/20' : 'opacity-75'}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <CardTitle className="text-lg">{source.name}</CardTitle>
                        <CardDescription className="text-sm">
                          {source.description}
                        </CardDescription>
                      </div>
                    </div>
                    {getStatusBadge(source.status)}
                  </div>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {source.features.map((feature, index) => (
                      <li key={index} className="text-sm text-muted-foreground flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {/* Import Interface */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6">
          {locale === 'zh' ? '开始导入' : 'Start Import'}
        </h2>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="wordpress" disabled={false}>
              WordPress
            </TabsTrigger>
            <TabsTrigger value="markdown" disabled={false}>
              Markdown
              <span className="ml-2 text-xs opacity-60">
                {locale === 'zh' ? '测试中' : 'Testing'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="ghost" disabled={false}>
              Ghost
              <span className="ml-2 text-xs opacity-60">
                {locale === 'zh' ? '测试中' : 'Testing'}
              </span>
            </TabsTrigger>
            <TabsTrigger value="other" disabled={true}>
              {locale === 'zh' ? '其他' : 'Other'}
              <span className="ml-2 text-xs opacity-60">
                {locale === 'zh' ? '敬请期待' : 'Soon'}
              </span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="wordpress" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <WordPressIcon className="h-5 w-5" />
                  WordPress {locale === 'zh' ? '导入' : 'Import'}
                </CardTitle>
                <CardDescription>
                  {locale === 'zh' 
                    ? '从WordPress导出的XML文件中批量导入文章、页面和分类' 
                    : 'Bulk import posts, pages and categories from WordPress XML export file'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <WordPressImport onImportComplete={handleImportComplete} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="markdown" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MarkdownIcon className="h-5 w-5" />
                  Markdown {locale === 'zh' ? '导入' : 'Import'}
                </CardTitle>
                <CardDescription>
                  {locale === 'zh' 
                    ? '从Markdown文件批量导入文章，支持Front Matter元数据解析' 
                    : 'Bulk import articles from Markdown files with Front Matter metadata support'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <MarkdownImport onImportComplete={handleImportComplete} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="ghost" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GhostIcon className="h-5 w-5" />
                  Ghost {locale === 'zh' ? '导入' : 'Import'}
                </CardTitle>
                <CardDescription>
                  {locale === 'zh' 
                    ? '从Ghost JSON导出文件导入文章、页面和标签。功能正在测试中，请谨慎使用。' 
                    : 'Import posts, pages and tags from Ghost JSON export files. Feature is in testing, please use with caution.'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <GhostImport onImportComplete={handleImportComplete} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="other" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  {locale === 'zh' ? '其他格式' : 'Other Formats'}
                </CardTitle>
                <CardDescription>
                  {locale === 'zh' 
                    ? '更多导入格式正在规划中' 
                    : 'More import formats are being planned'
                  }
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Upload className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    {locale === 'zh' ? '更多格式即将到来' : 'More Formats Coming'}
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    {locale === 'zh' 
                      ? '我们计划支持Medium、Notion、Substack等更多平台的导入' 
                      : 'We plan to support imports from Medium, Notion, Substack and more platforms'
                    }
                  </p>
                  <div className="flex justify-center gap-2 text-sm text-muted-foreground">
                    <span>Medium</span>
                    <span>•</span>
                    <span>Notion</span>
                    <span>•</span>
                    <span>Substack</span>
                    <span>•</span>
                    <span>CSV</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Best Practices */}
      <Card className="bg-muted/30">
        <CardHeader>
          <CardTitle className="text-lg">
            {locale === 'zh' ? '导入最佳实践' : 'Import Best Practices'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium mb-3">
                {locale === 'zh' ? '导入前准备' : 'Before Import'}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  {locale === 'zh' ? '备份现有数据' : 'Backup existing data'}
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  {locale === 'zh' ? '检查文件格式和大小' : 'Check file format and size'}
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  {locale === 'zh' ? '确保网络连接稳定' : 'Ensure stable network connection'}
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-3">
                {locale === 'zh' ? '导入后检查' : 'After Import'}
              </h4>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  {locale === 'zh' ? '验证文章数量和内容' : 'Verify article count and content'}
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  {locale === 'zh' ? '检查分类和标签' : 'Check categories and tags'}
                </li>
                <li className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-current" />
                  {locale === 'zh' ? '测试图片和媒体文件' : 'Test images and media files'}
                </li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  )
}