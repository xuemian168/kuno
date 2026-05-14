package api

import (
	"reflect"
	"testing"
)

func TestExtractReleaseChangelog(t *testing.T) {
	body := `## KUNO v1.4.0

Intro text that should not be treated as a changelog item.

## Highlights

- Added GitHub release note parsing.
- Fixed update checker behavior.

## Docker Image

- docker pull ictrun/kuno:v1.4.0

## Quick Deploy

- curl -sSL example.com | bash

## Fixes

- Removed icon glyphs from update copy.

## Build Information

- **Version**: 1.4.0
`

	got := extractReleaseChangelog(body)
	want := []string{
		"Added GitHub release note parsing.",
		"Fixed update checker behavior.",
		"Removed icon glyphs from update copy.",
	}

	if !reflect.DeepEqual(got, want) {
		t.Fatalf("unexpected changelog items:\nwant: %#v\n got: %#v", want, got)
	}
}
