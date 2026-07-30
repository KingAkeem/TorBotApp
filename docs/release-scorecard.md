# Release scorecard

This scorecard makes release evidence and known limitations visible before an
installer is published. A passing score means the listed checks have evidence;
it does not imply that an unsigned installer is trusted or that every target
was manually exercised.

## Current release candidate

| Field | Status | Evidence or notes |
| --- | --- | --- |
| Version | Release candidate | `v1.0.0`; no release tag is present in this checkout |
| Assessment date | Recorded | 2026-07-30 |
| CI | Workflow defined | Node.js 22.12 and 24 verification plus a Linux packaging smoke job are defined in `.github/workflows/ci.yml`; confirm the commit's GitHub Actions run before tagging |
| TypeScript | Passed locally | `npm run typecheck` on 2026-07-30 |
| Tests | Passed locally | `npm test` on 2026-07-30; 10 tests passed |
| Renderer build | Passed locally | `npm run build` on 2026-07-30 |
| Packaging smoke test | Passed locally | `npm run package:dir` on Linux on 2026-07-30; the unpacked application contains an executable `resources/gotor` |
| Bundled GoTor | Pinned and matched locally | `DedSecInside/gotor@0c51ae5878c64996baa40e36e68154579aeac293`; the same full SHA is pinned in CI and release workflows |
| Installer signing | Not configured | Release jobs disable automatic signing discovery. Published installers are unsigned until platform credentials and verification steps are configured |
| Supported targets | Workflow defined | Linux AppImage, Windows NSIS, and macOS DMG on native GitHub-hosted runners |
| Manual verification | Not recorded | Exercise installation, launch, diagnostics, direct crawl, Tor crawl, cancellation, and uninstall on every release target before publication |

## Known limitations

- Installers are unsigned. Operating systems may display an unknown-publisher
  warning, and downloaded artifacts must not be presented as trusted installers.
- GoTor is pinned by commit rather than a versioned GoTor release. Updating the
  backend requires changing `GOTOR_REF` in both workflow files and rerunning the
  full release checklist.
- Linux is covered by the CI packaging smoke test. Windows and macOS packaging
  run only in the release workflow and still require manual installation checks.
- The automated tests cover backend job control but do not replace end-to-end
  crawl verification against an authorized test target and a local Tor service.

## Checklist for every release

Create a new release record above (or archive the previous record) and capture
links or run identifiers wherever a check is performed remotely.

- [ ] Set matching versions in `package.json` and `package-lock.json` and update
  `CHANGELOG.md`.
- [ ] Record the candidate commit and intended semantic version tag.
- [ ] Confirm the same full `GOTOR_REF` is present in `.github/workflows/ci.yml`
  and `.github/workflows/release.yml`.
- [ ] Run `npm ci`, `npm run typecheck`, `npm test`, and `npm run build`.
- [ ] Run `npm audit --omit=dev --audit-level=high` and review every exception.
- [ ] Run `npm run package:dir` with the pinned GoTor checkout and verify the
  bundled executable under the unpacked application's `resources` directory.
- [ ] Confirm the candidate commit's CI jobs pass on every supported Node.js
  version.
- [ ] Build all three installer targets through the release workflow.
- [ ] Record signing or notarization state for each installer. If unsigned, keep
  that limitation prominent in the release notes.
- [ ] Install and exercise launch, diagnostics, direct crawl, Tor crawl,
  cancellation, and uninstall on Linux, Windows, and macOS.
- [ ] Review known limitations and add them to the GitHub Release notes.
- [ ] Verify `SHA256SUMS.txt` against every release artifact before publication.
