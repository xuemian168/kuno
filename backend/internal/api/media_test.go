package api

import (
	"bytes"
	"strings"
	"testing"
)

// Test SVG sanitization
func TestSanitizeSVG(t *testing.T) {
	tests := []struct {
		name        string
		input       string
		shouldPass  bool
		shouldContain []string
		shouldNotContain []string
	}{
		{
			name: "Malicious SVG with script tag",
			input: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert('XSS')</script>
  <circle cx="50" cy="50" r="40" fill="red"/>
</svg>`,
			shouldPass: true,
			shouldContain: []string{"<circle", "<svg"},
			shouldNotContain: []string{"<script", "alert"},
		},
		{
			name: "SVG with onerror event",
			input: `<svg xmlns="http://www.w3.org/2000/svg">
  <image href="x" onerror="alert('XSS')" />
  <rect width="100" height="100" fill="blue"/>
</svg>`,
			shouldPass: true,
			shouldContain: []string{"<rect", "<svg"},
			shouldNotContain: []string{"onerror", "alert"},
		},
		{
			name: "SVG with onload event",
			input: `<svg xmlns="http://www.w3.org/2000/svg" onload="alert('XSS')">
  <circle cx="50" cy="50" r="40"/>
</svg>`,
			shouldPass: true,
			shouldContain: []string{"<circle", "<svg"},
			shouldNotContain: []string{"onload=", "alert"},
		},
		{
			name: "SVG with javascript: protocol in nested element",
			input: `<svg xmlns="http://www.w3.org/2000/svg">
  <a href="javascript:alert('XSS')">
    <text x="0" y="15">Click me</text>
  </a>
</svg>`,
			// This might fail XML validation after sanitization because nested structure is broken
			// That's OK - we prefer to reject than to allow potential XSS
			shouldPass: false,
			shouldContain: []string{},
			shouldNotContain: []string{},
		},
		{
			name: "SVG with foreignObject",
			input: `<svg xmlns="http://www.w3.org/2000/svg">
  <foreignObject width="100" height="100">
    <body xmlns="http://www.w3.org/1999/xhtml">
      <script>alert('XSS')</script>
    </body>
  </foreignObject>
  <circle cx="50" cy="50" r="40"/>
</svg>`,
			shouldPass: true,
			shouldContain: []string{"<circle", "<svg"},
			shouldNotContain: []string{"<foreignObject", "<script", "alert"},
		},
		{
			name: "Clean SVG should remain unchanged",
			input: `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100">
  <circle cx="50" cy="50" r="40" fill="red"/>
  <rect x="10" y="10" width="30" height="30" fill="blue"/>
</svg>`,
			shouldPass: true,
			shouldContain: []string{"<circle", "<rect", "<svg", "<?xml"},
			shouldNotContain: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result, err := sanitizeSVG([]byte(tt.input))

			if tt.shouldPass && err != nil {
				t.Errorf("Expected sanitization to pass, but got error: %v", err)
				return
			}

			if !tt.shouldPass && err == nil {
				t.Errorf("Expected sanitization to fail, but it passed")
				return
			}

			if tt.shouldPass {
				resultStr := string(result)

				// Check for required content
				for _, required := range tt.shouldContain {
					if !strings.Contains(resultStr, required) {
						t.Errorf("Expected result to contain '%s', but it didn't. Result: %s", required, resultStr)
					}
				}

				// Check for forbidden content
				for _, forbidden := range tt.shouldNotContain {
					if strings.Contains(resultStr, forbidden) {
						t.Errorf("Expected result NOT to contain '%s', but it did. Result: %s", forbidden, resultStr)
					}
				}
			}
		})
	}
}

// Test file content validation
func TestValidateFileContent(t *testing.T) {
	tests := []struct {
		name        string
		content     []byte
		declaredType string
		shouldPass  bool
	}{
		{
			name:        "Valid JPEG file",
			content:     []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10},
			declaredType: "image/jpeg",
			shouldPass:  true,
		},
		{
			name:        "Valid PNG file",
			content:     []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
			declaredType: "image/png",
			shouldPass:  true,
		},
		{
			name:        "Invalid JPEG (wrong magic number)",
			content:     []byte{0x00, 0x00, 0x00, 0x00},
			declaredType: "image/jpeg",
			shouldPass:  false,
		},
		{
			name:        "SVG with XML declaration",
			content:     []byte("<?xml version=\"1.0\"?>\n<svg></svg>"),
			declaredType: "image/svg+xml",
			shouldPass:  true,
		},
		{
			name:        "SVG starting with svg tag",
			content:     []byte("<svg xmlns=\"http://www.w3.org/2000/svg\"></svg>"),
			declaredType: "image/svg+xml",
			shouldPass:  true,
		},
		{
			name:        "Content-Type spoofing: PNG claimed as JPEG",
			content:     []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A},
			declaredType: "image/jpeg",
			shouldPass:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := validateFileContent(tt.content, tt.declaredType)

			if result != tt.shouldPass {
				t.Errorf("Expected validation result to be %v, but got %v", tt.shouldPass, result)
			}
		})
	}
}

// Test real-world XSS vectors
func TestXSSVectors(t *testing.T) {
	xssVectors := []string{
		// Script injection
		`<svg><script>alert('XSS')</script></svg>`,
		`<svg><script xlink:href="data:text/javascript,alert('XSS')"/></svg>`,

		// Event handlers
		`<svg onload="alert('XSS')"></svg>`,
		`<svg><image onerror="alert('XSS')" src="invalid"/></svg>`,
		`<svg><animate onbegin="alert('XSS')"/></svg>`,

		// JavaScript protocols
		`<svg><a href="javascript:alert('XSS')"><text>Click</text></a></svg>`,
		`<svg><use href="javascript:alert('XSS')"/></svg>`,

		// ForeignObject
		`<svg><foreignObject><body><script>alert('XSS')</script></body></foreignObject></svg>`,

		// Data URLs
		`<svg><image href="data:text/html,<script>alert('XSS')</script>"/></svg>`,
	}

	for i, vector := range xssVectors {
		t.Run(string(rune(i)), func(t *testing.T) {
			result, err := sanitizeSVG([]byte(vector))

			if err != nil {
				// Some vectors might produce invalid XML after sanitization - that's OK
				return
			}

			resultStr := strings.ToLower(string(result))

			// Check that dangerous patterns are removed
			dangerousPatterns := []string{
				"<script", "javascript:", "onerror=", "onload=",
				"onclick=", "onmouseover=", "<foreignobject",
				"alert(", "eval(", "prompt(",
			}

			for _, pattern := range dangerousPatterns {
				if strings.Contains(resultStr, pattern) {
					t.Errorf("Sanitized SVG still contains dangerous pattern '%s': %s", pattern, resultStr)
				}
			}
		})
	}
}

// Benchmark SVG sanitization
func BenchmarkSanitizeSVG(b *testing.B) {
	svgContent := []byte(`<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg">
  <script>alert('XSS')</script>
  <circle cx="50" cy="50" r="40" fill="red" onerror="alert('XSS')"/>
  <rect x="10" y="10" width="30" height="30" fill="blue"/>
  <a href="javascript:alert('XSS')"><text>Click</text></a>
</svg>`)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_, _ = sanitizeSVG(svgContent)
	}
}

// Benchmark file validation
func BenchmarkValidateFileContent(b *testing.B) {
	content := bytes.Repeat([]byte{0xFF, 0xD8, 0xFF}, 1000)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = validateFileContent(content, "image/jpeg")
	}
}

// Test JPEG file integrity validation
func TestValidateJPEG(t *testing.T) {
	tests := []struct {
		name    string
		content []byte
		wantErr bool
	}{
		{
			name:    "Valid JPEG",
			content: []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46, 0x49, 0x46, 0xFF, 0xD9},
			wantErr: false,
		},
		{
			name:    "JPEG missing EOI",
			content: []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10},
			wantErr: true,
		},
		{
			name:    "JPEG invalid SOI",
			content: []byte{0x00, 0x00, 0xFF, 0xE0, 0x00, 0x10, 0xFF, 0xD9},
			wantErr: true,
		},
		{
			name:    "File too small",
			content: []byte{0xFF, 0xD8},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateJPEG(tt.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateJPEG() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Test PNG file integrity validation
func TestValidatePNG(t *testing.T) {
	tests := []struct {
		name    string
		content []byte
		wantErr bool
	}{
		{
			name: "Valid PNG",
			content: append(append(
				[]byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}, // PNG signature
				make([]byte, 20)...), // IHDR chunk placeholder
				[]byte{0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82}...), // IEND chunk
			wantErr: false,
		},
		{
			name:    "PNG invalid signature",
			content: []byte{0x00, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
			wantErr: true,
		},
		{
			name: "PNG missing IEND",
			content: append(
				[]byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
				make([]byte, 30)...),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validatePNG(tt.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("validatePNG() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Test GIF file integrity validation
func TestValidateGIF(t *testing.T) {
	tests := []struct {
		name    string
		content []byte
		wantErr bool
	}{
		{
			name: "Valid GIF89a",
			content: append(append(
				[]byte("GIF89a"),
				make([]byte, 7)...), // Logical screen descriptor
				0x3B), // Terminator
			wantErr: false,
		},
		{
			name: "Valid GIF87a",
			content: append(append(
				[]byte("GIF87a"),
				make([]byte, 7)...), // Logical screen descriptor
				0x3B), // Terminator
			wantErr: false,
		},
		{
			name:    "Invalid GIF signature",
			content: []byte("PNG89a\x00\x00\x00\x00\x00\x00\x00\x3B"),
			wantErr: true,
		},
		{
			name:    "GIF missing terminator",
			content: append([]byte("GIF89a"), make([]byte, 10)...),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateGIF(tt.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateGIF() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Test WebP file integrity validation
func TestValidateWebP(t *testing.T) {
	tests := []struct {
		name    string
		content []byte
		wantErr bool
	}{
		{
			name: "Valid WebP",
			content: append(append(
				[]byte("RIFF"),
				[]byte{0x00, 0x00, 0x00, 0x00}...), // Size placeholder
				[]byte("WEBP")...),
			wantErr: false,
		},
		{
			name:    "Invalid RIFF header",
			content: []byte("PNG \x00\x00\x00\x00WEBP"),
			wantErr: true,
		},
		{
			name:    "Invalid WEBP signature",
			content: []byte("RIFF\x00\x00\x00\x00JPEG"),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateWebP(tt.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateWebP() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Test MP4 file integrity validation
func TestValidateMP4(t *testing.T) {
	tests := []struct {
		name    string
		content []byte
		wantErr bool
	}{
		{
			name:    "Valid MP4 with isom brand",
			content: []byte{0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x69, 0x73, 0x6F, 0x6D},
			wantErr: false,
		},
		{
			name:    "Valid MP4 with mp42 brand",
			content: []byte{0x00, 0x00, 0x00, 0x20, 0x66, 0x74, 0x79, 0x70, 0x6D, 0x70, 0x34, 0x32},
			wantErr: false,
		},
		{
			name:    "Invalid MP4 - missing ftyp",
			content: []byte{0x00, 0x00, 0x00, 0x20, 0x6D, 0x64, 0x61, 0x74},
			wantErr: true,
		},
		{
			name:    "File too small",
			content: []byte{0x00, 0x00},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateMP4(tt.content)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateMP4() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Test video file validations
func TestVideoValidations(t *testing.T) {
	t.Run("WebM validation", func(t *testing.T) {
		validWebM := []byte{0x1A, 0x45, 0xDF, 0xA3, 0x00, 0x00}
		if err := validateWebM(validWebM); err != nil {
			t.Errorf("validateWebM() failed for valid WebM: %v", err)
		}

		invalidWebM := []byte{0x00, 0x00, 0x00, 0x00}
		if err := validateWebM(invalidWebM); err == nil {
			t.Error("validateWebM() should fail for invalid WebM")
		}
	})

	t.Run("OGG validation", func(t *testing.T) {
		validOGG := []byte("OggS\x00\x02")
		if err := validateOGG(validOGG); err != nil {
			t.Errorf("validateOGG() failed for valid OGG: %v", err)
		}

		invalidOGG := []byte("MPEG")
		if err := validateOGG(invalidOGG); err == nil {
			t.Error("validateOGG() should fail for invalid OGG")
		}
	})

	t.Run("AVI validation", func(t *testing.T) {
		validAVI := []byte("RIFF\x00\x00\x00\x00AVI ")
		if err := validateAVI(validAVI); err != nil {
			t.Errorf("validateAVI() failed for valid AVI: %v", err)
		}

		invalidAVI := []byte("RIFF\x00\x00\x00\x00MP4 ")
		if err := validateAVI(invalidAVI); err == nil {
			t.Error("validateAVI() should fail for invalid AVI")
		}
	})
}

// Test polyglot file detection
func TestDetectPolyglot(t *testing.T) {
	tests := []struct {
		name       string
		content    []byte
		shouldFlag bool
	}{
		{
			name:       "Clean JPEG",
			content:    append([]byte{0xFF, 0xD8, 0xFF}, make([]byte, 200)...),
			shouldFlag: false,
		},
		{
			name:       "JPEG with embedded script tag",
			content:    append(append([]byte{0xFF, 0xD8, 0xFF}, make([]byte, 100)...), []byte("<script>alert('xss')</script>")...),
			shouldFlag: true,
		},
		{
			name:       "File with PHP code",
			content:    append([]byte("<?php system($_GET['cmd']); ?>"), make([]byte, 80)...),
			shouldFlag: true,
		},
		{
			name:       "File with shell script",
			content:    append([]byte("#!/bin/bash\nrm -rf /"), make([]byte, 80)...),
			shouldFlag: true,
		},
		{
			name:       "File with JavaScript",
			content:    append(append([]byte{0xFF, 0xD8, 0xFF}, make([]byte, 100)...), []byte("javascript:alert(1)")...),
			shouldFlag: true,
		},
		{
			name:       "File with eval",
			content:    append(make([]byte, 100), []byte("eval(atob('YWxlcnQoMSk='))")...),
			shouldFlag: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			result := detectPolyglot(tt.content)
			if result != tt.shouldFlag {
				t.Errorf("detectPolyglot() = %v, want %v", result, tt.shouldFlag)
			}
		})
	}
}

// Test file integrity function dispatcher
func TestValidateFileIntegrity(t *testing.T) {
	tests := []struct {
		name     string
		content  []byte
		mimeType string
		wantErr  bool
	}{
		{
			name:     "Valid JPEG",
			content:  []byte{0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0xFF, 0xD9},
			mimeType: "image/jpeg",
			wantErr:  false,
		},
		{
			name:     "Invalid JPEG",
			content:  []byte{0x00, 0x00, 0x00, 0x00},
			mimeType: "image/jpeg",
			wantErr:  true,
		},
		{
			name: "Valid PNG",
			content: append(append(
				[]byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
				make([]byte, 20)...),
				[]byte{0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82}...),
			mimeType: "image/png",
			wantErr:  false,
		},
		{
			name:     "SVG (no validation needed)",
			content:  []byte("<svg></svg>"),
			mimeType: "image/svg+xml",
			wantErr:  false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := validateFileIntegrity(tt.content, tt.mimeType)
			if (err != nil) != tt.wantErr {
				t.Errorf("validateFileIntegrity() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

// Benchmark integrity validations
func BenchmarkValidateJPEG(b *testing.B) {
	content := append([]byte{0xFF, 0xD8, 0xFF, 0xE0}, make([]byte, 10000)...)
	content = append(content, []byte{0xFF, 0xD9}...)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = validateJPEG(content)
	}
}

func BenchmarkValidatePNG(b *testing.B) {
	content := append(append(
		[]byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A},
		make([]byte, 10000)...),
		[]byte{0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82}...)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = validatePNG(content)
	}
}

func BenchmarkDetectPolyglot(b *testing.B) {
	content := append([]byte{0xFF, 0xD8, 0xFF}, make([]byte, 1000)...)

	b.ResetTimer()
	for i := 0; i < b.N; i++ {
		_ = detectPolyglot(content)
	}
}
