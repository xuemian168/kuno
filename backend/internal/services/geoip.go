package services

import (
	"encoding/json"
	"fmt"
	"net"
	"net/http"
	"strings"
	"time"
)

type GeoIPInfo struct {
	Country string
	Region  string
	City    string
}

type IPInfoResponse struct {
	IP       string `json:"ip"`
	City     string `json:"city"`
	Region   string `json:"region"`
	Country  string `json:"country"`
	Loc      string `json:"loc"`
	Org      string `json:"org"`
	Timezone string `json:"timezone"`
}

// GetGeoIP retrieves geographic information for an IP address
func GetGeoIP(ipAddress string) GeoIPInfo {
	info := GeoIPInfo{
		Country: "Unknown",
		Region:  "Unknown",
		City:    "Unknown",
	}

	// Skip for local/private IPs
	if isPrivateIP(ipAddress) {
		info.Country = "Local"
		info.Region = "Local"
		info.City = "Local"
		return info
	}

	// Call IPinfo.io API (free tier allows 50k requests/month)
	url := fmt.Sprintf("https://ipinfo.io/%s/json", ipAddress)

	client := &http.Client{
		Timeout: 5 * time.Second,
	}

	resp, err := client.Get(url)
	if err != nil {
		return info
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return info
	}

	var ipInfo IPInfoResponse
	if err := json.NewDecoder(resp.Body).Decode(&ipInfo); err != nil {
		return info
	}

	// Map the response to our structure
	info.Country = cleanString(ipInfo.Country)
	info.Region = cleanString(ipInfo.Region)
	info.City = cleanString(ipInfo.City)

	// Fallback for empty fields
	if info.Country == "" {
		info.Country = "Unknown"
	}
	if info.Region == "" {
		info.Region = "Unknown"
	}
	if info.City == "" {
		info.City = "Unknown"
	}

	return info
}

// GetCountryName returns full country name from country code
func GetCountryName(countryCode string) string {
	countryNames := map[string]string{
		"CN": "China",
		"US": "United States",
		"JP": "Japan",
		"KR": "South Korea",
		"GB": "United Kingdom",
		"DE": "Germany",
		"FR": "France",
		"CA": "Canada",
		"AU": "Australia",
		"IN": "India",
		"BR": "Brazil",
		"RU": "Russia",
		"IT": "Italy",
		"ES": "Spain",
		"NL": "Netherlands",
		"SE": "Sweden",
		"CH": "Switzerland",
		"SG": "Singapore",
		"HK": "Hong Kong",
		"TW": "Taiwan",
		"TH": "Thailand",
		"MY": "Malaysia",
		"ID": "Indonesia",
		"PH": "Philippines",
		"VN": "Vietnam",
	}

	if name, exists := countryNames[strings.ToUpper(countryCode)]; exists {
		return name
	}
	return countryCode
}

// isPrivateIP checks if an IP address is private/local
func isPrivateIP(ipStr string) bool {
	ip := net.ParseIP(ipStr)
	if ip == nil {
		return true
	}

	// Check for loopback
	if ip.IsLoopback() {
		return true
	}

	// Check for private IP ranges
	privateRanges := []string{
		"10.0.0.0/8",
		"172.16.0.0/12",
		"192.168.0.0/16",
		"127.0.0.0/8",
		"169.254.0.0/16", // Link-local
		"::1/128",        // IPv6 loopback
		"fc00::/7",       // IPv6 unique local
		"fe80::/10",      // IPv6 link-local
	}

	for _, rangeStr := range privateRanges {
		_, cidr, err := net.ParseCIDR(rangeStr)
		if err != nil {
			continue
		}
		if cidr.Contains(ip) {
			return true
		}
	}

	return false
}

// cleanString removes unwanted characters and trims whitespace
func cleanString(s string) string {
	s = strings.TrimSpace(s)
	// Remove any potential HTML entities or special characters
	s = strings.ReplaceAll(s, "&amp;", "&")
	s = strings.ReplaceAll(s, "&lt;", "<")
	s = strings.ReplaceAll(s, "&gt;", ">")
	return s
}

// GetGeoIPWithCache retrieves geographic information with basic caching
// In a production environment, you might want to use Redis or similar
var geoCache = make(map[string]GeoIPInfo)
var cacheTimestamp = make(map[string]time.Time)

func GetGeoIPWithCache(ipAddress string) GeoIPInfo {
	// Check cache first (cache for 24 hours)
	if cachedInfo, exists := geoCache[ipAddress]; exists {
		if time.Since(cacheTimestamp[ipAddress]) < 24*time.Hour {
			return cachedInfo
		}
		// Remove expired cache entry
		delete(geoCache, ipAddress)
		delete(cacheTimestamp, ipAddress)
	}

	// Get fresh data
	info := GetGeoIP(ipAddress)

	// Cache the result
	geoCache[ipAddress] = info
	cacheTimestamp[ipAddress] = time.Now()

	return info
}
