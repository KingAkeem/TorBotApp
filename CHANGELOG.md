# Changelog

All notable changes to TorBot App are documented here.

## Unreleased

### Added

- Reliability-first release scorecard with explicit verification, backend pin,
  signing, target, and manual-check status.

## 1.0.0 - 2026-07-17

### Added

- Managed integration with GoTor's versioned job-control API.
- Tor configuration panel showing proxy reachability, detected `torrc`, SOCKS
  and control ports, data directory, executable path, and port mismatches.
- Crawl cancellation with partial-result retention.
- Report views for summaries, fetched pages, contact intelligence, and link
  relationships.
- Backend discovery through `GOTOR_BIN`, packaged resources, the sibling
  repository, `go run`, or `GOTOR_API_URL`.
- Context-isolated preload bridge and strict renderer content security policy.
- Backend adapter tests, TypeScript checking, and reproducible npm builds.
- GitHub Actions verification and cross-platform, tag-driven release
  automation with bundled GoTor binaries and SHA-256 checksums.

### Changed

- Replaced the original Material UI form with a responsive investigation
  workspace.
- Kept root-profile values readable beside long, wrapped fetch-failure details
  in wide report layouts.
- Upgraded React, TypeScript, Webpack, and Electron.
- Moved all network, filesystem, and process access out of the renderer.
- Replaced Yarn metadata with an npm lockfile and documented the current setup.
- Raised the development toolchain minimum to Node.js 22.12 for current
  Electron packaging support.

### Removed

- The obsolete `tor-request` dependency.
- The renderer-side crawler, request helpers, and duplicated link parser.
- Legacy result components that fetched each page independently.
