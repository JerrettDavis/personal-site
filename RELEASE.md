# Release process

Releases are fully automated on every merge to `main` via GitHub Actions and semantic-release.

## What happens on merge to main
- The workflow analyzes conventional commits since the last tag.
- It computes the next SemVer version.
- It updates `CHANGELOG.md`, `package.json`, and `package-lock.json`.
- It tags the release and creates a GitHub Release with generated notes.

## Requirements
- Commits merged to `main` must follow Conventional Commits so the version bump is correct.
- The GitHub Actions workflow must have `contents: write` permission (already configured).

No manual release commands are required.
