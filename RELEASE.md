# Release process
Releases are automated via GitHub Actions and semantic-release. See the full workflow details in
`/docs/automation` and commit conventions in `/docs/decisions`.

Quick summary:
- Merges to `main` run semantic-release.
- Conventional commits drive the SemVer bump.
- GitHub Releases hold the changelog.
