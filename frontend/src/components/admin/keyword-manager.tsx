"use client"

import { useState, useEffect } from "react"
import { useTranslations } from 'next-intl'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Search,
  Plus,
  Target,
  TrendingUp,
  TrendingDown,
  BarChart3,
  AlertTriangle,
  CheckCircle,
  Clock,
  Filter,
  Download,
  RefreshCw,
  Edit,
  Trash2,
  Eye,
  Zap,
  FileText,
  Globe
} from "lucide-react"
import { apiClient, SEOKeyword, SEOKeywordGroup } from "@/lib/api"

// Use API types directly with UI extensions
type Keyword = SEOKeyword & {
  // Add any additional UI-specific fields if needed
  cpc?: number
  competition?: number
  clicks?: number
  impressions?: number
  ctr?: number
  trend?: 'up' | 'down' | 'stable'
  trend_percentage?: number
  articles?: string[]
  status: 'tracking' | 'ranking' | 'opportunity' | 'declined' // UI status derived from tracking_status and rank
  current_position: number | null // Alias for current_rank
  target_position: number // UI field for target rank
  last_updated: string // Alias for updated_at
}

type KeywordGroup = SEOKeywordGroup & {
  keywords?: string[]
}

interface CompetitorKeyword {
  keyword: string
  competitor_url: string
  competitor_position: number
  our_position: number | null
  opportunity_score: number
  search_volume: number
  difficulty: 'easy' | 'medium' | 'hard'
}

export function KeywordManager() {
  const t = useTranslations()
  const [activeTab, setActiveTab] = useState('overview')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDifficulty, setSelectedDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all')
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'tracking' | 'ranking' | 'opportunity' | 'declined'>('all')
  const [isAddKeywordOpen, setIsAddKeywordOpen] = useState(false)
  const [isAddGroupOpen, setIsAddGroupOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isGeneratingKeywords, setIsGeneratingKeywords] = useState(false)

  // Form states
  const [newKeyword, setNewKeyword] = useState({
    keyword: '',
    target_position: 3,
    notes: ''
  })

  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    color: '#3b82f6'
  })

  const [bulkKeywords, setBulkKeywords] = useState('')

  // Helper function to map tracking status to UI status
  const mapTrackingStatusToUIStatus = (trackingStatus: string, currentRank: number | null): 'tracking' | 'ranking' | 'opportunity' | 'declined' => {
    if (currentRank && currentRank > 0 && currentRank <= 10) {
      return 'ranking'
    }
    if (trackingStatus === 'paused') {
      return 'declined'
    }
    if (currentRank === null || currentRank === 0) {
      return 'opportunity'
    }
    return 'tracking'
  }

  // API loading functions
  const loadKeywords = async () => {
    try {
      const response = await apiClient.getSEOKeywords()
      setKeywords(response.keywords.map(keyword => ({
        ...keyword,
        // Map API fields to UI fields with defaults
        cpc: 0, // Not available from API
        competition: 0, // Not available from API  
        clicks: 0, // Would come from analytics
        impressions: 0, // Would come from analytics
        ctr: 0, // Would come from analytics
        trend: 'stable' as const,
        trend_percentage: 0,
        articles: [], // Would come from article associations
        status: mapTrackingStatusToUIStatus(keyword.tracking_status, keyword.current_rank),
        current_position: keyword.current_rank || null,
        target_position: 5, // Default target
        last_updated: keyword.updated_at || keyword.created_at
      })))
    } catch (error) {
      console.error('Failed to load keywords:', error)
    }
  }

  const loadKeywordGroups = async () => {
    try {
      const response = await apiClient.getSEOKeywordGroups()
      setKeywordGroups(response.groups.map(group => ({
        ...group,
        keywords: [] // Would be populated separately
      })))
    } catch (error) {
      console.error('Failed to load keyword groups:', error)
    }
  }

  const loadCompetitorKeywords = async () => {
    try {
      // TODO: Implement competitor analysis API endpoint
      // For now, keep empty until backend implements this
      setCompetitorKeywords([])
    } catch (error) {
      console.error('Failed to load competitor keywords:', error)
    }
  }

  // Data loaded from API
  const [keywords, setKeywords] = useState<Keyword[]>([])

  const [keywordGroups, setKeywordGroups] = useState<KeywordGroup[]>([])

  const [competitorKeywords, setCompetitorKeywords] = useState<CompetitorKeyword[]>([])

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true)
      try {
        await Promise.all([
          loadKeywords(),
          loadKeywordGroups(),
          loadCompetitorKeywords()
        ])
      } catch (error) {
        console.error('Failed to load data:', error)
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [])

  const filteredKeywords = keywords.filter(keyword => {
    const matchesSearch = keyword.keyword.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesDifficulty = selectedDifficulty === 'all' || keyword.difficulty === selectedDifficulty
    const matchesStatus = selectedStatus === 'all' || keyword.status === selectedStatus
    return matchesSearch && matchesDifficulty && matchesStatus
  })

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'easy': return 'text-green-600'
      case 'medium': return 'text-yellow-600'
      case 'hard': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getDifficultyBadgeVariant = (difficulty: string): 'default' | 'secondary' | 'destructive' => {
    switch (difficulty) {
      case 'easy': return 'default'
      case 'medium': return 'secondary'
      case 'hard': return 'destructive'
      default: return 'secondary'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ranking':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'tracking':
        return <Clock className="h-4 w-4 text-blue-600" />
      case 'opportunity':
        return <Target className="h-4 w-4 text-purple-600" />
      case 'declined':
        return <AlertTriangle className="h-4 w-4 text-red-600" />
      default:
        return null
    }
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up':
        return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down':
        return <TrendingDown className="h-4 w-4 text-red-600" />
      default:
        return <BarChart3 className="h-4 w-4 text-gray-600" />
    }
  }

  const addKeyword = async () => {
    if (!newKeyword.keyword.trim()) return

    setIsLoading(true)
    try {
      const keywordData = {
        keyword: newKeyword.keyword,
        language: 'zh',
        target_url: '', // Empty for now, could be set to current site URL
        current_rank: 0,
        best_rank: 0,
        search_volume: 0, // Will be estimated by backend
        difficulty: 'medium' as const,
        tracking_status: 'active' as const,
        notes: newKeyword.notes,
        tags: ''
      }

      const response = await apiClient.createSEOKeyword(keywordData)
      
      // Add to local state
      const newKeywordItem: Keyword = {
        ...response.keyword,
        cpc: 0,
        competition: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        trend: 'stable',
        trend_percentage: 0,
        articles: [],
        status: mapTrackingStatusToUIStatus(response.keyword.tracking_status, response.keyword.current_rank),
        current_position: response.keyword.current_rank || null,
        target_position: newKeyword.target_position,
        last_updated: response.keyword.updated_at || response.keyword.created_at
      }
      
      setKeywords(prev => [...prev, newKeywordItem])
      setNewKeyword({ keyword: '', target_position: 3, notes: '' })
      setIsAddKeywordOpen(false)
    } catch (error) {
      console.error('Failed to add keyword:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const addKeywordGroup = async () => {
    if (!newGroup.name.trim()) return

    setIsLoading(true)
    try {
      const groupData = {
        name: newGroup.name,
        description: newGroup.description,
        color: newGroup.color,
        is_active: true,
        sort_order: 0
      }

      const response = await apiClient.createSEOKeywordGroup(groupData)
      
      const newGroupItem: KeywordGroup = {
        ...response.group,
        keywords: []
      }
      
      setKeywordGroups(prev => [...prev, newGroupItem])
      setNewGroup({ name: '', description: '', color: '#3b82f6' })
      setIsAddGroupOpen(false)
    } catch (error) {
      console.error('Failed to add keyword group:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const bulkAddKeywords = async () => {
    if (!bulkKeywords.trim()) return

    setIsLoading(true)
    try {
      const keywordList = bulkKeywords.split('\n').filter(k => k.trim())
      
      const response = await apiClient.bulkImportSEOKeywords({
        keywords: keywordList,
        language: 'zh'
      })
      
      const newKeywords = response.created_keywords.map(keyword => ({
        ...keyword,
        cpc: 0,
        competition: 0,
        clicks: 0,
        impressions: 0,
        ctr: 0,
        trend: 'stable' as const,
        trend_percentage: 0,
        articles: [],
        status: mapTrackingStatusToUIStatus(keyword.tracking_status, keyword.current_rank),
        current_position: keyword.current_rank || null,
        target_position: 5,
        last_updated: keyword.updated_at || keyword.created_at
      }))

      setKeywords(prev => [...prev, ...newKeywords])
      setBulkKeywords('')
    } catch (error) {
      console.error('Failed to bulk add keywords:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const generateKeywordSuggestions = async () => {
    setIsGeneratingKeywords(true)
    try {
      const response = await apiClient.suggestSEOKeywords(0, 'web development') // Default params
      
      setBulkKeywords(response.suggestions.join('\n'))
    } catch (error) {
      console.error('Failed to generate keyword suggestions:', error)
      // Fallback to mock suggestions
      const fallbackSuggestions = [
        'React Performance Optimization',
        'JavaScript ES6 Features', 
        'CSS Grid Layout Guide',
        'Node.js Backend Development',
        'MongoDB Database Design'
      ]
      setBulkKeywords(fallbackSuggestions.join('\n'))
    } finally {
      setIsGeneratingKeywords(false)
    }
  }

  const refreshKeywordData = async () => {
    setIsLoading(true)
    try {
      // Refresh rankings
      await apiClient.updateKeywordRankings()
      
      // Reload data
      await Promise.all([
        loadKeywords(),
        loadKeywordGroups(),
        loadCompetitorKeywords()
      ])
    } catch (error) {
      console.error('Failed to refresh keyword data:', error)
    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading && keywords.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
        <span className="ml-2 text-muted-foreground">{t('common.loading')}</span>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('seo.keywords.title')}</h1>
          <p className="text-muted-foreground">{t('seo.keywords.subtitle')}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={refreshKeywordData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            {t('seo.dashboard.refreshData')}
          </Button>
          <Dialog open={isAddKeywordOpen} onOpenChange={setIsAddKeywordOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                {t('seo.keywords.addKeyword')}
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>{t('seo.keywords.addNewKeyword')}</DialogTitle>
                <DialogDescription>
                  {t('seo.keywords.addKeywordDescription')}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="keyword">{t('seo.keywords.keyword')}</Label>
                  <Input
                    id="keyword"
                    value={newKeyword.keyword}
                    onChange={(e) => setNewKeyword(prev => ({ ...prev, keyword: e.target.value }))}
                    placeholder={t('seo.keywords.keywordPlaceholder')}
                  />
                </div>
                <div>
                  <Label htmlFor="target-position">{t('seo.keywords.targetPosition')}</Label>
                  <Select 
                    value={newKeyword.target_position.toString()} 
                    onValueChange={(value) => setNewKeyword(prev => ({ ...prev, target_position: parseInt(value) }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="1">{t('seo.keywords.firstPlace')}</SelectItem>
                      <SelectItem value="3">{t('seo.keywords.top3')}</SelectItem>
                      <SelectItem value="5">{t('seo.keywords.top5')}</SelectItem>
                      <SelectItem value="10">{t('seo.keywords.top10')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="notes">{t('seo.keywords.notes')}</Label>
                  <Textarea
                    id="notes"
                    value={newKeyword.notes}
                    onChange={(e) => setNewKeyword(prev => ({ ...prev, notes: e.target.value }))}
                    placeholder={t('seo.keywords.notesPlaceholder')}
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsAddKeywordOpen(false)}>
                  {t('common.cancel')}
                </Button>
                <Button onClick={addKeyword} disabled={isLoading}>
                  {t('seo.keywords.addKeyword')}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">{t('seo.keywords.overview')}</TabsTrigger>
          <TabsTrigger value="keywords">{t('seo.keywords.keywordList')}</TabsTrigger>
          <TabsTrigger value="groups">{t('seo.keywords.keywordGroups')}</TabsTrigger>
          <TabsTrigger value="opportunities">{t('seo.keywords.opportunities')}</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('seo.keywords.trackedKeywords')}</CardTitle>
                <Target className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{keywords.length}</div>
                <p className="text-xs text-muted-foreground">
                  {t('seo.keywords.activeTracking')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('seo.keywords.rankingKeywords')}</CardTitle>
                <CheckCircle className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {keywords.filter(k => k.status === 'ranking').length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('seo.keywords.top10Rankings')}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('seo.keywords.totalClicks')}</CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {keywords.reduce((sum, k) => sum + (k.clicks || 0), 0).toLocaleString()}
                </div>
                <div className="flex items-center text-xs text-green-600">
                  <TrendingUp className="h-3 w-3 mr-1" />
                  +12.3%
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{t('seo.keywords.averageCtr')}</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {keywords.length > 0 ? (keywords.reduce((sum, k) => sum + (k.ctr || 0), 0) / keywords.length).toFixed(1) : '0'}%
                </div>
                <p className="text-xs text-muted-foreground">
                  {t('seo.keywords.clickThroughRate')}
                </p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>{t('seo.keywords.keywordStatusDistribution')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-600" />
                    <span className="text-sm">{t('seo.keywords.ranking')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {keywords.filter(k => k.status === 'ranking').length}
                    </span>
                    <Progress 
                      value={(keywords.filter(k => k.status === 'ranking').length / keywords.length) * 100} 
                      className="w-20 h-2" 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-blue-600" />
                    <span className="text-sm">{t('seo.keywords.tracking')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {keywords.filter(k => k.status === 'tracking').length}
                    </span>
                    <Progress 
                      value={(keywords.filter(k => k.status === 'tracking').length / keywords.length) * 100} 
                      className="w-20 h-2" 
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-purple-600" />
                    <span className="text-sm">{t('seo.keywords.opportunity')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {keywords.filter(k => k.status === 'opportunity').length}
                    </span>
                    <Progress 
                      value={(keywords.filter(k => k.status === 'opportunity').length / keywords.length) * 100} 
                      className="w-20 h-2" 
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>{t('seo.keywords.quickActions')}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button className="w-full justify-start" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      {t('seo.keywords.bulkAdd')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[600px]">
                    <DialogHeader>
                      <DialogTitle>{t('seo.keywords.bulkAdd')}</DialogTitle>
                      <DialogDescription>
                        {t('seo.keywords.bulkAddDescription')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={generateKeywordSuggestions}
                          disabled={isGeneratingKeywords}
                        >
                          <Zap className="h-4 w-4 mr-2" />
                          {t('seo.keywords.aiGenerateSuggestions')}
                        </Button>
                      </div>
                      <Textarea
                        value={bulkKeywords}
                        onChange={(e) => setBulkKeywords(e.target.value)}
                        placeholder={t('seo.keywords.bulkPlaceholder')}
                        className="min-h-[200px]"
                      />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setBulkKeywords('')}>
                        {t('seo.keywords.clear')}
                      </Button>
                      <Button onClick={bulkAddKeywords} disabled={isLoading || !bulkKeywords.trim()}>
                        {t('seo.keywords.addKeyword')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Button className="w-full justify-start" variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  {t('seo.keywords.exportKeywordReport')}
                </Button>

                <Button className="w-full justify-start" variant="outline">
                  <Globe className="h-4 w-4 mr-2" />
                  {t('seo.keywords.analyzeCompetitors')}
                </Button>

                <Dialog open={isAddGroupOpen} onOpenChange={setIsAddGroupOpen}>
                  <DialogTrigger asChild>
                    <Button className="w-full justify-start" variant="outline">
                      <Target className="h-4 w-4 mr-2" />
                      {t('seo.keywords.createKeywordGroup')}
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>{t('seo.keywords.createKeywordGroup')}</DialogTitle>
                      <DialogDescription>
                        {t('seo.keywords.createGroupDescription')}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="group-name">{t('seo.keywords.groupName')}</Label>
                        <Input
                          id="group-name"
                          value={newGroup.name}
                          onChange={(e) => setNewGroup(prev => ({ ...prev, name: e.target.value }))}
                          placeholder={t('seo.keywords.groupNamePlaceholder')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="group-description">{t('seo.keywords.groupDescription')}</Label>
                        <Textarea
                          id="group-description"
                          value={newGroup.description}
                          onChange={(e) => setNewGroup(prev => ({ ...prev, description: e.target.value }))}
                          placeholder={t('seo.keywords.groupDescriptionPlaceholder')}
                        />
                      </div>
                      <div>
                        <Label htmlFor="group-color">{t('seo.keywords.groupColor')}</Label>
                        <Input
                          id="group-color"
                          type="color"
                          value={newGroup.color}
                          onChange={(e) => setNewGroup(prev => ({ ...prev, color: e.target.value }))}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setIsAddGroupOpen(false)}>
                        {t('common.cancel')}
                      </Button>
                      <Button onClick={addKeywordGroup} disabled={isLoading}>
                        {t('seo.keywords.createGroup')}
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Keywords List Tab */}
        <TabsContent value="keywords" className="space-y-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                placeholder={t('seo.keywords.searchKeywords')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={selectedDifficulty} onValueChange={(value: any) => setSelectedDifficulty(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="难度" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('seo.keywords.allDifficulties')}</SelectItem>
                  <SelectItem value="easy">{t('seo.keywords.easy')}</SelectItem>
                  <SelectItem value="medium">{t('seo.keywords.medium')}</SelectItem>
                  <SelectItem value="hard">{t('seo.keywords.hard')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedStatus} onValueChange={(value: any) => setSelectedStatus(value)}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="状态" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('seo.keywords.allStatuses')}</SelectItem>
                  <SelectItem value="ranking">{t('seo.keywords.ranking')}</SelectItem>
                  <SelectItem value="tracking">{t('seo.keywords.tracking')}</SelectItem>
                  <SelectItem value="opportunity">{t('seo.keywords.opportunity')}</SelectItem>
                  <SelectItem value="declined">{t('seo.keywords.declined')}</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>{t('seo.keywords.keyword')}</TableHead>
                    <TableHead>{t('seo.keywords.status')}</TableHead>
                    <TableHead>{t('seo.keywords.currentRank')}</TableHead>
                    <TableHead>{t('seo.keywords.searchVolume')}</TableHead>
                    <TableHead>{t('seo.keywords.difficulty')}</TableHead>
                    <TableHead>{t('seo.keywords.totalClicks')}</TableHead>
                    <TableHead>{t('seo.keywords.ctr')}</TableHead>
                    <TableHead>{t('seo.keywords.trend')}</TableHead>
                    <TableHead>{t('seo.keywords.actions')}</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredKeywords.map((keyword) => (
                    <TableRow key={keyword.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{keyword.keyword}</div>
                          <div className="text-sm text-muted-foreground">
                            {t('seo.keywords.targetRank')}: {t('seo.keywords.rankPosition', { position: keyword.target_position })}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(keyword.status)}
                          <span className="text-sm capitalize">{keyword.status}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {keyword.current_position ? (
                          <Badge variant="outline">
                            #{keyword.current_position}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{keyword.search_volume.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={getDifficultyBadgeVariant(keyword.difficulty)}>
                          {keyword.difficulty}
                        </Badge>
                      </TableCell>
                      <TableCell>{keyword.clicks || 0}</TableCell>
                      <TableCell>{(keyword.ctr || 0).toFixed(1)}%</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          {getTrendIcon(keyword.trend || 'stable')}
                          <span className={`text-sm ${(keyword.trend || 'stable') === 'up' ? 'text-green-600' : (keyword.trend || 'stable') === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                            {(keyword.trend_percentage || 0) > 0 ? '+' : ''}{keyword.trend_percentage || 0}%
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button size="sm" variant="ghost">
                            <Edit className="h-3 w-3" />
                          </Button>
                          <Button size="sm" variant="ghost">
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Groups Tab */}
        <TabsContent value="groups" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {keywordGroups.map((group) => (
              <Card key={group.id}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div 
                      className="w-4 h-4 rounded-full" 
                      style={{ backgroundColor: group.color }}
                    />
                    {group.name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground mb-4">
                    {group.description}
                  </p>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span>{t('seo.keywords.keywordCount')}</span>
                      <Badge variant="outline">{group.keywords?.length || 0}</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {t('seo.keywords.createdOn')} {group.created_at}
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button size="sm" variant="outline" className="flex-1">
                      <Eye className="h-3 w-3 mr-1" />
                      {t('seo.keywords.view')}
                    </Button>
                    <Button size="sm" variant="outline">
                      <Edit className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Opportunities Tab */}
        <TabsContent value="opportunities" className="space-y-6">
          <Alert>
            <Target className="h-4 w-4" />
            <AlertDescription>
              {t('seo.keywords.competitorOpportunitiesDescription')}
            </AlertDescription>
          </Alert>

          <Card>
            <CardHeader>
              <CardTitle>{t('seo.keywords.competitorOpportunities')}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {competitorKeywords.map((keyword, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{keyword.keyword}</span>
                        <Badge variant={getDifficultyBadgeVariant(keyword.difficulty)}>
                          {keyword.difficulty}
                        </Badge>
                        <Badge variant="outline">
                          {t('seo.keywords.opportunityScore')}: {keyword.opportunity_score}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t('seo.keywords.competitorRank')}: #{keyword.competitor_position} • 
                        {t('seo.keywords.ourRank')}: {keyword.our_position ? `#${keyword.our_position}` : t('seo.keywords.notRanked')} • 
                        {t('seo.keywords.searchVolume')}: {keyword.search_volume.toLocaleString()}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline">
                        <Plus className="h-3 w-3 mr-1" />
                        {t('seo.keywords.addToTracking')}
                      </Button>
                      <Button size="sm" variant="outline">
                        <FileText className="h-3 w-3 mr-1" />
                        {t('seo.keywords.createContent')}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}