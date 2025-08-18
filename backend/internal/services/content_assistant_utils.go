package services

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

// Additional utility methods for ContentAssistant

// generateKeywordVariations generates keyword variations
func (ca *ContentAssistant) generateKeywordVariations(primaryKeyword string, language string) []string {
	var variations []string

	if language == "zh" {
		// Chinese keyword variations
		variations = append(variations, primaryKeyword+"教程")
		variations = append(variations, primaryKeyword+"指南")
		variations = append(variations, primaryKeyword+"技巧")
		variations = append(variations, primaryKeyword+"方法")
		variations = append(variations, "如何"+primaryKeyword)
		variations = append(variations, primaryKeyword+"实践")
		variations = append(variations, primaryKeyword+"应用")
	} else if language == "ja" {
		// Japanese keyword variations
		variations = append(variations, primaryKeyword+"チュートリアル")
		variations = append(variations, primaryKeyword+"ガイド")
		variations = append(variations, primaryKeyword+"のコツ")
		variations = append(variations, primaryKeyword+"の方法")
		variations = append(variations, primaryKeyword+"の使い方")
		variations = append(variations, primaryKeyword+"の実践")
		variations = append(variations, primaryKeyword+"の応用")
		variations = append(variations, primaryKeyword+"入門")
		variations = append(variations, primaryKeyword+"活用法")
	} else {
		// English keyword variations
		variations = append(variations, primaryKeyword+" tutorial")
		variations = append(variations, primaryKeyword+" guide")
		variations = append(variations, primaryKeyword+" tips")
		variations = append(variations, primaryKeyword+" methods")
		variations = append(variations, "how to "+primaryKeyword)
		variations = append(variations, primaryKeyword+" practices")
		variations = append(variations, primaryKeyword+" application")
		variations = append(variations, "best "+primaryKeyword)
		variations = append(variations, primaryKeyword+" examples")
	}

	return variations
}

// estimateSearchVolume estimates monthly search volume for a keyword
func (ca *ContentAssistant) estimateSearchVolume(keyword string, language string) int {
	// Simplified estimation based on keyword characteristics
	baseVolume := 100

	// Adjust based on keyword length
	words := strings.Fields(keyword)
	if len(words) == 1 {
		baseVolume = 1000 // Single words tend to have higher volume
	} else if len(words) > 3 {
		baseVolume = 50 // Long-tail keywords have lower volume
	}

	// Adjust based on language
	if language == "zh" {
		baseVolume = int(float64(baseVolume) * 0.3) // Smaller Chinese market estimation
	} else if language == "ja" {
		baseVolume = int(float64(baseVolume) * 0.2) // Japanese market estimation
	}

	// Add some randomness
	variation := rand.Intn(baseVolume)
	return baseVolume + variation
}

// estimateKeywordDifficulty estimates SEO difficulty for a keyword
func (ca *ContentAssistant) estimateKeywordDifficulty(keyword string, language string) float64 {
	// Simplified difficulty estimation
	difficulty := 0.5 // Base difficulty

	// Single words are typically more competitive
	words := strings.Fields(keyword)
	if len(words) == 1 {
		difficulty = 0.8
	} else if len(words) > 3 {
		difficulty = 0.3 // Long-tail keywords are easier
	}

	// Add some randomness
	variation := (rand.Float64() - 0.5) * 0.2
	difficulty += variation

	if difficulty < 0.1 {
		difficulty = 0.1
	}
	if difficulty > 0.9 {
		difficulty = 0.9
	}

	return difficulty
}

// categorizeKeyword categorizes a keyword relative to primary keyword
func (ca *ContentAssistant) categorizeKeyword(keyword string, primaryKeyword string) string {
	if primaryKeyword == "" {
		return "secondary"
	}

	if strings.Contains(keyword, primaryKeyword) || strings.Contains(primaryKeyword, keyword) {
		return "primary"
	}

	words := strings.Fields(keyword)
	if len(words) > 3 {
		return "long-tail"
	}

	return "secondary"
}

// generateKeywordSuggestions generates usage suggestions for a keyword
func (ca *ContentAssistant) generateKeywordSuggestions(keyword string, content string) []string {
	var suggestions []string

	keywordLower := strings.ToLower(keyword)
	contentLower := strings.ToLower(content)

	if !strings.Contains(contentLower, keywordLower) {
		suggestions = append(suggestions, "Include this keyword in your content")
	}

	suggestions = append(suggestions, "Use in headings for better SEO")
	suggestions = append(suggestions, "Include in meta description")
	suggestions = append(suggestions, "Add to alt text for images")

	return suggestions
}

// generateBridgeTitles generates titles that bridge two topic clusters
func (ca *ContentAssistant) generateBridgeTitles(cluster1, cluster2 TopicCluster, language string) []string {
	var titles []string

	if language == "zh" {
		titles = append(titles, fmt.Sprintf("%s与%s的关联", cluster1.Name, cluster2.Name))
		titles = append(titles, fmt.Sprintf("从%s到%s的转换", cluster1.Name, cluster2.Name))
		titles = append(titles, fmt.Sprintf("结合%s和%s的最佳实践", cluster1.Name, cluster2.Name))
	} else if language == "ja" {
		titles = append(titles, fmt.Sprintf("%sと%sの関連性", cluster1.Name, cluster2.Name))
		titles = append(titles, fmt.Sprintf("%sから%sへの移行ガイド", cluster1.Name, cluster2.Name))
		titles = append(titles, fmt.Sprintf("%sと%sを組み合わせるベストプラクティス", cluster1.Name, cluster2.Name))
	} else {
		titles = append(titles, fmt.Sprintf("Connecting %s with %s", cluster1.Name, cluster2.Name))
		titles = append(titles, fmt.Sprintf("From %s to %s: A Transition Guide", cluster1.Name, cluster2.Name))
		titles = append(titles, fmt.Sprintf("Best Practices: Combining %s and %s", cluster1.Name, cluster2.Name))
	}

	return titles
}

// generateExpansionTitles generates titles for expanding underrepresented topics
func (ca *ContentAssistant) generateExpansionTitles(cluster TopicCluster, language string) []string {
	var titles []string

	if language == "zh" {
		titles = append(titles, fmt.Sprintf("%s深度解析", cluster.Name))
		titles = append(titles, fmt.Sprintf("%s实战案例研究", cluster.Name))
		titles = append(titles, fmt.Sprintf("%s常见问题解答", cluster.Name))
		titles = append(titles, fmt.Sprintf("%s进阶技巧分享", cluster.Name))
	} else if language == "ja" {
		titles = append(titles, fmt.Sprintf("%s詳細解説", cluster.Name))
		titles = append(titles, fmt.Sprintf("%s実践ケーススタディ", cluster.Name))
		titles = append(titles, fmt.Sprintf("%sよくある質問集", cluster.Name))
		titles = append(titles, fmt.Sprintf("%s上級テクニック", cluster.Name))
	} else {
		titles = append(titles, fmt.Sprintf("Deep Dive into %s", cluster.Name))
		titles = append(titles, fmt.Sprintf("%s: Real-world Case Studies", cluster.Name))
		titles = append(titles, fmt.Sprintf("%s FAQ: Common Questions Answered", cluster.Name))
		titles = append(titles, fmt.Sprintf("Advanced %s Techniques", cluster.Name))
	}

	return titles
}

// mergeAndDeduplicateKeywords merges and deduplicates keyword lists
func (ca *ContentAssistant) mergeAndDeduplicateKeywords(keywords1, keywords2 []string) []string {
	seen := make(map[string]bool)
	var result []string

	for _, keyword := range keywords1 {
		if !seen[keyword] {
			seen[keyword] = true
			result = append(result, keyword)
		}
	}

	for _, keyword := range keywords2 {
		if !seen[keyword] {
			seen[keyword] = true
			result = append(result, keyword)
		}
	}

	return result
}

// generateTrendingIdeas generates ideas based on trending topics
func (ca *ContentAssistant) generateTrendingIdeas(clusters []TopicCluster, language string) []WritingIdea {
	var ideas []WritingIdea

	// Find clusters with recent activity (if we had timestamp data)
	for _, cluster := range clusters {
		if cluster.Size >= 2 { // Clusters with reasonable activity
			idea := WritingIdea{
				Title:           ca.generateTrendingTitle(cluster, language),
				Description:     ca.generateTrendingDescription(cluster, language),
				Category:        cluster.Name,
				Keywords:        cluster.Keywords,
				DifficultyLevel: "intermediate",
				EstimatedLength: 800,
				Inspiration:     "Based on trending topic analysis",
				Language:        language,
				RelevanceScore:  0.6,
			}
			ideas = append(ideas, idea)
		}
	}

	return ideas
}

// generateSeasonalIdeas generates seasonal content ideas
func (ca *ContentAssistant) generateSeasonalIdeas(language string) []WritingIdea {
	var ideas []WritingIdea

	now := time.Now()
	month := now.Month()

	var seasonalTopics []string
	if language == "zh" {
		switch month {
		case time.January, time.February:
			seasonalTopics = []string{"新年计划", "技能提升", "年度总结"}
		case time.March, time.April, time.May:
			seasonalTopics = []string{"春季清理", "新技术学习", "项目启动"}
		case time.June, time.July, time.August:
			seasonalTopics = []string{"夏季实践", "技能深化", "开源贡献"}
		case time.September, time.October, time.November:
			seasonalTopics = []string{"秋季规划", "技术分享", "知识整理"}
		case time.December:
			seasonalTopics = []string{"年终回顾", "明年规划", "技术展望"}
		}
	} else if language == "ja" {
		switch month {
		case time.January, time.February:
			seasonalTopics = []string{"新年の計画", "スキル向上", "年次レビュー"}
		case time.March, time.April, time.May:
			seasonalTopics = []string{"春の整理", "新技術学習", "プロジェクト開始"}
		case time.June, time.July, time.August:
			seasonalTopics = []string{"夏の実践", "スキル深化", "オープンソース貢献"}
		case time.September, time.October, time.November:
			seasonalTopics = []string{"秋の計画", "技術共有", "知識整理"}
		case time.December:
			seasonalTopics = []string{"年末振り返り", "来年の計画", "技術展望"}
		}
	} else {
		switch month {
		case time.January, time.February:
			seasonalTopics = []string{"New Year Planning", "Skill Development", "Annual Review"}
		case time.March, time.April, time.May:
			seasonalTopics = []string{"Spring Cleaning", "Learning New Tech", "Project Kickoff"}
		case time.June, time.July, time.August:
			seasonalTopics = []string{"Summer Practice", "Skill Deepening", "Open Source"}
		case time.September, time.October, time.November:
			seasonalTopics = []string{"Fall Planning", "Tech Sharing", "Knowledge Organization"}
		case time.December:
			seasonalTopics = []string{"Year End Review", "Next Year Planning", "Tech Outlook"}
		}
	}

	for _, topic := range seasonalTopics {
		idea := WritingIdea{
			Title:           topic,
			Description:     fmt.Sprintf("Seasonal content about %s", topic),
			Category:        "Seasonal",
			Keywords:        []string{topic},
			DifficultyLevel: "beginner",
			EstimatedLength: 600,
			Inspiration:     "Seasonal content opportunity",
			Language:        language,
			RelevanceScore:  0.4,
		}
		ideas = append(ideas, idea)
	}

	return ideas
}

// generateTrendingTitle creates a title for trending content
func (ca *ContentAssistant) generateTrendingTitle(cluster TopicCluster, language string) string {
	if language == "zh" {
		return fmt.Sprintf("%s最新趋势分析", cluster.Name)
	} else if language == "ja" {
		return fmt.Sprintf("%sの最新トレンド分析", cluster.Name)
	} else {
		return fmt.Sprintf("Latest Trends in %s", cluster.Name)
	}
}

// generateTrendingDescription creates a description for trending content
func (ca *ContentAssistant) generateTrendingDescription(cluster TopicCluster, language string) string {
	if language == "zh" {
		return fmt.Sprintf("分析%s领域的最新发展趋势，基于%d篇相关文章的深度分析", cluster.Name, cluster.Size)
	} else if language == "ja" {
		return fmt.Sprintf("%s分野の最新動向を分析し、%d件の関連記事からの洞察に基づいています", cluster.Name, cluster.Size)
	} else {
		return fmt.Sprintf("Analyzing the latest trends in %s based on insights from %d related articles", cluster.Name, cluster.Size)
	}
}

// inferCategory infers category from keywords
func (ca *ContentAssistant) inferCategory(keywords []string) string {
	if len(keywords) == 0 {
		return "General"
	}

	// Simple category inference based on keywords
	techKeywords := []string{"code", "programming", "development", "技术", "编程", "开发", "プログラミング", "開発", "技術", "コード"}
	businessKeywords := []string{"business", "strategy", "management", "商业", "策略", "管理", "ビジネス", "戦略", "管理", "経営"}
	designKeywords := []string{"design", "ui", "ux", "设计", "界面", "用户", "デザイン", "UI", "UX", "インターフェース", "ユーザー"}

	keywordString := strings.ToLower(strings.Join(keywords, " "))

	for _, keyword := range techKeywords {
		if strings.Contains(keywordString, keyword) {
			return "Technology"
		}
	}

	for _, keyword := range businessKeywords {
		if strings.Contains(keywordString, keyword) {
			return "Business"
		}
	}

	for _, keyword := range designKeywords {
		if strings.Contains(keywordString, keyword) {
			return "Design"
		}
	}

	return "General"
}

// inferDifficulty infers difficulty level from keywords
func (ca *ContentAssistant) inferDifficulty(keywords []string) string {
	advancedKeywords := []string{"advanced", "expert", "complex", "architecture", "高级", "专家", "复杂", "架构", "上級", "エキスパート", "複雑", "アーキテクチャ"}
	beginnerKeywords := []string{"beginner", "intro", "basic", "simple", "初学", "入门", "基础", "简单", "初心者", "入門", "基本", "シンプル"}

	keywordString := strings.ToLower(strings.Join(keywords, " "))

	for _, keyword := range advancedKeywords {
		if strings.Contains(keywordString, keyword) {
			return "advanced"
		}
	}

	for _, keyword := range beginnerKeywords {
		if strings.Contains(keywordString, keyword) {
			return "beginner"
		}
	}

	return "intermediate"
}

// estimateLengthFromKeywords estimates article length from keywords
func (ca *ContentAssistant) estimateLengthFromKeywords(keywords []string) int {
	baseLength := 500

	// More keywords suggest more complex topics
	baseLength += len(keywords) * 50

	// Add some variation
	variation := rand.Intn(200)
	return baseLength + variation
}

// getStopWords returns stop words for a language
func (ca *ContentAssistant) getStopWords(language string) map[string]bool {
	if language == "zh" {
		return map[string]bool{
			"的": true, "了": true, "在": true, "是": true, "我": true, "你": true, "他": true, "她": true, "它": true,
			"们": true, "这": true, "那": true, "一": true, "个": true, "也": true, "就": true, "都": true, "会": true,
			"要": true, "可": true, "以": true, "和": true, "或": true, "但": true, "因": true, "为": true, "所": true,
			"有": true, "没": true, "很": true, "更": true, "最": true, "能": true, "应": true, "该": true, "让": true,
		}
	} else if language == "ja" {
		return map[string]bool{
			"の": true, "に": true, "は": true, "を": true, "が": true, "で": true, "と": true, "から": true, "まで": true,
			"も": true, "や": true, "か": true, "だ": true, "である": true, "です": true, "ます": true, "した": true,
			"する": true, "される": true, "として": true, "について": true, "により": true, "による": true, "では": true,
			"には": true, "での": true, "への": true, "からの": true, "までの": true, "との": true, "という": true,
			"こと": true, "もの": true, "ため": true, "など": true, "また": true, "さらに": true, "しかし": true, "でも": true,
		}
	} else {
		return map[string]bool{
			"the": true, "and": true, "or": true, "but": true, "in": true, "on": true, "at": true, "to": true,
			"for": true, "of": true, "with": true, "by": true, "is": true, "are": true, "was": true, "were": true,
			"be": true, "been": true, "have": true, "has": true, "had": true, "do": true, "does": true, "did": true,
			"will": true, "would": true, "could": true, "should": true, "can": true, "may": true, "might": true,
			"this": true, "that": true, "these": true, "those": true, "a": true, "an": true, "we": true, "you": true,
			"they": true, "he": true, "she": true, "it": true, "i": true, "me": true, "my": true, "your": true,
		}
	}
}

// getTopicCategories returns topic categories for different languages
func (ca *ContentAssistant) getTopicCategories(language string) map[string][]string {
	if language == "zh" {
		return map[string][]string{
			"技术": {"技术", "开发", "编程", "代码", "软件", "硬件", "算法", "数据"},
			"设计": {"设计", "UI", "UX", "界面", "用户体验", "视觉", "交互"},
			"商业": {"商业", "管理", "营销", "策略", "商务", "企业", "创业"},
			"教育": {"教育", "学习", "培训", "教学", "知识", "技能"},
			"生活": {"生活", "健康", "旅游", "美食", "时尚", "娱乐"},
			"科学": {"科学", "研究", "实验", "理论", "发现", "创新"},
		}
	} else if language == "ja" {
		return map[string][]string{
			"技術":      {"技術", "開発", "プログラミング", "コード", "ソフトウェア", "ハードウェア", "アルゴリズム", "データ"},
			"デザイン":    {"デザイン", "UI", "UX", "インターフェース", "ユーザーエクスペリエンス", "ビジュアル", "インタラクション"},
			"ビジネス":    {"ビジネス", "管理", "マーケティング", "戦略", "企業", "スタートアップ"},
			"教育":      {"教育", "学習", "トレーニング", "教授", "知識", "スキル"},
			"ライフスタイル": {"ライフスタイル", "健康", "旅行", "食べ物", "ファッション", "エンターテイメント"},
			"科学":      {"科学", "研究", "実験", "理論", "発見", "イノベーション"},
		}
	} else {
		return map[string][]string{
			"Technology": {"technology", "development", "programming", "code", "software", "hardware", "algorithm", "data"},
			"Design":     {"design", "ui", "ux", "interface", "user experience", "visual", "interaction"},
			"Business":   {"business", "management", "marketing", "strategy", "enterprise", "startup"},
			"Education":  {"education", "learning", "training", "teaching", "knowledge", "skill"},
			"Lifestyle":  {"lifestyle", "health", "travel", "food", "fashion", "entertainment"},
			"Science":    {"science", "research", "experiment", "theory", "discovery", "innovation"},
		}
	}
}

// getTechnicalPatterns returns technical patterns for different languages
func (ca *ContentAssistant) getTechnicalPatterns(language string) map[string][]string {
	return map[string][]string{
		"Programming": {`\b(javascript|python|java|go|rust|typescript)\b`, `\b(api|rest|graphql|microservice)\b`, `\b(react|vue|angular|svelte)\b`},
		"DevOps":      {`\b(docker|kubernetes|ci/cd|jenkins|github actions)\b`, `\b(aws|azure|gcp|cloud)\b`},
		"Database":    {`\b(sql|mysql|postgresql|mongodb|redis)\b`, `\b(database|query|index|schema)\b`},
		"AI/ML":       {`\b(machine learning|ai|neural network|deep learning)\b`, `\b(tensorflow|pytorch|scikit)\b`},
		"Security":    {`\b(security|encryption|authentication|authorization)\b`, `\b(vulnerability|penetration|firewall)\b`},
	}
}
