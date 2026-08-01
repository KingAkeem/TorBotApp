# TorBot App

TorBot App is a secure Electron interface for the current TorBot/GoTor crawl
stack. The renderer no longer performs network requests itself. Electron
manages a local GoTor job-control service and exposes a narrow, context-isolated
IPC bridge to the React UI.

The app presents:

- Tor or direct crawling
- Configurable crawl depth and SOCKS5 address
- Page status, size, metadata, and skip reasons
- Email and phone intelligence
- Parent/child link relationships
- Partial results and per-page failures
- Crawl cancellation
- Tor readiness, `torrc` location, SOCKS/control ports, data directory, and
  Tor executable diagnostics

## Requirements

- Node.js 22.12 or newer
- The `gotor` repository as a sibling directory
- Go 1.24+ to build GoTor
- Tor listening on `127.0.0.1:9050` when Tor routing is enabled

Expected development layout:

```text
code/
├── TorBot/
├── TorBotApp/
└── gotor/
```

## Setup

```bash
npm install
npm run setup:gotor
npm start
```

Coding agents and contributors should read [AGENTS.md](AGENTS.md) before
changing the app. It captures the Electron/React boundaries, GoTor backend
expectations, safe test defaults, and local validation checklist.

`setup:gotor` builds `../gotor/bin/gotor`. The binary is intentionally ignored
by Git.

The Tor configuration panel calls GoTor's `/api/v1/tor/status` endpoint. If
your configuration is outside the platform defaults, set `TORRC_PATH` before
starting the app. Tor-routed crawls are disabled until the selected SOCKS
endpoint is reachable; direct crawls remain available.

For development, run the renderer compiler and Electron separately:

```bash
npm run dev
npm run electron
```

## Backend discovery

The app checks these sources in order:

1. `GOTOR_BIN`
2. A packaged `gotor` executable in Electron resources
3. `../gotor/bin/gotor`
4. `go run ./cmd/main` from the sibling repository

Set `GOTOR_API_URL` to use an already-running service instead:

```bash
GOTOR_API_URL=http://127.0.0.1:8081 npm start
```

## Packaging

Create an installer for the current operating system:

```bash
npm run package
```

This compiles the sibling GoTor repository into the application resources,
builds the renderer, and writes the installer to `release/`. To validate the
packaged layout without creating an installer, run:

```bash
npm run package:dir
```

Set `GOTOR_DIR` when GoTor is not in the default sibling location:

```bash
GOTOR_DIR=/path/to/gotor npm run package
```

## Verification

```bash
npm run typecheck
npm test
npm run build
```

The GoTor backend has its own checks:

```bash
cd ../gotor
go vet ./...
go test -race ./...
```

## GitHub Actions

The CI workflow runs on pull requests, pushes to `master`, and manual
dispatches. It:

- installs from `package-lock.json` on Node.js 22.12 and 24
- checks TypeScript, runs tests, builds the renderer, and audits production
  dependencies
- uploads the renderer bundle for seven days
- performs a Linux packaging smoke test and verifies that GoTor is bundled

The release workflow runs for semantic version tags such as `v1.0.0`, or can
be started manually for an existing tag. The tag must match the version in
`package.json`. It builds an AppImage, an NSIS installer, and a DMG on native
GitHub-hosted runners, then publishes them with `SHA256SUMS.txt` to a GitHub
Release.

Before tagging, update `package.json`, `package-lock.json`, and this changelog.
Then create and push the tag:

```bash
git tag -a v1.0.0 -m "TorBot 1.0.0"
git push origin v1.0.0
```

The workflow pins GoTor to the tested revision declared as `GOTOR_REF` in both
workflow files. Update that value deliberately when adopting a newer GoTor
release. Release artifacts are currently unsigned; configure platform signing
credentials before presenting them as trusted installers. The repository must
allow GitHub Actions read/write workflow permissions so the release job can
create or update a release.

Only crawl systems you own or are explicitly authorized to assess.
