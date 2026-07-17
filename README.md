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

- Node.js 18 or newer
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

Only crawl systems you own or are explicitly authorized to assess.
