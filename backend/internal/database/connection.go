package database

import (
	"blog-backend/internal/models"
	"log"
	"os"
	"strings"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

var DB *gorm.DB

func InitDatabase() {
	dbPath := getEnv("DB_PATH", "./data/blog.db")

	// Enhanced logging for database initialization
	log.Printf("🔍 Database initialization starting...")
	log.Printf("📁 Database path: %s", dbPath)

	// Check if database file exists
	if _, err := os.Stat(dbPath); os.IsNotExist(err) {
		log.Printf("📄 Database file does not exist, will be created: %s", dbPath)
	} else if err != nil {
		log.Printf("⚠️ Error checking database file: %v", err)
	} else {
		info, _ := os.Stat(dbPath)
		log.Printf("📊 Existing database file found: %s (size: %d bytes)", dbPath, info.Size())
	}

	var err error
	DB, err = gorm.Open(sqlite.Open(dbPath), &gorm.Config{})
	if err != nil {
		log.Fatal("Failed to connect database:", err)
	}

	err = DB.AutoMigrate(&models.Article{}, &models.Category{}, &models.SiteSettings{}, &models.User{}, &models.MediaLibrary{}, &models.ArticleTranslation{}, &models.CategoryTranslation{}, &models.SiteSettingsTranslation{}, &models.ArticleView{}, &models.SocialMedia{})
	if err != nil {
		log.Fatal("Failed to migrate database:", err)
	}

	// Initialize default site settings if none exist
	var settingsCount int64
	DB.Model(&models.SiteSettings{}).Count(&settingsCount)
	log.Printf("📊 Found %d site settings records", settingsCount)
	if settingsCount == 0 {
		defaultSettings := models.SiteSettings{
			SiteTitle:          "KUNO",
			SiteSubtitle:       "Your mind embedded everywhere",
			FooterText:         "© 2025 KUNO",
			ShowViewCount:      true,
			EnableSoundEffects: true,
			LogoURL:            "",
			FaviconURL:         "",
		}
		DB.Create(&defaultSettings)
		log.Println("Default site settings created")
	} else {
		// Update existing settings to ensure all fields have proper defaults
		var existingSettings models.SiteSettings
		if err := DB.First(&existingSettings).Error; err == nil {
			// Only update if the field is missing/empty and we haven't set it before
			updated := false
			if existingSettings.FooterText == "" {
				existingSettings.FooterText = "© 2025 KUNO"
				updated = true
			}
			if updated {
				DB.Save(&existingSettings)
				log.Println("Site settings updated with missing defaults")
			}
		}
	}

	// Initialize default admin user if none exist
	var userCount int64
	DB.Model(&models.User{}).Count(&userCount)
	log.Printf("👥 Found %d user records", userCount)
	if userCount == 0 {
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("xuemian168"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("Failed to hash password:", err)
		}

		defaultUser := models.User{
			Username: "admin",
			Password: string(hashedPassword),
			IsAdmin:  true,
		}
		DB.Create(&defaultUser)
		log.Println("Default admin user created (username: admin)")
	}

	// Initialize default content (category and hello world article)
	initializeDefaultContent()

	log.Println("Database connected and migrated successfully")

	// Check recovery mode
	checkRecoveryMode()
}

// checkRecoveryMode handles password recovery functionality
func checkRecoveryMode() {
	recoveryMode := strings.ToLower(getEnv("RECOVERY_MODE", "false"))

	if recoveryMode == "true" {
		log.Println("⚠️  RECOVERY MODE ACTIVATED ⚠️")
		log.Println("🔑 Resetting admin password to default...")

		// Reset admin password to default
		var adminUser models.User
		result := DB.Where("username = ?", "admin").First(&adminUser)
		if result.Error != nil {
			log.Fatal("❌ Recovery failed: Admin user not found")
		}

		// Hash the default password
		hashedPassword, err := bcrypt.GenerateFromPassword([]byte("xuemian168"), bcrypt.DefaultCost)
		if err != nil {
			log.Fatal("❌ Recovery failed: Unable to hash password")
		}

		// Update admin password
		adminUser.Password = string(hashedPassword)
		if err := DB.Save(&adminUser).Error; err != nil {
			log.Fatal("❌ Recovery failed: Unable to update password")
		}

		log.Println("✅ Admin password has been reset to: xuemian168")
		log.Println("📋 Username: admin")
		log.Println("🔒 Password: xuemian168")
		log.Println("")
		log.Println("⚠️  SECURITY WARNING ⚠️")
		log.Println("🛑 Recovery mode is still ENABLED!")
		log.Println("🔧 You MUST disable recovery mode to start the server:")
		log.Println("   1. Set RECOVERY_MODE=false in your .env file")
		log.Println("   2. Restart the application")
		log.Println("   3. Login with the reset credentials")
		log.Println("   4. Change your password immediately")
		log.Println("")
		log.Fatal("🚫 Server startup blocked due to active recovery mode")
	}
}

// IsRecoveryMode returns true if recovery mode is currently enabled
func IsRecoveryMode() bool {
	return strings.ToLower(getEnv("RECOVERY_MODE", "false")) == "true"
}

func getEnv(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}

// initializeDefaultContent creates default category and hello world article if none exist
func initializeDefaultContent() {
	// Check if we already have categories
	var categoryCount int64
	DB.Model(&models.Category{}).Count(&categoryCount)
	log.Printf("📂 Found %d category records", categoryCount)

	// Check if we already have articles
	var articleCount int64
	DB.Model(&models.Article{}).Count(&articleCount)
	log.Printf("📝 Found %d article records", articleCount)

	// Only initialize if we have no categories and no articles
	if categoryCount == 0 && articleCount == 0 {
		log.Printf("🆕 No existing content found, initializing default content...")
		// Create default category
		defaultCategory := models.Category{
			Name:        "Welcome",
			Description: "Welcome to my blog",
		}
		if err := DB.Create(&defaultCategory).Error; err != nil {
			log.Printf("Failed to create default category: %v", err)
			return
		}

		// Create category translations
		categoryTranslations := []models.CategoryTranslation{
			{
				CategoryID:  defaultCategory.ID,
				Language:    "zh",
				Name:        "欢迎",
				Description: "欢迎来到我的博客",
			},
			{
				CategoryID:  defaultCategory.ID,
				Language:    "en",
				Name:        "Welcome",
				Description: "Welcome to my blog",
			},
			{
				CategoryID:  defaultCategory.ID,
				Language:    "ja",
				Name:        "ようこそ",
				Description: "私のブログへようこそ",
			},
		}

		for _, translation := range categoryTranslations {
			if err := DB.Create(&translation).Error; err != nil {
				log.Printf("Failed to create category translation for %s: %v", translation.Language, err)
			}
		}

		// Create Hello World article with Markdown test content
		helloWorldArticle := models.Article{
			Title:          "Hello World! 你好世界! こんにちは世界!",
			Content:        getHelloWorldContent(),
			ContentType:    "markdown",
			Summary:        "Welcome to my blog! This is a sample article showcasing Markdown features and multilingual support.",
			CategoryID:     defaultCategory.ID,
			DefaultLang:    "en",
			SEOTitle:       "Hello World - Welcome to My Blog",
			SEODescription: "A sample Hello World article demonstrating Markdown features and multilingual support in this blog system.",
			SEOKeywords:    "hello world, markdown, blog, multilingual, sample",
			SEOSlug:        "hello-world",
		}

		if err := DB.Create(&helloWorldArticle).Error; err != nil {
			log.Printf("Failed to create Hello World article: %v", err)
			return
		}

		// Create article translations
		articleTranslations := []models.ArticleTranslation{
			{
				ArticleID: helloWorldArticle.ID,
				Language:  "zh",
				Title:     "你好世界！欢迎来到我的博客",
				Content:   getHelloWorldContentZh(),
				Summary:   "欢迎来到我的博客！这是一篇展示Markdown功能和多语言支持的示例文章。",
			},
			{
				ArticleID: helloWorldArticle.ID,
				Language:  "en",
				Title:     "Hello World! Welcome to My Blog",
				Content:   getHelloWorldContent(),
				Summary:   "Welcome to my blog! This is a sample article showcasing Markdown features and multilingual support.",
			},
			{
				ArticleID: helloWorldArticle.ID,
				Language:  "ja",
				Title:     "こんにちは世界！私のブログへようこそ",
				Content:   getHelloWorldContentJa(),
				Summary:   "私のブログへようこそ！これはMarkdown機能と多言語サポートを紹介するサンプル記事です。",
			},
		}

		for _, translation := range articleTranslations {
			if err := DB.Create(&translation).Error; err != nil {
				log.Printf("Failed to create article translation for %s: %v", translation.Language, err)
			}
		}

		log.Println("Default content initialized: Welcome category and Hello World article created")
	} else {
		log.Printf("✅ Existing content found, skipping default content initialization (categories: %d, articles: %d)", categoryCount, articleCount)
	}
}

// getHelloWorldContent returns the English Hello World content with Markdown tests
func getHelloWorldContent() string {
	content := "# Hello World! 🌍\n\n"
	content += "Welcome to my blog! This is a **Hello World** article that demonstrates various Markdown features and capabilities.\n\n"

	content += "## About This Blog\n\n"
	content += "This blog system supports:\n"
	content += "- ✅ **Multilingual content** (中文, English, 日本語)\n"
	content += "- ✅ **Markdown rendering** with syntax highlighting\n"
	content += "- ✅ **Responsive design** for all devices\n"
	content += "- ✅ **Dark/Light theme** toggle\n"
	content += "- ✅ **SEO optimization** with meta tags\n"
	content += "- ✅ **Admin panel** for content management\n\n"

	content += "## Markdown Features Demo\n\n"
	content += "### Text Formatting\n\n"
	content += "This paragraph contains **bold text**, *italic text*, ~~strikethrough text~~, and `inline code`.\n\n"
	content += "You can also combine ***bold and italic*** text.\n\n"

	content += "### Lists\n\n"
	content += "**Unordered List:**\n"
	content += "- Item 1\n"
	content += "- Item 2\n"
	content += "  - Nested item 2.1\n"
	content += "  - Nested item 2.2\n"
	content += "- Item 3\n\n"

	content += "**Task List:**\n"
	content += "- [x] Completed task\n"
	content += "- [ ] Pending task\n"
	content += "- [ ] Another pending task\n\n"

	content += "### Code Examples\n\n"
	content += "**Inline code:** `console.log('Hello World!')`\n\n"
	content += "**JavaScript example:**\n\n"
	content += "```javascript\n"
	content += "// JavaScript example\n"
	content += "function greetWorld(name) {\n"
	content += "  const message = `Hello, ${name}! Welcome to my blog.`;\n"
	content += "  console.log(message);\n"
	content += "  return message;\n"
	content += "}\n\n"
	content += "greetWorld('World');\n"
	content += "```\n\n"

	content += "### Tables\n\n"
	content += "| Language | Greeting | Country |\n"
	content += "|----------|----------|----------|\n"
	content += "| English  | Hello World | 🇺🇸 USA |\n"
	content += "| 中文     | 你好世界 | 🇨🇳 China |\n"
	content += "| 日本語   | こんにちは世界 | 🇯🇵 Japan |\n\n"

	content += "### Blockquotes\n\n"
	content += "> \"The best way to predict the future is to create it.\"\n"
	content += "> \n"
	content += "> — *Abraham Lincoln*\n\n"

	content += "### Horizontal Rules\n\n"
	content += "---\n\n"

	content += "## Getting Started\n\n"
	content += "To create your own content:\n\n"
	content += "1. **Access the Admin Panel** at `/admin`\n"
	content += "2. **Login** with your credentials\n"
	content += "3. **Create Categories** to organize your content\n"
	content += "4. **Write Articles** using the Markdown editor\n"
	content += "5. **Publish** and share your thoughts with the world!\n\n"

	content += "---\n\n"
	content += "**Happy blogging!** 🚀\n\n"
	content += "*This Hello World article was automatically generated during system initialization.*"

	return content
}

// getHelloWorldContentZh returns the Chinese Hello World content
func getHelloWorldContentZh() string {
	content := "# 你好世界！🌍\n\n"
	content += "欢迎来到我的博客！这是一篇展示各种Markdown功能和特性的**你好世界**文章。\n\n"

	content += "## 关于这个博客\n\n"
	content += "这个博客系统支持：\n"
	content += "- ✅ **多语言内容**（中文，English，日本語）\n"
	content += "- ✅ **Markdown渲染**和语法高亮\n"
	content += "- ✅ **响应式设计**适配所有设备\n"
	content += "- ✅ **深色/浅色主题**切换\n"
	content += "- ✅ **SEO优化**和元标签\n"
	content += "- ✅ **管理面板**进行内容管理\n\n"

	content += "## Markdown功能演示\n\n"
	content += "### 文本格式化\n\n"
	content += "这段文字包含**粗体文本**，*斜体文本*，~~删除线文本~~，以及`行内代码`。\n\n"
	content += "你也可以组合使用***粗体和斜体***文本。\n\n"

	content += "### 列表\n\n"
	content += "**无序列表：**\n"
	content += "- 项目 1\n"
	content += "- 项目 2\n"
	content += "  - 嵌套项目 2.1\n"
	content += "  - 嵌套项目 2.2\n"
	content += "- 项目 3\n\n"

	content += "**任务列表：**\n"
	content += "- [x] 已完成任务\n"
	content += "- [ ] 待完成任务\n"
	content += "- [ ] 另一个待完成任务\n\n"

	content += "### 代码示例\n\n"
	content += "**行内代码：** `console.log('你好世界！')`\n\n"
	content += "**JavaScript 示例：**\n\n"
	content += "```javascript\n"
	content += "// JavaScript 示例\n"
	content += "function greetWorld(name) {\n"
	content += "  const message = `你好，${name}！欢迎来到我的博客。`;\n"
	content += "  console.log(message);\n"
	content += "  return message;\n"
	content += "}\n\n"
	content += "greetWorld('世界');\n"
	content += "```\n\n"

	content += "### 表格\n\n"
	content += "| 语言 | 问候语 | 国家 |\n"
	content += "|------|--------|------|\n"
	content += "| 中文 | 你好世界 | 🇨🇳 中国 |\n"
	content += "| English | Hello World | 🇺🇸 美国 |\n"
	content += "| 日本語 | こんにちは世界 | 🇯🇵 日本 |\n\n"

	content += "### 引用\n\n"
	content += "> \"预测未来的最好方法就是创造未来。\"\n"
	content += "> \n"
	content += "> — *亚伯拉罕·林肯*\n\n"

	content += "---\n\n"
	content += "**祝你写作愉快！** 🚀\n\n"
	content += "*这篇你好世界文章是在系统初始化时自动生成的。*"

	return content
}

// getHelloWorldContentJa returns the Japanese Hello World content
func getHelloWorldContentJa() string {
	content := "# こんにちは世界！🌍\n\n"
	content += "私のブログへようこそ！これは様々なMarkdown機能と特性を紹介する**こんにちは世界**の記事です。\n\n"

	content += "## このブログについて\n\n"
	content += "このブログシステムは以下をサポートしています：\n"
	content += "- ✅ **多言語コンテンツ**（中文、English、日本語）\n"
	content += "- ✅ **Markdownレンダリング**とシンタックスハイライト\n"
	content += "- ✅ **レスポンシブデザイン**全デバイス対応\n"
	content += "- ✅ **ダーク/ライトテーマ**切り替え\n"
	content += "- ✅ **SEO最適化**とメタタグ\n"
	content += "- ✅ **管理パネル**でコンテンツ管理\n\n"

	content += "## Markdown機能デモ\n\n"
	content += "### テキストフォーマット\n\n"
	content += "この段落には**太字テキスト**、*斜体テキスト*、~~取り消し線テキスト~~、そして`インラインコード`が含まれています。\n\n"
	content += "***太字と斜体***を組み合わせることもできます。\n\n"

	content += "### リスト\n\n"
	content += "**順序なしリスト：**\n"
	content += "- アイテム 1\n"
	content += "- アイテム 2\n"
	content += "  - ネストされたアイテム 2.1\n"
	content += "  - ネストされたアイテム 2.2\n"
	content += "- アイテム 3\n\n"

	content += "**タスクリスト：**\n"
	content += "- [x] 完了したタスク\n"
	content += "- [ ] 未完了のタスク\n"
	content += "- [ ] 別の未完了タスク\n\n"

	content += "### コード例\n\n"
	content += "**インラインコード：** `console.log('こんにちは世界！')`\n\n"
	content += "**JavaScript 例：**\n\n"
	content += "```javascript\n"
	content += "// JavaScript 例\n"
	content += "function greetWorld(name) {\n"
	content += "  const message = `こんにちは、${name}！私のブログへようこそ。`;\n"
	content += "  console.log(message);\n"
	content += "  return message;\n"
	content += "}\n\n"
	content += "greetWorld('世界');\n"
	content += "```\n\n"

	content += "### テーブル\n\n"
	content += "| 言語 | 挨拶 | 国 |\n"
	content += "|------|------|-----|\n"
	content += "| 日本語 | こんにちは世界 | 🇯🇵 日本 |\n"
	content += "| English | Hello World | 🇺🇸 アメリカ |\n"
	content += "| 中文 | 你好世界 | 🇨🇳 中国 |\n\n"

	content += "### 引用\n\n"
	content += "> \"未来を予測する最良の方法は、それを創造することである。\"\n"
	content += "> \n"
	content += "> — *エイブラハム・リンカーン*\n\n"

	content += "---\n\n"
	content += "**楽しいブログ生活を！** 🚀\n\n"
	content += "*このこんにちは世界記事は、システム初期化時に自動生成されました。*"

	return content
}
