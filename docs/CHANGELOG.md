# Changelog

All notable changes to KUNO Blog Platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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