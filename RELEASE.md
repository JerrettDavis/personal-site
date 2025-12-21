# Release process

Releases are fully automated on every merge to `main` via GitHub Actions and semantic-release.

## What happens on merge to main
- The workflow analyzes conventional commits since the last tag.
- It computes the next SemVer version.
- It tags the release on `main` and creates a GitHub Release with generated notes.

## Requirements
- Commits merged to `main` must follow Conventional Commits so the version bump is correct.
- The GitHub Actions workflow must have `contents: write` permission (already configured).

## Notes
- The changelog lives in GitHub Releases; no files are written back to `main`.

No manual release commands are required.
