package api

import (
	"encoding/json"
	"fmt"
	"net/http"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"time"
)

// Version represents a stable semantic version (major.minor.patch).
type Version struct {
	Major int    `json:"major"`
	Minor int    `json:"minor"`
	Patch int    `json:"patch"`
	Raw   string `json:"raw"`
}

// DockerHubResponse represents a page of tags from the Docker Hub REST API.
type DockerHubResponse struct {
	Results []DockerHubTag `json:"results"`
}

type DockerHubTag struct {
	Name        string    `json:"name"`
	LastUpdated time.Time `json:"last_updated"`
	ImageSize   int64     `json:"full_size"`
}

// GitHubRelease represents the response from the GitHub Releases API.
type GitHubRelease struct {
	TagName     string    `json:"tag_name"`
	Name        string    `json:"name"`
	Body        string    `json:"body"`
	PublishedAt time.Time `json:"published_at"`
	HTMLURL     string    `json:"html_url"`
	Draft       bool      `json:"draft"`
	Prerelease  bool      `json:"prerelease"`
}

// UpdateInfo describes the newest published release compared with the running version.
// Every field comes from GitHub or Docker Hub; nothing is estimated.
type UpdateInfo struct {
	HasUpdate      bool       `json:"has_update"`
	CurrentVersion string     `json:"current_version"`
	LatestVersion  string     `json:"latest_version"`
	ReleaseDate    *time.Time `json:"release_date,omitempty"`
	ImageSize      int64      `json:"image_size,omitempty"`
	Changelog      []string   `json:"changelog,omitempty"`
	ReleaseURL     string     `json:"release_url,omitempty"`
	Source         string     `json:"source"`
	CheckedAt      time.Time  `json:"checked_at"`
}

const (
	updateSourceGitHub    = "github"
	updateSourceDockerHub = "docker_hub"
	maxChangelogItems     = 12
)

var (
	dockerHubAPIURL = "https://hub.docker.com/v2/repositories/ictrun/kuno/tags"
	dockerImageName = "ictrun/kuno"
	gitHubAPIURL    = "https://api.github.com/repos/xuemian168/kuno/releases/latest"

	updateHTTPClient = &http.Client{Timeout: 10 * time.Second}

	// Only plain releases count; tags such as "1.4.6-rc.1", "1.4" or "latest" are ignored.
	stableVersionPattern = regexp.MustCompile(`^v?(\d+)\.(\d+)\.(\d+)$`)

	updates = &updateChecker{ttl: time.Hour, fetch: fetchUpdateInfo}
)

// updateChecker caches the last successful check. The mutex also makes concurrent
// requests share one upstream lookup instead of each hitting the GitHub rate limit.
type updateChecker struct {
	mu        sync.Mutex
	cached    *UpdateInfo
	expiresAt time.Time
	ttl       time.Duration
	fetch     func(currentVersion string) (*UpdateInfo, error)
}

// Get returns a copy of the cached update info, refreshing it when expired.
// Failed checks are not cached.
func (u *updateChecker) Get(currentVersion string) (UpdateInfo, error) {
	u.mu.Lock()
	defer u.mu.Unlock()

	if u.cached != nil && time.Now().Before(u.expiresAt) {
		return *u.cached, nil
	}

	info, err := u.fetch(currentVersion)
	if err != nil {
		return UpdateInfo{}, err
	}
	u.cached = info
	u.expiresAt = time.Now().Add(u.ttl)
	return *info, nil
}

// Clear drops the cached result so the next Get queries upstream again.
func (u *updateChecker) Clear() {
	u.mu.Lock()
	defer u.mu.Unlock()
	u.cached = nil
	u.expiresAt = time.Time{}
}

// fetchUpdateInfo prefers the latest GitHub Release and falls back to the newest
// stable Docker Hub tag. It fails only when neither source gives an answer.
func fetchUpdateInfo(currentVersion string) (*UpdateInfo, error) {
	current, err := parseVersion(currentVersion)
	if err != nil {
		return nil, fmt.Errorf("running version %q is not a release version", currentVersion)
	}

	release, gitHubErr := fetchLatestGitHubRelease()
	if gitHubErr == nil {
		info, err := updateInfoFromRelease(current, release)
		if err == nil {
			return info, nil
		}
		gitHubErr = err
	}

	info, dockerErr := fetchLatestDockerTagInfo(current)
	if dockerErr == nil {
		return info, nil
	}

	return nil, fmt.Errorf("GitHub Releases: %v; Docker Hub: %v", gitHubErr, dockerErr)
}

// getJSON performs a GET request and decodes a 200 JSON response into out.
func getJSON(url string, headers map[string]string, out any) error {
	req, err := http.NewRequest(http.MethodGet, url, nil)
	if err != nil {
		return err
	}
	req.Header.Set("User-Agent", "kuno-update-checker")
	for key, value := range headers {
		req.Header.Set(key, value)
	}

	resp, err := updateHTTPClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return fmt.Errorf("HTTP %d", resp.StatusCode)
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

// fetchLatestGitHubRelease fetches the latest published, non-prerelease GitHub Release.
func fetchLatestGitHubRelease() (GitHubRelease, error) {
	var release GitHubRelease
	if err := getJSON(gitHubAPIURL, map[string]string{"Accept": "application/vnd.github+json"}, &release); err != nil {
		return GitHubRelease{}, err
	}
	if release.TagName == "" || release.Draft || release.Prerelease {
		return GitHubRelease{}, fmt.Errorf("latest release is not a stable release")
	}
	return release, nil
}

// fetchDockerTagInfo fetches metadata for one Docker Hub tag (tags have no "v" prefix).
func fetchDockerTagInfo(tagName string) (DockerHubTag, error) {
	var tag DockerHubTag
	err := getJSON(dockerHubAPIURL+"/"+tagName, nil, &tag)
	return tag, err
}

// fetchLatestDockerTagInfo builds update info from the newest stable Docker Hub tag.
func fetchLatestDockerTagInfo(current Version) (*UpdateInfo, error) {
	var page DockerHubResponse
	if err := getJSON(dockerHubAPIURL+"?page_size=100", nil, &page); err != nil {
		return nil, err
	}

	latestTag, latest, ok := findLatestTag(page.Results)
	if !ok {
		return nil, fmt.Errorf("no stable version tag found")
	}

	info := newUpdateInfo(current, latest, updateSourceDockerHub)
	info.ImageSize = latestTag.ImageSize
	if !latestTag.LastUpdated.IsZero() {
		lastUpdated := latestTag.LastUpdated
		info.ReleaseDate = &lastUpdated
	}
	return info, nil
}

// findLatestTag returns the tag with the highest stable version.
func findLatestTag(tags []DockerHubTag) (DockerHubTag, Version, bool) {
	type candidate struct {
		tag     DockerHubTag
		version Version
	}
	var candidates []candidate
	for _, tag := range tags {
		if version, err := parseVersion(tag.Name); err == nil {
			candidates = append(candidates, candidate{tag: tag, version: version})
		}
	}
	if len(candidates) == 0 {
		return DockerHubTag{}, Version{}, false
	}

	sort.Slice(candidates, func(i, j int) bool {
		return compareVersions(candidates[i].version, candidates[j].version) > 0
	})
	return candidates[0].tag, candidates[0].version, true
}

// updateInfoFromRelease builds update info from GitHub Release metadata,
// adding the image size from the matching Docker Hub tag when available.
func updateInfoFromRelease(current Version, release GitHubRelease) (*UpdateInfo, error) {
	latest, err := parseVersion(release.TagName)
	if err != nil {
		return nil, fmt.Errorf("release tag %q is not a release version", release.TagName)
	}

	info := newUpdateInfo(current, latest, updateSourceGitHub)
	info.ReleaseURL = release.HTMLURL
	if !release.PublishedAt.IsZero() {
		publishedAt := release.PublishedAt
		info.ReleaseDate = &publishedAt
	}
	if tag, err := fetchDockerTagInfo(latest.Raw); err == nil {
		info.ImageSize = tag.ImageSize
	}
	if info.HasUpdate {
		info.Changelog = extractReleaseChangelog(release.Body)
	}
	return info, nil
}

func newUpdateInfo(current, latest Version, source string) *UpdateInfo {
	return &UpdateInfo{
		HasUpdate:      compareVersions(latest, current) > 0,
		CurrentVersion: current.Raw,
		LatestVersion:  latest.Raw,
		Source:         source,
		CheckedAt:      time.Now().UTC(),
	}
}

// extractReleaseChangelog converts GitHub release notes into short UI changelog items.
func extractReleaseChangelog(body string) []string {
	if body == "" {
		return nil
	}

	skipSections := map[string]bool{
		"docker image":        true,
		"quick deploy":        true,
		"build information":   true,
		"version information": true,
		"links":               true,
	}

	var items []string
	skipSection := false

	for _, line := range strings.Split(body, "\n") {
		trimmed := strings.TrimSpace(line)
		if trimmed == "" {
			continue
		}

		if strings.HasPrefix(trimmed, "##") {
			heading := strings.TrimSpace(strings.TrimLeft(trimmed, "#"))
			heading = strings.ToLower(strings.TrimSuffix(heading, ":"))
			skipSection = skipSections[heading]
			continue
		}

		if skipSection || !strings.HasPrefix(trimmed, "- ") {
			continue
		}

		item := cleanReleaseNoteItem(strings.TrimSpace(strings.TrimPrefix(trimmed, "- ")))
		if item != "" {
			items = append(items, item)
		}
		if len(items) >= maxChangelogItems {
			break
		}
	}

	return items
}

func cleanReleaseNoteItem(item string) string {
	for _, marker := range []string{"**", "__", "`"} {
		item = strings.ReplaceAll(item, marker, "")
	}
	return strings.TrimSpace(item)
}

// parseVersion parses a stable "1.2.3" or "v1.2.3" version. Raw has no "v" prefix.
func parseVersion(versionStr string) (Version, error) {
	matches := stableVersionPattern.FindStringSubmatch(strings.TrimSpace(versionStr))
	if matches == nil {
		return Version{}, fmt.Errorf("invalid version format: %s", versionStr)
	}

	parts := make([]int, 3)
	for i := range parts {
		n, err := strconv.Atoi(matches[i+1])
		if err != nil {
			return Version{}, err
		}
		parts[i] = n
	}

	return Version{
		Major: parts[0],
		Minor: parts[1],
		Patch: parts[2],
		Raw:   fmt.Sprintf("%d.%d.%d", parts[0], parts[1], parts[2]),
	}, nil
}

// compareVersions returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal.
func compareVersions(v1, v2 Version) int {
	for _, diff := range []int{v1.Major - v2.Major, v1.Minor - v2.Minor, v1.Patch - v2.Patch} {
		if diff > 0 {
			return 1
		}
		if diff < 0 {
			return -1
		}
	}
	return 0
}
