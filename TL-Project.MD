# TL-Project — TL-Dashboard-Core

> **Project tracking file.** This is *not* a release or version file — `VERSION` and
> `CHANGELOG.md` remain authoritative. This file tracks the **work**: what's next, when
> it's due, and a running status log.
>
> The daily TL briefing reads **Next Task** and **Due Date** from this file. It reads
> *Released Version* and *Last Commit* automatically from git/version files.

| Field | Value |
|---|---|
| Product | Wall/info dashboard — commute, weather/METAR, and news widgets |
| Repo | `D:\LocalCode\TL-Dashboard-Core` |
| Released version | v0.5.0 (authoritative: `VERSION`, `CHANGELOG.md`) |
| Deployment | Docker Compose + Docker Hub compose file; clean tree on `main` |
| Tracking owner | Ruan |

## Next task
**Work the `MIGRATION.md` checklist toward v1.0.0.** v0.5.0 closed the audit backlog
(deps, lockfiles, CI gate, Dependabot). The remaining gap to a v1 release is the TL
engineering standard: repo/image rename to `tl-dashboard`, Trivy CRITICAL gate,
`LICENSE.md`, `AGENTS.md` + `CLAUDE.md`, `STYLING.md`, `docs/ROADMAP.md`, and the
standard `docs/` set. Pick the next product feature alongside it — widget
configuration UI is the standing proposal.

## Due date
2026-10-10  _(proposed — adjust as needed)_

## Outstanding / backlog
- **BLOCKER — DockerHub publishing is down.** The repo moved org (`techlotse` →
  `techlotse-AI`), so the org-level `ORG_DOCKERHUB_USER` / `ORG_DOCKERHUB_KEY` /
  `DOCKER_REPO` no longer resolve and `Build & Push` fails at login. Re-add them
  under `techlotse-AI`. **No image has published since 2026-05-31.**
- **Do not `docker compose pull` on the production host** until the first
  successful publish of `techlotse/tl-dashboard` — v0.5.0 renamed the image and
  that DockerHub repo does not exist yet. Production still runs the old
  `techlotse/tl-dashboard-core` image.
- **v0.5.0 tag not yet pushed** — deliberately held until DockerHub works, so the
  tagged release does not carry a failed build.
- `MIGRATION.md` checklist — rename (§1) and Dependabot (§5) now done; the rest is the v1.0.0 gate.
- No CVE gate in CI. Trivy CRITICAL-only scan still to add (`MIGRATION.md` §4).
- `docker/build-push-action` still pinned to v6 (v7 available) — left for Dependabot
  to raise with release notes rather than bumped blind.
- Repo is public with **no LICENSE** file.
- Dependabot *alerts* (the passive scanner, a repo setting rather than a file) not
  verified — check Settings → Code security.

## Status log
- 2026-06-20 — Tracking file created. v0.3.3; last commit 2026-05-23. Stable; no documented next step — milestone definition is the gap.
- 2026-06-22 → 2026-07-05 — 8 briefing runs, no change. v0.3.3, last commit `da711bb` (2026-05-23), next milestone undefined throughout.
- 2026-09-12 — **Audit + release.** Repo had been frozen 112 days and the briefing had not run since 2026-07-05. Found PR #1 open and forgotten for 104 days — mergeable, all checks green. Rebased it, reverted its three GitHub Actions *downgrades* (it pinned qemu/login v4→v3 and metadata v6→v5; upstream latest are v4.3.0/v4.6.0/v6.2.0, so `main` was already correct), refreshed deps to current majors, and added the missing lockfiles, `npm ci`, and Dependabot. Cut **v0.5.0** (merged to `main`; tag held — see blockers). Also discovered the repo had already been moved to `techlotse-AI/TL-Dashboard`, which silently broke DockerHub publishing: `Build & Push` fails at login because the org secrets stayed behind. Renamed all image/URL refs to match. v1.0.0 deliberately deferred — `MIGRATION.md` work outstanding first.
