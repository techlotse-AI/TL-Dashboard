# MIGRATION — TL-Dashboard-Core → TL-Dashboard (TL standard)

Brings this repo in line with the shared TL engineering standard (see
`tl-template`). Work top to bottom.

## Target identity
| Field | Value |
|---|---|
| Repo name | **TL-Dashboard** — **DONE.** Org also moved: `techlotse` → `techlotse-AI`. |
| Docker image | `techlotse/tl-dashboard` — **DONE**, first published with v0.6.0 (2026-09-13). DockerHub org stays `techlotse`. |
| Version target | **`1.0.0`** — gated on this checklist. **`0.5.0`** (2026-09-12, audit backlog) and **`0.6.0`** (2026-09-13, layout + weather + slideshow removal) released on the way. |
| Release channel | **stable** |
| Live URL | https://mirror.int.techlotse.cloud/ |

> **Status 2026-09-12:** v0.5.0 and v0.6.0 shipped; `v0.6.0` is the first git tag this
> repo has ever had. v1.0.0 is deliberately deferred until the items below are done.

## 1. Rename (do first)
1. ~~GitHub: rename `TL-Dashboard-Core` → `TL-Dashboard`.~~ **DONE** — and the org changed too (`techlotse` → `techlotse-AI`), which was not anticipated here. **Consequence: the org-level DockerHub secrets/vars did not follow the move, so `Build & Push` failed at login until 2026-09-13.** Fixed: new secrets `DOCKERHUB_USER` / `DOCKERHUB_TOKEN` added under `techlotse-AI` and the workflow switched to them. `DOCKER_REPO` is optional — the workflow falls back to `techlotse/tl-dashboard`.
2. Local: rename folder + `git remote set-url origin <new-url>`.
3. ~~Image → `techlotse/tl-dashboard` (update `docker-build-push.yml`, compose files, README).~~ **DONE.** Note: a stale `DOCKER_REPO` variable under `techlotse-AI` still held the old name and redirected the first green build to `tl-dashboard-core`; v0.6.0 hardcodes the image name in the workflow. **Delete the `DOCKER_REPO` variable** — it is no longer read.

## 2. Versioning
- Set `VERSION` (present) to **`1.0.0`** (drop any `v` prefix).
- Tag `v1.0.0` and push → stable release.

## 3. Release process (TL standard — identical across all repos)
On merge/push to `main` via `.github/workflows/release.yml`:
- **HEAD has tag `vX.Y.Z`** → push `techlotse/tl-dashboard:vX.Y.Z` + `:latest` + GitHub Release.
- **No tag on HEAD** → `:<short-sha>` + `:nightly`.
- Your `docker-build-push.yml` already does multi-arch via QEMU/buildx and org secrets — fold it into the template `release.yml` so the tag/nightly logic matches.

## 4. Security gate
Add the **Trivy CRITICAL-only** gate before push — currently there is **no CVE gate**.

## 5. Dependabot — **DONE (v0.5.0)**
~~Add `.github/dependabot.yml` (npm for frontend+backend, docker, github-actions, weekly).~~ Added in v0.5.0: npm (backend + frontend), docker, and github-actions, weekly, minor/patch grouped per ecosystem.

## 6. Required files (current gaps)
- [x] README.md — refresh + working badges.
- [x] VERSION / CHANGELOG.md — present (set VERSION = 1.0.0).
- [ ] **LICENSE.md** — add (none today).
- [ ] **AGENTS.md** (+ `CLAUDE.md` pointer) — add (none today).
- [ ] **STYLING.md** — add; this product defines the wall-dashboard look — document its palette/tokens here.
- [x] TL-Project.md — present.
- [ ] **ROADMAP** — none; add `docs/ROADMAP.md`.

## 7. /docs structure
Has a `docs/` folder — fill out the standard set: `ARCHITECTURE.md`, `DESIGN.md`, `OPERATIONS.md`, `DEVELOPMENT.md`, `ROADMAP.md`, `API-REFERENCE.md` (widget data sources / SBB, METAR, news), `DB-SCHEMA.md` (config/`data`), `DEPENDENCIES.md`.

## Checklist
- [~] Repo renamed + org moved (done); image refs renamed (done); **image not yet published**
- [ ] VERSION = 1.0.0 · tag v1.0.0 pushed
- [ ] release.yml + Trivy CRITICAL gate
- [x] dependabot.yml
- [ ] LICENSE.md · AGENTS.md + CLAUDE.md · STYLING.md · docs/ROADMAP.md
- [ ] README badges · docs/ standard set
