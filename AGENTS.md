# Agent Development Guide

This repository is an Electron desktop app with a React renderer and a narrow
main-process IPC bridge. It expects the Go-based `gotor` backend as a sibling
repository. Do not use or document `DedSecInside/TorBot`, the Python CLI, as
the backend for this app.

## Project Shape

- `src/main.js` starts Electron, manages the GoTor process, and owns privileged
  filesystem/process behavior.
- `src/preload.js` exposes the context-isolated IPC surface consumed by the
  renderer.
- `src/app.tsx`, `src/renderer.tsx`, and `src/global.css` implement the React
  UI.
- `src/gotorBackend.js` discovers, starts, and talks to the local GoTor API.
- `src/ipcValidation.js` validates crawl requests before they reach privileged
  code.
- `src/auditStore.js` writes crawl audit artifacts.
- `tests/` contains Node test-runner coverage for backend discovery, audit
  storage, and IPC validation.
- `scripts/build-gotor.js` builds or packages the sibling Go backend.

Expected local layout:

```text
code/
|-- TorBotApp/
`-- gotor/
```

## Commands

Use Node.js 22.12 or newer.

```bash
npm install
npm run setup:gotor
npm run dev
npm run electron
```

Normal validation:

```bash
npm run typecheck
npm test
npm run build
```

Packaging checks:

```bash
npm run package:dir
npm run package
```

GoTor has separate validation in the sibling repository:

```bash
cd ../gotor
go vet ./...
go test -race ./...
```

## Backend Expectations

The backend is the Go-based `gotor` service. The app discovers it in this order:

1. `GOTOR_BIN`
2. packaged Electron resources
3. `../gotor/bin/gotor`
4. `go run ./cmd/main` from the sibling `gotor` repository

Set `GOTOR_API_URL` when using an already-running local service. Set
`GOTOR_DIR` when the GoTor checkout is not at `../gotor`.

## Safety Defaults

- Use mocks, fixtures, small local examples, or validation-only tests by default.
- Do not run live crawls against third-party targets unless Akeem explicitly
  authorizes the target and scope in the current task.
- Do not put credentials, tokens, cookies, private URLs, or real investigation
  findings into tests, docs, screenshots, or committed fixtures.
- Treat audit artifacts and exported reports as sensitive output.
- Keep Tor and crawler examples bounded. Prefer loopback services or static
  fixtures for smoke tests.

## Working Rules for Coding Agents

- Check `git status --short` before editing and preserve dirty worktree changes.
- Keep changes scoped to the issue or task. Avoid unrelated formatting churn.
- Do not push, create branches, open pull requests, create tags, or change
  GitHub metadata unless Akeem explicitly asks for it.
- Do not install global tools or modify machine-level configuration unless the
  task requires it and Akeem approves the command.
- Prefer existing scripts, test patterns, and IPC/backend boundaries over new
  abstractions.
- When changing privileged code in `src/main.js`, `src/preload.js`,
  `src/gotorBackend.js`, `src/ipcValidation.js`, or `src/auditStore.js`, run the
  focused tests plus `npm run typecheck`.
- For UI changes, run `npm run build` and manually smoke-check the Electron app
  when practical.

## Final Handoff Expectations

Report:

- files changed;
- tests or checks run;
- any checks skipped and why;
- remaining risks or follow-up decisions;
- suggested commit grouping when more than one logical change was made.
