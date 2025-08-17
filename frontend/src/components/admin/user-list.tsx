'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { 
  Loader2, 
  Users, 
  Search, 
  Clock, 
  BookOpen, 
  RefreshCw,
  ChevronRight,
  Eye
} from 'lucide-react'
import { apiClient, RecentUser } from '@/lib/api'
import { getDeviceIcon, getBrowserIcon, getDeviceTypeDisplay, getBrowserDisplay } from '@/lib/device-icons'

interface UserListProps {
  onUserSelect?: (userId: string) => void
  language?: string
  className?: string
}

const UserList: React.FC<UserListProps> = ({ 
  onUserSelect, 
  language = 'zh',
  className = ''
}) => {
  const [users, setUsers] = useState<RecentUser[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredUsers, setFilteredUsers] = useState<RecentUser[]>([])

  useEffect(() => {
    loadRecentUsers()
  }, [])

  useEffect(() => {
    // Filter users based on search term
    if (!searchTerm.trim()) {
      setFilteredUsers(users)
    } else {
      const filtered = users.filter(user => 
        user.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.language.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.device_preference.toLowerCase().includes(searchTerm.toLowerCase())
      )
      setFilteredUsers(filtered)
    }
  }, [users, searchTerm])

  const loadRecentUsers = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await apiClient.getRecentUsers({ 
        limit: 20, 
        days: 7 
      })
      
      setUsers(response.users || [])
    } catch (err) {
      setError(language === 'zh' ? '加载用户列表失败' : 'Failed to load user list')
      console.error('Failed to load recent users:', err)
    } finally {
      setLoading(false)
    }
  }

  const formatReadingTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    
    if (hours > 0) {
      return language === 'zh' ? `${hours}小时${minutes}分钟` : `${hours}h ${minutes}m`
    }
    return language === 'zh' ? `${minutes}分钟` : `${minutes}m`
  }

  const formatLastActive = (dateString: string): string => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffDays > 0) {
      return language === 'zh' ? `${diffDays}天前` : `${diffDays}d ago`
    } else if (diffHours > 0) {
      return language === 'zh' ? `${diffHours}小时前` : `${diffHours}h ago`
    } else {
      const diffMinutes = Math.floor(diffMs / (1000 * 60))
      return language === 'zh' ? `${diffMinutes}分钟前` : `${diffMinutes}m ago`
    }
  }


  const getLanguageFlag = (lang: string) => {
    switch (lang?.toLowerCase()) {
      case 'zh':
      case 'zh-cn':
        return '🇨🇳'
      case 'en':
      case 'en-us':
        return '🇺🇸'
      default:
        return '🌐'
    }
  }

  const getTexts = () => {
    const texts = {
      zh: {
        title: '最近活跃用户',
        description: '点击用户查看详细行为分析',
        search: '搜索用户ID或设备类型...',
        refresh: '刷新列表',
        noUsers: '暂无活跃用户',
        loading: '加载用户列表...',
        lastActive: '最后活跃',
        totalTime: '总阅读时间',
        articles: '篇文章',
        scrollDepth: '平均滚动深度'
      },
      en: {
        title: 'Recently Active Users',
        description: 'Click on a user to view detailed behavior analysis',
        search: 'Search user ID or device type...',
        refresh: 'Refresh List',
        noUsers: 'No active users',
        loading: 'Loading user list...',
        lastActive: 'Last Active',
        totalTime: 'Total Reading Time',
        articles: 'articles',
        scrollDepth: 'Avg Scroll Depth'
      }
    }
    return texts[language as keyof typeof texts] || texts.zh
  }

  const texts = getTexts()

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              {texts.title}
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {texts.description}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={loadRecentUsers}
            disabled={loading}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            {texts.refresh}
          </Button>
        </div>
        
        <div className="flex items-center gap-2 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={texts.search}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span>{texts.loading}</span>
          </div>
        ) : filteredUsers.length > 0 ? (
          <div className="space-y-3">
            {filteredUsers.map((user, index) => (
              <div
                key={user.user_id}
                className="border rounded-lg p-4 hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onUserSelect?.(user.user_id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium truncate">
                        {user.user_id}
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        #{index + 1}
                      </Badge>
                      <span className="text-sm">
                        {getLanguageFlag(user.language)}
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        <span>{formatLastActive(user.last_active)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-3 w-3" />
                        <span>{formatReadingTime(user.total_reading_time)}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        <span>{user.article_count} {texts.articles}</span>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {getDeviceIcon(user.device_preference)}
                        <span>{getDeviceTypeDisplay(user.device_preference, language)}</span>
                      </div>
                    </div>
                    
                    <div className="mt-2 flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {texts.scrollDepth}: {Math.round(Math.min(user.avg_scroll_depth, 1.0) * 100)}%
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {user.language.toUpperCase()}
                      </Badge>
                    </div>
                  </div>
                  
                  <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors ml-2" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>{searchTerm ? '未找到匹配的用户' : texts.noUsers}</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default UserList