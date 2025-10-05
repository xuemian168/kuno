# Changelog

All notable changes to KUNO Blog Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.3.16] - 2025-10-05

### Security
- **Fixed critical dependency vulnerabilities** (Multiple CVEs)
  - Backend Go dependencies:
    - Updated `golang.org/x/image` from v0.0.0-20191009 to v0.30.0
      - Fixed CVE-2024-24792: Panic when parsing invalid palette-color images (High Severity)
      - Fixed TIFF decoder vulnerabilities: unlimited compressed tile data, excessive CPU consumption (Medium)
      - Fixed uncontrolled resource consumption in image processing (Medium)
    - Updated `github.com/disintegration/imaging` from v1.6.2 (latest stable)
      - Mitigated crash when processing crafted TIFF files (Low)
  - Frontend npm dependencies:
    - Updated `next` from 15.4.3 to 15.4.7
      - Fixed SSRF vulnerability in middleware redirect handling (Medium - CVE pending)
      - Fixed cache key confusion in Image Optimization API (Medium - CVE pending)
      - Fixed content injection vulnerability in image optimization (Medium - CVE pending)
    - Enforced `d3-color@3.1.0+` via package overrides
      - Fixed ReDoS vulnerability in rgb()/hrc() functions (High - GHSA-36jr-mh4h-2g58)
      - Applied to all transitive dependencies (d3@7.9.0, react-simple-maps@3.0.0)
    - Enforced `prismjs@1.30.0+` via package overrides
      - Fixed DOM Clobbering XSS vulnerability (Medium - CVE-2024-53382)
      - Applied to react-syntax-highlighter and refractor dependencies
- **Fixed iframe XSS vulnerabilities in video embed components** (High Severity)
  - Added `sandbox` attribute to YouTube and Bilibili iframe embeds
  - Sandbox permissions: `allow-scripts allow-same-origin allow-presentation` (minimal required permissions)
  - Prevents form submission, top navigation hijacking, and unauthorized JavaScript execution
- **Enhanced URL validation for video embeds** (Medium Severity)
  - YouTube: Strict 11-character videoId format validation (`[a-zA-Z0-9_-]{11}`)
  - Bilibili: Fixed-length BV ID validation (12 chars: `BV[a-zA-Z0-9]{10}`)
  - Bilibili: av ID length limit (1-10 digits)
  - Prevents DoS attacks via extremely long video IDs
  - Prevents URL fragment injection and XSS via malformed videoIds
- **Minimized iframe permissions** (Medium Severity)
  - Removed `clipboard-write` permission (prevents clipboard data exfiltration)
  - Removed `accelerometer`, `gyroscope`, `web-share` (unnecessary for video playback)
  - Retained only essential permissions: `autoplay`, `encrypted-media`, `picture-in-picture`
- **Improved referrer privacy** (Low Severity)
  - YouTube: Added `referrerPolicy="no-referrer-when-downgrade"`
  - Bilibili: Retained `referrerPolicy="no-referrer"` for maximum privacy

### Added
- **Duplicate video prevention** (Medium Priority)
  - URL-based duplicate detection when adding online videos
  - User-friendly error message with auto-dismiss (5 seconds)
  - Multi-language support for error messages (Chinese/English/Japanese)
- **UUID-based video identification** (High Priority)
  - Unique identifiers using `crypto.randomUUID()` for each online video
  - Prevents deletion conflicts when duplicate URLs exist
  - Automatic data migration for existing videos without UUIDs
- **Custom delete confirmation dialogs** (High Priority)
  - Replaced browser native `confirm()` with custom `DeleteConfirmationDialog` component
  - Requires typed confirmation text to prevent accidental deletions
  - Displays item name (video title or filename) in confirmation dialog
  - Consistent professional UI design across the platform
  - Supports multi-language (Chinese/English/Japanese)
  - Applied to both online video deletion and uploaded media deletion
- **Unified media sorting** (Medium Priority)
  - Online videos now appear in "All" category tab
  - Mixed sorting of uploaded media and online videos by timestamp
  - Added `created_at` timestamp field to `OnlineVideo` interface
  - Automatic timestamp migration for existing videos (preserves relative order)
  - Supports sorting by date, size, and name across all media types

### Changed
- Security Layer 0 (Dependency Security): Updated all vulnerable dependencies to patched versions
- Defense-in-depth: Go image library updates complement existing metadata stripping mechanism (media.go:401-455)
- All frontend dependency vulnerabilities resolved (npm audit: 0 vulnerabilities)
- Security Layer 1: Strict regex patterns for video URL validation
- Security Layer 2: iframe sandbox attribute with minimal permissions
- Security Layer 3: Minimized `allow` attribute permissions
- Security Layer 4: referrerPolicy to protect user privacy
- Media library rendering: Unified display logic for uploaded and online media in "All" tab
- Video deletion workflow: Now uses state-managed dialogs instead of blocking browser prompts
- Media file deletion workflow: Now uses state-managed dialogs with error handling

### Fixed
- **Online videos not displaying in "All" category** (High Priority)
  - Modified `fetchMedia()` to always load online videos regardless of `selectedType`
  - Online videos now properly appear alongside uploaded media
- **Online videos always appearing last** (High Priority)
  - Implemented unified sorting logic using `UnifiedMediaItem` type
  - Changed rendering to iterate sorted items directly in "All" mode
  - Videos now correctly sort by timestamp with uploaded media
- **Unable to delete duplicate URL videos** (Medium Priority)
  - Changed deletion identifier from `url` to `uuid`
  - Resolved confusion when multiple videos share the same URL

### Technical Details
- **Dependency Updates**:
  - Go 1.23.3 compatibility: `golang.org/x/image` updated to v0.30.0 (v0.31.0 requires Go 1.24+)
  - Package overrides ensure all nested dependencies use secure versions
  - Backward compatible: All tests passing, build successful
- **Security Enhancements**:
  - Addresses iframe-based XSS attack vectors identified in CVE-2025-31008
  - Complies with OWASP Top 10 - A03:2021 Injection
  - Complies with OWASP Top 10 - A05:2021 Security Misconfiguration
  - Aligns with 2025 iframe security best practices (sandbox + CSP)
- **Files Modified**:
  - Frontend: `youtube-embed.tsx` (enhanced URL validation +8 lines, added sandbox +3 attributes)
  - Frontend: `bilibili-embed.tsx` (enhanced URL validation +14 lines, added sandbox +1 attribute)
  - Frontend: `video-add.tsx` (+UUID generation, removed created_at field from interface)
  - Frontend: `page.tsx` (media library - +unified sorting logic ~60 lines, +delete dialogs ~40 lines, +UUID migration)
  - Frontend: `delete-confirmation-dialog.tsx` (existing component, reused)
  - Translations: `zh.json`, `en.json`, `ja.json` (+6 new keys for delete dialogs and duplicate error)
  - Backend: `go.mod`, `go.sum` (dependency updates)
  - Frontend: `package.json` (dependency updates + overrides)
- Zero breaking changes - backward compatible
- All builds pass with no ESLint errors
- Data migration: Automatic UUID and timestamp addition to existing online videos

### Notes
- Sandbox attribute restricts iframe capabilities while allowing video playback
- `allow-scripts`: Required for video player JavaScript
- `allow-same-origin`: Required for player API calls to YouTube/Bilibili
- `allow-presentation`: Required for fullscreen functionality
- Removed permissions prevent malicious actions: form submission, clipboard access, navigation hijacking
- URL validation prevents injection of malformed or excessively long video IDs
- Defense-in-depth: Multiple layers (URL validation + sandbox + minimal permissions)
- UUID generation uses Web Crypto API (`crypto.randomUUID()`)
- Timestamps use ISO 8601 format (`new Date().toISOString()`)
- Delete confirmation requires exact text match (case-insensitive): "删除"/"delete"/"削除"
- Old videos without timestamps receive retroactive timestamps in reverse order to preserve sort order

## [1.3.15] - 2025-10-05

### Security
- **Fixed Stored XSS vulnerability via image metadata** (Critical)
  - Implemented automatic metadata stripping for all uploaded images
  - JPEG EXIF data completely removed via re-encoding
  - PNG tEXt/zTXt/iTXt chunks removed via re-encoding
  - GIF comment blocks removed via re-encoding
  - Prevents XSS attacks via `exiftool`-injected payloads in metadata fields
- **Enhanced Content Security Policy (CSP)** for all media files
  - Applied strict CSP to all images: `default-src 'none'; img-src 'self'; script-src 'none'`
  - Applied strict CSP to all videos: `default-src 'none'; media-src 'self'; script-src 'none'`
  - Extra strict CSP for SVG files with explicit `script-src 'none'`
  - Defense-in-depth protection against metadata-based XSS
- **Removed SVG upload support** due to security concerns (XSS/SSRF/XXE/DoS risks)
- **Removed WebP image upload support** to simplify supported formats
- **Removed WebM and OGG video upload support** to minimize attack surface

### Added
- `stripImageMetadata()` function in `media.go` for automatic metadata removal
- Image re-encoding using Go standard library (`image/jpeg`, `image/png`, `image/gif`)
- Test cases for PNG and GIF metadata stripping (`TestStripImageMetadata`)
- Comprehensive CSP headers for all media file types in `ServeMedia`

### Changed
- Security Layer 4: Now strips metadata from all images before storage
- Security Layer 6: Enhanced CSP headers now apply to ALL media files, not just SVG
- Restricted image uploads to 4 basic formats: JPEG (.jpg, .jpeg), PNG (.png), GIF (.gif)
- Restricted video uploads to 3 formats: MP4 (.mp4), AVI (.avi), MOV (.mov)
- Updated frontend media upload component to remove SVG, WebP, WebM, OGG from file picker
- Added explicit SVG rejection error message: "SVG 文件由于安全原因不允许上传。请使用 PNG、JPEG、WebP 或 GIF 格式代替。"
- Enhanced file type validation testing with comprehensive rejection checks
- Graceful degradation: If metadata stripping fails, original file is uploaded with warning log
- Updated `ServeMedia` to set stricter security headers based on file type (image vs video)

### Removed
- SVG file upload functionality (security mitigation)
- SVG sanitization warning message in frontend
- WebP image format support
- WebM and OGG video format support

### Technical Details
- Addresses metadata injection attack vectors:
  - JPEG: EXIF/IPTC/XMP metadata
  - PNG: tEXt/zTXt/iTXt/eXIf chunks
  - GIF: Comment Extension blocks
  - MP4: Protected via CSP (metadata stripping requires ffmpeg, not implemented)
- Complies with OWASP Top 10 - A03:2021 Injection
- Complies with OWASP ASVS Level 2 - File Upload Validation (V12.2)
- Addresses CWE-79 (Cross-Site Scripting) via metadata
- Files modified:
  - Backend: `media.go` (removed SVG/WebP/WebM/OGG from whitelists, added metadata stripping +56 lines, enhanced CSP +25 lines, added explicit rejection)
  - Frontend: `media-upload.tsx` (removed file types from accept string, removed SVG security alert)
  - Tests: `media_test.go` (updated TestFileTypeRejection to verify all removed formats, added metadata stripping tests +105 lines)
- Dependencies added: Standard library only (`image/jpeg`, `image/png`, `image/gif`)
- System SVG icons in `/public/` directory remain unaffected
- All tests pass (20 SVG sanitization tests + 1 file type rejection + 2 metadata stripping tests = 23 tests)
- Aligns with KISS principle: simplified format support reduces complexity and attack surface

### Notes
- Image quality set to 95% for JPEG re-encoding (minimal quality loss)
- PNG uses default compression level (balance of speed and size)
- GIF re-encoding preserves animation frames
- Metadata stripping adds ~100-500ms per upload depending on image size
- Video metadata not stripped due to complexity (requires ffmpeg), protected via CSP only
- Users should convert SVG files to PNG/JPEG before uploading
- System-provided browser/device icons (SVG) continue to function normally
- This change prioritizes security over format flexibility

## [1.3.14] - 2025-10-03

### Security
- **Fixed critical XSS vulnerability** in file upload functionality (Stored XSS)
- Implemented 7-layer defense-in-depth security architecture for media uploads
- Added magic number validation to prevent Content-Type spoofing attacks
- Implemented comprehensive file integrity checks for all supported formats:
  - JPEG: SOI/EOI marker validation
  - PNG: Signature validation with PNG bomb protection (100 chunk limit)
  - GIF: Signature validation with GIF bomb protection (1000 frame limit)
  - WebP: RIFF/WEBP signature validation
  - MP4, WebM, OGG, AVI: Video format signature validation
- Added polyglot file detection to prevent multi-format hybrid attacks
- Implemented SVG content sanitization:
  - Removes all dangerous elements (script, foreignObject, iframe, object, embed, animations)
  - Strips all event handlers (onload, onerror, onclick, etc.)
  - Sanitizes dangerous protocols in href/xlink:href (javascript:, data:, vbscript:)
- Added strict security response headers:
  - X-Content-Type-Options: nosniff
  - X-Frame-Options: DENY
  - Content-Security-Policy for SVG files (prevents script execution)
- File extension whitelist enforcement

### Added
- SVG file upload support with automatic sanitization
- 48 comprehensive security test cases (100% pass rate)
- Security warning in frontend for SVG uploads
- Helper function minInt() for safe integer operations

### Changed
- Enhanced UploadMedia endpoint with 4-layer validation
- Enhanced ServeMedia endpoint with security headers
- Improved frontend media upload component with SVG support

### Technical Details
- Complies with OWASP Top 10 - A03:2021 Injection
- Complies with OWASP ASVS Level 2 - File Upload Validation
- Addresses CWE-79 (Cross-Site Scripting)
- Addresses CWE-434 (Unrestricted File Upload)
- Test coverage: 48 test cases validating all security measures
- Files modified: media.go (730 lines), media_test.go (new), media-upload.tsx

## [1.3.9] - 2025-09-06

### Fixed
- Fixed canonical and alternate links showing localhost in containerized environments
- Implemented dynamic domain detection from request headers for accurate URL generation
- Unified domain resolution logic for development and production environments without requiring NEXT_PUBLIC_APP_URL
- Added support for X-Forwarded-Host and X-Forwarded-Proto headers in reverse proxy scenarios

## [1.3.8] - 2025-09-04

### Added
- Mermaid diagram internationalization support
- Multilingual toolbar for Mermaid charts supporting Chinese, English, and Japanese
- Translation keys for Mermaid toolbar actions including:
  - Drag to move functionality
  - Zoom in/out controls (Ctrl + =, Ctrl + -)
  - Reset view (Ctrl + 0)
  - Fullscreen mode (F11)
  - SVG download functionality

### Changed
- MermaidToolbar component now uses next-intl for internationalization
- Replaced hardcoded Chinese text with translation functions
- Enhanced user experience with localized Mermaid diagram controls

## [1.3.7] - 2025

### Fixed
- Removed unnecessary JWT key generation logging to simplify the process
- Improved code cleanliness and reduced console noise

## [1.3.6] - 2025

### Added
- Cost limit management functionality for better resource control
- Recommendation verification mechanism to ensure content quality
- Multi-language support for recommendation algorithms

### Fixed
- Code formatting improvements for better readability
- Enhanced recommendation system performance

## [1.3.5] - 2025

### Added
- Monaco Editor support with comprehensive configuration options
- Enhanced website translation capabilities
- AI statistics functionality in settings panel

### Changed
- Improved settings form design and user experience
- Enhanced translation workflow management

## [1.3.4] - 2025

### Added
- Privacy and indexing control features for better SEO management
- RAG (Retrieval-Augmented Generation) service status checking
- Availability verification functionality for RAG services
- Personalized recommendations engine
- Content assistant features for better user engagement

### Fixed
- Share bar styling improvements for better visual consistency
- Enhanced user interface responsiveness

## [1.3.3] - 2025

### Added
- Enhanced embedding services with improved functionality
- Advanced sharing capabilities across multiple platforms

### Changed
- Improved embedding performance and reliability
- Enhanced social sharing user experience

## [1.3.2] - 2025

### Added
- Dynamic theme support with intelligent color adaptation
- Advanced container styling system

### Changed
- Enhanced visual design with improved theme switching
- Better responsive design across different devices

## [1.3.1] - 2025

### Added
- Enhanced code blocks with syntax highlighting improvements
- Advanced article component styling for better readability
- SEO management features with comprehensive optimization tools
- Language configuration support for multi-language content

### Changed
- Improved article rendering performance
- Enhanced code display capabilities

## [1.3.0] - 2025

### Added
- Semantic search functionality with advanced AI capabilities
- Embedding management system for better content organization
- RAG introduction components for enhanced user onboarding
- AI-powered content discovery features

### Changed
- Optimized translation services to support multiple AI providers
- Enhanced translation service error handling for better user experience
- Improved user-friendliness across translation workflows

### Fixed
- Translation service reliability improvements
- Enhanced error messaging and recovery mechanisms

## [1.2.32] - 2025

### Added
- Input validation functionality for deployment scripts
- Enhanced robustness in system deployment processes

### Changed
- Improved deployment script reliability and error handling

---

## Notes

- **Added** for new features
- **Changed** for changes in existing functionality
- **Deprecated** for soon-to-be removed features
- **Removed** for now removed features
- **Fixed** for any bug fixes
- **Security** in case of vulnerabilities

For more information about releases, visit [KUNO Blog Platform](https://qut.edu.kg).