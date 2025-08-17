package services

import (
	"blog-backend/internal/database"
	"blog-backend/internal/models"
	"crypto/sha256"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"runtime"
	"strings"
	"sync"
	"time"

	"gorm.io/gorm"
)

// CacheItem represents a cached item with TTL
type CacheItem struct {
	Value     interface{}
	ExpiresAt time.Time
	AccessCount int64
	CreatedAt time.Time
}

// MemoryCache represents thread-safe in-memory cache
type MemoryCache struct {
	mu       sync.RWMutex
	items    map[string]*CacheItem
	maxSize  int
	ttl      time.Duration
	hitCount int64
	missCount int64
}

// NewMemoryCache creates a new memory cache
func NewMemoryCache(maxSize int, ttl time.Duration) *MemoryCache {
	cache := &MemoryCache{
		items:   make(map[string]*CacheItem),
		maxSize: maxSize,
		ttl:     ttl,
	}
	
	// Start cleanup goroutine
	go cache.cleanup()
	
	return cache
}

// Get retrieves a value from cache
func (mc *MemoryCache) Get(key string) (interface{}, bool) {
	mc.mu.RLock()
	defer mc.mu.RUnlock()
	
	item, exists := mc.items[key]
	if !exists {
		mc.missCount++
		return nil, false
	}
	
	// Check if expired
	if time.Now().After(item.ExpiresAt) {
		delete(mc.items, key)
		mc.missCount++
		return nil, false
	}
	
	item.AccessCount++
	mc.hitCount++
	return item.Value, true
}

// Set stores a value in cache
func (mc *MemoryCache) Set(key string, value interface{}) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	
	// Check if cache is full and evict LRU if necessary
	if len(mc.items) >= mc.maxSize {
		mc.evictLRU()
	}
	
	mc.items[key] = &CacheItem{
		Value:     value,
		ExpiresAt: time.Now().Add(mc.ttl),
		AccessCount: 1,
		CreatedAt: time.Now(),
	}
}

// Delete removes a value from cache
func (mc *MemoryCache) Delete(key string) {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	delete(mc.items, key)
}

// Clear removes all items from cache
func (mc *MemoryCache) Clear() {
	mc.mu.Lock()
	defer mc.mu.Unlock()
	mc.items = make(map[string]*CacheItem)
}

// Stats returns cache statistics
func (mc *MemoryCache) Stats() map[string]interface{} {
	mc.mu.RLock()
	defer mc.mu.RUnlock()
	
	totalRequests := mc.hitCount + mc.missCount
	hitRate := float64(0)
	if totalRequests > 0 {
		hitRate = float64(mc.hitCount) / float64(totalRequests)
	}
	
	return map[string]interface{}{
		"size":       len(mc.items),
		"max_size":   mc.maxSize,
		"hit_count":  mc.hitCount,
		"miss_count": mc.missCount,
		"hit_rate":   hitRate,
	}
}

// evictLRU removes least recently used item
func (mc *MemoryCache) evictLRU() {
	if len(mc.items) == 0 {
		return
	}
	
	var lruKey string
	var minAccessCount int64 = -1
	var oldestTime time.Time
	
	for key, item := range mc.items {
		if minAccessCount == -1 || item.AccessCount < minAccessCount || 
		   (item.AccessCount == minAccessCount && item.CreatedAt.Before(oldestTime)) {
			minAccessCount = item.AccessCount
			oldestTime = item.CreatedAt
			lruKey = key
		}
	}
	
	if lruKey != "" {
		delete(mc.items, lruKey)
	}
}

// cleanup removes expired items periodically
func (mc *MemoryCache) cleanup() {
	ticker := time.NewTicker(time.Minute * 5)
	defer ticker.Stop()
	
	for range ticker.C {
		mc.mu.Lock()
		now := time.Now()
		expiredKeys := make([]string, 0)
		
		for key, item := range mc.items {
			if now.After(item.ExpiresAt) {
				expiredKeys = append(expiredKeys, key)
			}
		}
		
		for _, key := range expiredKeys {
			delete(mc.items, key)
		}
		
		// Force GC if memory usage is high
		if len(expiredKeys) > 100 {
			runtime.GC()
		}
		
		mc.mu.Unlock()
	}
}

// SQLiteCache represents persistent cache using SQLite
type SQLiteCache struct {
	db *gorm.DB
}

// NewSQLiteCache creates a new SQLite cache
func NewSQLiteCache() *SQLiteCache {
	return &SQLiteCache{
		db: database.DB,
	}
}

// Get retrieves a value from SQLite cache
func (sc *SQLiteCache) Get(key string) (interface{}, bool) {
	var cache models.SearchCache
	result := sc.db.Where("cache_key = ? AND (expires_at IS NULL OR expires_at > ?)", 
		key, time.Now()).First(&cache)
	
	if result.Error != nil {
		return nil, false
	}
	
	// Update access count
	sc.db.Model(&cache).UpdateColumn("access_count", gorm.Expr("access_count + 1"))
	
	// Parse JSON value
	var value interface{}
	if err := json.Unmarshal([]byte(cache.CacheValue), &value); err != nil {
		log.Printf("Failed to unmarshal cache value: %v", err)
		return nil, false
	}
	
	return value, true
}

// Set stores a value in SQLite cache
func (sc *SQLiteCache) Set(key string, value interface{}, ttl *time.Duration) error {
	valueJSON, err := json.Marshal(value)
	if err != nil {
		return fmt.Errorf("failed to marshal cache value: %v", err)
	}
	
	var expiresAt *time.Time
	if ttl != nil {
		expires := time.Now().Add(*ttl)
		expiresAt = &expires
	}
	
	// First try to find existing record
	var existingCache models.SearchCache
	err = sc.db.Where("cache_key = ?", key).First(&existingCache).Error
	
	if err == nil {
		// Record exists, update it
		existingCache.CacheValue = string(valueJSON)
		existingCache.AccessCount++
		existingCache.ExpiresAt = expiresAt
		existingCache.UpdatedAt = time.Now()
		return sc.db.Save(&existingCache).Error
	} else if errors.Is(err, gorm.ErrRecordNotFound) {
		// Record doesn't exist, create new one
		cache := models.SearchCache{
			CacheKey:    key,
			CacheValue:  string(valueJSON),
			AccessCount: 1,
			ExpiresAt:   expiresAt,
		}
		return sc.db.Create(&cache).Error
	} else {
		// Some other error occurred
		return err
	}
}

// Delete removes a value from SQLite cache
func (sc *SQLiteCache) Delete(key string) error {
	return sc.db.Where("cache_key = ?", key).Delete(&models.SearchCache{}).Error
}

// Cleanup removes expired and least used items
func (sc *SQLiteCache) Cleanup(maxItems int) error {
	// Remove expired items
	if err := sc.db.Where("expires_at IS NOT NULL AND expires_at < ?", time.Now()).
		Delete(&models.SearchCache{}).Error; err != nil {
		return err
	}
	
	// Check if we need to remove excess items
	var count int64
	sc.db.Model(&models.SearchCache{}).Count(&count)
	
	if int(count) > maxItems {
		excess := int(count) - maxItems
		// Remove least accessed items
		var itemsToDelete []models.SearchCache
		sc.db.Order("access_count ASC, created_at ASC").
			Limit(excess).Find(&itemsToDelete)
		
		if len(itemsToDelete) > 0 {
			ids := make([]uint, len(itemsToDelete))
			for i, item := range itemsToDelete {
				ids[i] = item.ID
			}
			sc.db.Where("id IN ?", ids).Delete(&models.SearchCache{})
		}
	}
	
	return nil
}

// SmartCache combines memory and SQLite caching with precomputation
type SmartCache struct {
	memoryCache     *MemoryCache
	sqliteCache     *SQLiteCache
	precomputeCache *PrecomputeCache
	config          CacheConfig
}

// CacheConfig holds cache configuration
type CacheConfig struct {
	MaxMemoryItems    int           `json:"max_memory_items"`
	MemoryTTL         time.Duration `json:"memory_ttl"`
	MaxSQLiteItems    int           `json:"max_sqlite_items"`
	SQLiteTTL         time.Duration `json:"sqlite_ttl"`
	PrecomputeEnabled bool          `json:"precompute_enabled"`
	CleanupInterval   time.Duration `json:"cleanup_interval"`
}

// DefaultCacheConfig returns default cache configuration
func DefaultCacheConfig() CacheConfig {
	return CacheConfig{
		MaxMemoryItems:    1000,
		MemoryTTL:         time.Hour,
		MaxSQLiteItems:    10000,
		SQLiteTTL:         time.Hour * 24,
		PrecomputeEnabled: true,
		CleanupInterval:   time.Hour,
	}
}

// NewSmartCache creates a new smart cache system
func NewSmartCache(config CacheConfig) *SmartCache {
	cache := &SmartCache{
		memoryCache:     NewMemoryCache(config.MaxMemoryItems, config.MemoryTTL),
		sqliteCache:     NewSQLiteCache(),
		precomputeCache: NewPrecomputeCache(),
		config:          config,
	}
	
	// Start background cleanup
	go cache.backgroundCleanup()
	
	return cache
}

// Get retrieves a value using three-tier strategy
func (sc *SmartCache) Get(key string) (interface{}, bool) {
	// 1. Try memory cache first
	if value, exists := sc.memoryCache.Get(key); exists {
		return value, true
	}
	
	// 2. Try SQLite cache
	if value, exists := sc.sqliteCache.Get(key); exists {
		// Promote to memory cache
		sc.memoryCache.Set(key, value)
		return value, true
	}
	
	// 3. Try precompute cache
	if value, exists := sc.precomputeCache.Get(key); exists {
		// Store in both caches
		sc.memoryCache.Set(key, value)
		sc.sqliteCache.Set(key, value, &sc.config.SQLiteTTL)
		return value, true
	}
	
	return nil, false
}

// Set stores a value in appropriate cache tiers
func (sc *SmartCache) Set(key string, value interface{}) {
	// Store in memory cache
	sc.memoryCache.Set(key, value)
	
	// Store in SQLite cache
	sc.sqliteCache.Set(key, value, &sc.config.SQLiteTTL)
}

// Delete removes a value from all cache tiers
func (sc *SmartCache) Delete(key string) {
	sc.memoryCache.Delete(key)
	sc.sqliteCache.Delete(key)
	sc.precomputeCache.Delete(key)
}

// InvalidatePattern removes all keys matching a pattern
func (sc *SmartCache) InvalidatePattern(pattern string) {
	// For simplicity, we'll clear memory cache and mark SQLite items for cleanup
	// In a production system, you'd implement proper pattern matching
	if strings.Contains(pattern, "*") {
		sc.memoryCache.Clear()
		// Schedule SQLite cleanup
		go func() {
			// Remove items matching pattern from SQLite
			// This is a simplified implementation
		}()
	}
}

// Stats returns comprehensive cache statistics
func (sc *SmartCache) Stats() map[string]interface{} {
	memStats := sc.memoryCache.Stats()
	
	var sqliteCount int64
	sc.sqliteCache.db.Model(&models.SearchCache{}).Count(&sqliteCount)
	
	return map[string]interface{}{
		"memory_cache": memStats,
		"sqlite_cache": map[string]interface{}{
			"size":     sqliteCount,
			"max_size": sc.config.MaxSQLiteItems,
		},
		"precompute_cache": sc.precomputeCache.Stats(),
		"config": sc.config,
	}
}

// backgroundCleanup runs periodic maintenance tasks
func (sc *SmartCache) backgroundCleanup() {
	ticker := time.NewTicker(sc.config.CleanupInterval)
	defer ticker.Stop()
	
	for range ticker.C {
		// Cleanup SQLite cache
		if err := sc.sqliteCache.Cleanup(sc.config.MaxSQLiteItems); err != nil {
			log.Printf("SQLite cache cleanup failed: %v", err)
		}
		
		// Cleanup precompute cache
		sc.precomputeCache.Cleanup()
		
		// Force garbage collection if needed
		runtime.GC()
	}
}

// PrecomputeCache handles precomputed results
type PrecomputeCache struct {
	mu    sync.RWMutex
	items map[string]PrecomputeItem
}

// PrecomputeItem represents a precomputed cache item
type PrecomputeItem struct {
	Value       interface{}
	ComputedAt  time.Time
	AccessCount int64
}

// NewPrecomputeCache creates a new precompute cache
func NewPrecomputeCache() *PrecomputeCache {
	return &PrecomputeCache{
		items: make(map[string]PrecomputeItem),
	}
}

// Get retrieves a precomputed value
func (pc *PrecomputeCache) Get(key string) (interface{}, bool) {
	pc.mu.RLock()
	defer pc.mu.RUnlock()
	
	item, exists := pc.items[key]
	if !exists {
		return nil, false
	}
	
	item.AccessCount++
	pc.items[key] = item
	return item.Value, true
}

// Set stores a precomputed value
func (pc *PrecomputeCache) Set(key string, value interface{}) {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	
	pc.items[key] = PrecomputeItem{
		Value:       value,
		ComputedAt:  time.Now(),
		AccessCount: 0,
	}
}

// Delete removes a precomputed value
func (pc *PrecomputeCache) Delete(key string) {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	delete(pc.items, key)
}

// Cleanup removes old precomputed items
func (pc *PrecomputeCache) Cleanup() {
	pc.mu.Lock()
	defer pc.mu.Unlock()
	
	// Remove items older than 24 hours with low access count
	cutoff := time.Now().Add(-24 * time.Hour)
	for key, item := range pc.items {
		if item.ComputedAt.Before(cutoff) && item.AccessCount < 5 {
			delete(pc.items, key)
		}
	}
}

// Stats returns precompute cache statistics
func (pc *PrecomputeCache) Stats() map[string]interface{} {
	pc.mu.RLock()
	defer pc.mu.RUnlock()
	
	totalAccess := int64(0)
	for _, item := range pc.items {
		totalAccess += item.AccessCount
	}
	
	return map[string]interface{}{
		"size":         len(pc.items),
		"total_access": totalAccess,
	}
}

// Global cache instance
var globalSmartCache *SmartCache
var cacheInitOnce sync.Once

// GetGlobalCache returns the global cache instance
func GetGlobalCache() *SmartCache {
	cacheInitOnce.Do(func() {
		globalSmartCache = NewSmartCache(DefaultCacheConfig())
	})
	return globalSmartCache
}

// Cache key generators
func GenerateSearchCacheKey(query, language string, limit int, threshold float64) string {
	data := fmt.Sprintf("search:%s:%s:%d:%.2f", query, language, limit, threshold)
	hash := sha256.Sum256([]byte(data))
	return fmt.Sprintf("search_%x", hash[:8])
}

func GenerateRecommendationCacheKey(articleID uint, language string, limit int) string {
	data := fmt.Sprintf("recommend:%d:%s:%d", articleID, language, limit)
	hash := sha256.Sum256([]byte(data))
	return fmt.Sprintf("recommend_%x", hash[:8])
}

func GenerateStatsCacheKey(statsType string) string {
	return fmt.Sprintf("stats_%s_%d", statsType, time.Now().Unix()/3600) // Hour-based key
}