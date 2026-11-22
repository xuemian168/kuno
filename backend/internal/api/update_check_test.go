package api

import (
	"errors"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

// stubUpstreams points the update checker at fake GitHub and Docker Hub servers.
func stubUpstreams(t *testing.T, github, dockerHub http.HandlerFunc) {
	t.Helper()
	gh := httptest.NewServer(github)
	hub := httptest.NewServer(dockerHub)
	oldGitHub, oldHub := gitHubAPIURL, dockerHubAPIURL
	gitHubAPIURL = gh.URL + "/releases/latest"
	dockerHubAPIURL = hub.URL + "/tags"
	t.Cleanup(func() {
		gh.Close()
		hub.Close()
		gitHubAPIURL, dockerHubAPIURL = oldGitHub, oldHub
	})
}

func TestParseVersionAcceptsOnlyStableReleases(t *testing.T) {
	for _, input := range []string{"1.4.8", "v1.4.8", " 1.4.8 "} {
		v, err := parseVersion(input)
		if err != nil || v.Raw != "1.4.8" {
			t.Errorf("parseVersion(%q) = %+v, %v; want 1.4.8", input, v, err)
		}
	}
	for _, input := range []string{"1.4.6-rc.1", "1.4", "latest", "1.4.8.1", ""} {
		if _, err := parseVersion(input); err == nil {
			t.Errorf("parseVersion(%q) should fail", input)
		}
	}
}

func TestFindLatestTagSkipsPrereleasesAndComparesNumerically(t *testing.T) {
	tags := []DockerHubTag{{Name: "latest"}, {Name: "1.9.9"}, {Name: "1.10.0"}, {Name: "1.11.0-rc.1"}, {Name: "1.10"}}
	tag, version, ok := findLatestTag(tags)
	if !ok || tag.Name != "1.10.0" || version.Raw != "1.10.0" {
		t.Fatalf("got %q %q %v, want 1.10.0", tag.Name, version.Raw, ok)
	}
}

func TestFetchUpdateInfoFromGitHubRelease(t *testing.T) {
	var dockerTagPath string
	stubUpstreams(t,
		func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`{"tag_name":"v1.5.0","published_at":"2026-11-20T10:00:00Z","html_url":"https://example.test/v1.5.0","body":"## Fixed\n- Fixed a bug.\n## Docker Image\n- docker pull ictrun/kuno:1.5.0"}`))
		},
		func(w http.ResponseWriter, r *http.Request) {
			dockerTagPath = r.URL.Path
			w.Write([]byte(`{"name":"1.5.0","full_size":154610137}`))
		},
	)

	info, err := fetchUpdateInfo("1.4.8")
	if err != nil {
		t.Fatal(err)
	}
	if !info.HasUpdate || info.LatestVersion != "1.5.0" || info.Source != updateSourceGitHub {
		t.Fatalf("unexpected info: %+v", info)
	}
	if dockerTagPath != "/tags/1.5.0" {
		t.Errorf("Docker Hub tag looked up as %q; tags have no v prefix", dockerTagPath)
	}
	if info.ImageSize != 154610137 {
		t.Errorf("image size = %d", info.ImageSize)
	}
	if info.ReleaseDate == nil || !info.ReleaseDate.Equal(time.Date(2026, 11, 20, 10, 0, 0, 0, time.UTC)) {
		t.Errorf("release date = %v", info.ReleaseDate)
	}
	if len(info.Changelog) != 1 || info.Changelog[0] != "Fixed a bug." {
		t.Errorf("changelog = %#v", info.Changelog)
	}
}

func TestFetchUpdateInfoFallsBackToDockerHubWithRealMetadata(t *testing.T) {
	stubUpstreams(t,
		func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusForbidden) },
		func(w http.ResponseWriter, r *http.Request) {
			w.Write([]byte(`{"results":[{"name":"latest"},{"name":"1.5.1-rc.1"},{"name":"1.5.0","last_updated":"2026-11-21T08:00:00Z","full_size":1234}]}`))
		},
	)

	info, err := fetchUpdateInfo("1.4.8")
	if err != nil {
		t.Fatal(err)
	}
	if info.Source != updateSourceDockerHub || info.LatestVersion != "1.5.0" || !info.HasUpdate {
		t.Fatalf("unexpected info: %+v", info)
	}
	if info.ImageSize != 1234 || info.ReleaseDate == nil || info.ReleaseDate.Day() != 21 {
		t.Errorf("metadata not taken from Docker Hub: %+v", info)
	}
	if len(info.Changelog) != 0 {
		t.Errorf("Docker Hub fallback must not invent a changelog: %#v", info.Changelog)
	}
}

func TestFetchUpdateInfoFailsWhenBothSourcesFail(t *testing.T) {
	stubUpstreams(t,
		func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusInternalServerError) },
		func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusTooManyRequests) },
	)

	info, err := fetchUpdateInfo("1.4.8")
	if err == nil {
		t.Fatalf("expected an error, got %+v (must not report 'up to date' when the check failed)", info)
	}
	if !strings.Contains(err.Error(), "GitHub Releases") || !strings.Contains(err.Error(), "Docker Hub") {
		t.Errorf("error should name both sources: %v", err)
	}
}

func TestFetchUpdateInfoRejectsNonReleaseRunningVersion(t *testing.T) {
	if _, err := fetchUpdateInfo("dev"); err == nil {
		t.Fatal("expected an error for a non-release running version")
	}
}

func TestUpdateCheckerCachesSuccessOnly(t *testing.T) {
	var calls int32
	fail := true
	checker := &updateChecker{ttl: time.Hour, fetch: func(string) (*UpdateInfo, error) {
		atomic.AddInt32(&calls, 1)
		if fail {
			return nil, errors.New("upstream down")
		}
		return &UpdateInfo{LatestVersion: "1.5.0"}, nil
	}}

	if _, err := checker.Get("1.4.8"); err == nil {
		t.Fatal("expected error")
	}
	fail = false
	if _, err := checker.Get("1.4.8"); err != nil {
		t.Fatal(err)
	}
	if _, err := checker.Get("1.4.8"); err != nil {
		t.Fatal(err)
	}
	if calls != 2 {
		t.Fatalf("fetch called %d times; failures must not be cached, successes must be", calls)
	}

	checker.Clear()
	if _, err := checker.Get("1.4.8"); err != nil || calls != 3 {
		t.Fatalf("Clear should force a refetch (calls=%d, err=%v)", calls, err)
	}
}

func TestUpdateCheckerConcurrentGetsShareOneFetch(t *testing.T) {
	var calls int32
	checker := &updateChecker{ttl: time.Hour, fetch: func(string) (*UpdateInfo, error) {
		atomic.AddInt32(&calls, 1)
		time.Sleep(20 * time.Millisecond)
		return &UpdateInfo{LatestVersion: "1.5.0"}, nil
	}}

	var wg sync.WaitGroup
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			if info, err := checker.Get("1.4.8"); err != nil || info.LatestVersion != "1.5.0" {
				t.Errorf("Get = %+v, %v", info, err)
			}
		}()
	}
	wg.Wait()
	if calls != 1 {
		t.Fatalf("fetch called %d times, want 1", calls)
	}
}
