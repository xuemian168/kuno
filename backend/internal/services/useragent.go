package services

import (
	"regexp"
	"strings"
)

type UserAgentInfo struct {
	Browser        string
	BrowserVersion string
	OS             string
	OSVersion      string
	DeviceType     string // desktop, mobile, tablet
	Platform       string // Windows, macOS, iOS, Android, Linux
}

// ParseUserAgent extracts detailed information from user agent string
func ParseUserAgent(userAgent string) UserAgentInfo {
	info := UserAgentInfo{
		Browser:        "Unknown",
		BrowserVersion: "",
		OS:             "Unknown",
		OSVersion:      "",
		DeviceType:     "desktop",
		Platform:       "Unknown",
	}

	if userAgent == "" {
		return info
	}

	userAgent = strings.TrimSpace(userAgent)
	userAgentLower := strings.ToLower(userAgent)

	// Parse Browser information
	info.Browser, info.BrowserVersion = parseBrowser(userAgent, userAgentLower)
	
	// Parse Operating System information
	info.OS, info.OSVersion, info.Platform = parseOS(userAgent, userAgentLower)
	
	// Determine device type
	info.DeviceType = parseDeviceType(userAgent, userAgentLower)

	return info
}

func parseBrowser(userAgent, userAgentLower string) (string, string) {
	// WeChat Browser (微信内置浏览器)
	if strings.Contains(userAgentLower, "micromessenger") {
		if match := regexp.MustCompile(`micromessenger/([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "WeChat", match[1]
		}
		return "WeChat", ""
	}

	// QQ Browser
	if strings.Contains(userAgentLower, "qqbrowser") {
		if match := regexp.MustCompile(`qqbrowser/([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "QQ Browser", match[1]
		}
		return "QQ Browser", ""
	}

	// UC Browser
	if strings.Contains(userAgentLower, "ucbrowser") {
		if match := regexp.MustCompile(`ucbrowser/([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "UC Browser", match[1]
		}
		return "UC Browser", ""
	}

	// Edge (must be before Chrome as it contains Chrome in UA)
	if strings.Contains(userAgentLower, "edg/") || strings.Contains(userAgentLower, "edge/") {
		if match := regexp.MustCompile(`edg?e?/([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "Edge", match[1]
		}
		return "Edge", ""
	}

	// Chrome (must be before Safari as Chrome contains Safari in UA)
	if strings.Contains(userAgentLower, "chrome/") && !strings.Contains(userAgentLower, "edg") {
		if match := regexp.MustCompile(`chrome/([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "Chrome", match[1]
		}
		return "Chrome", ""
	}

	// Firefox
	if strings.Contains(userAgentLower, "firefox/") {
		if match := regexp.MustCompile(`firefox/([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "Firefox", match[1]
		}
		return "Firefox", ""
	}

	// Safari (must be after Chrome check)
	if strings.Contains(userAgentLower, "safari/") && !strings.Contains(userAgentLower, "chrome") {
		if match := regexp.MustCompile(`version/([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "Safari", match[1]
		}
		return "Safari", ""
	}

	// Opera
	if strings.Contains(userAgentLower, "opera") || strings.Contains(userAgentLower, "opr/") {
		if match := regexp.MustCompile(`(?:opera/|opr/)([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "Opera", match[1]
		}
		return "Opera", ""
	}

	// Internet Explorer
	if strings.Contains(userAgentLower, "msie") || strings.Contains(userAgentLower, "trident") {
		if match := regexp.MustCompile(`msie ([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "Internet Explorer", match[1]
		}
		if strings.Contains(userAgentLower, "trident") {
			return "Internet Explorer", "11"
		}
		return "Internet Explorer", ""
	}

	return "Unknown", ""
}

func parseOS(userAgent, userAgentLower string) (string, string, string) {
	// Windows
	if strings.Contains(userAgentLower, "windows") {
		platform := "Windows"
		if strings.Contains(userAgentLower, "windows nt 10.0") {
			return "Windows 10/11", "10.0", platform
		}
		if strings.Contains(userAgentLower, "windows nt 6.3") {
			return "Windows 8.1", "6.3", platform
		}
		if strings.Contains(userAgentLower, "windows nt 6.2") {
			return "Windows 8", "6.2", platform
		}
		if strings.Contains(userAgentLower, "windows nt 6.1") {
			return "Windows 7", "6.1", platform
		}
		if match := regexp.MustCompile(`windows nt ([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "Windows", match[1], platform
		}
		return "Windows", "", platform
	}

	// macOS
	if strings.Contains(userAgentLower, "mac os x") || strings.Contains(userAgentLower, "macos") {
		platform := "macOS"
		if match := regexp.MustCompile(`mac os x ([0-9_]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			version := strings.ReplaceAll(match[1], "_", ".")
			return "macOS", version, platform
		}
		return "macOS", "", platform
	}

	// iOS
	if strings.Contains(userAgentLower, "iphone") || strings.Contains(userAgentLower, "ipad") || strings.Contains(userAgentLower, "ipod") {
		platform := "iOS"
		if match := regexp.MustCompile(`os ([0-9_]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			version := strings.ReplaceAll(match[1], "_", ".")
			return "iOS", version, platform
		}
		return "iOS", "", platform
	}

	// Android
	if strings.Contains(userAgentLower, "android") {
		platform := "Android"
		if match := regexp.MustCompile(`android ([0-9.]+)`).FindStringSubmatch(userAgentLower); len(match) > 1 {
			return "Android", match[1], platform
		}
		return "Android", "", platform
	}

	// Linux
	if strings.Contains(userAgentLower, "linux") {
		platform := "Linux"
		if strings.Contains(userAgentLower, "ubuntu") {
			return "Ubuntu", "", platform
		}
		if strings.Contains(userAgentLower, "fedora") {
			return "Fedora", "", platform
		}
		if strings.Contains(userAgentLower, "centos") {
			return "CentOS", "", platform
		}
		return "Linux", "", platform
	}

	return "Unknown", "", "Unknown"
}

func parseDeviceType(userAgent, userAgentLower string) string {
	// Mobile devices
	if strings.Contains(userAgentLower, "mobile") || 
	   strings.Contains(userAgentLower, "iphone") || 
	   strings.Contains(userAgentLower, "ipod") ||
	   strings.Contains(userAgentLower, "android") && strings.Contains(userAgentLower, "mobile") {
		return "mobile"
	}

	// Tablets
	if strings.Contains(userAgentLower, "tablet") || 
	   strings.Contains(userAgentLower, "ipad") ||
	   strings.Contains(userAgentLower, "android") && !strings.Contains(userAgentLower, "mobile") {
		return "tablet"
	}

	// Default to desktop
	return "desktop"
}