# AGENTS.md

Guidance for AI coding agents working on this repository.

## What this repo is

Not an application — a [pi](https://github.com/earendil-works/pi) configuration directory, published so a learning workspace can use it as its `.pi` (via `git clone … .pi` or a symlink). The product is the config itself: a teaching philosophy encoded as skills, a few extensions, and subagent definitions.

Two consequences:

- Workspaces that symlink this repo pick up every change live; there is no release step.
- `SYSTEM.md` is part of the shipped config (the system prompt for learning sessions). It does not apply to you. This file does.

## Layout

- `skills/teach/`, `skills/visualize/` — skills: Markdown + frontmatter (`name`, `description`). `teach` encodes the teaching philosophy and is written for one specific learner, in a deliberate voice — preserve that voice when editing.
- `agents/*.md` — subagent definitions (`researcher`, `svg-maker`, `mermaid-maker`). Frontmatter: `name`, `description`, `tools`, `model`, `thinking`, `system-prompt`, `auto-exit`.
- `extensions/*.ts` — pi extensions (`ask-user-question`, `quiz`, `md-log`): one file each, an opening banner comment explaining purpose and design decisions, and a `export default function (pi: ExtensionAPI)` entry point.
- `extensions/visual-tools/` — the only pnpm workspace package; it is a package solely so `@mermaid-js/mermaid-cli` (its `mmdc` binary) sits on disk next to the extension. Tools live in `tools/`.
- `settings.json` — pi mounts for an external package and for global skills/extensions dirs, each followed by an `!` exclusion line. The pair is a deliberate shadow: pi auto-discovers those global dirs (user scope), and project settings can only disable them by re-mounting the same dir (project scope wins dedup) and excluding everything in it. Mount lines support `~`; exclusion patterns do **not** — pi matches patterns literally, so `!~/.…` never matches. Instead the exclusions use a `**/` prefix (`!**/.agents/skills/**`), which minimatch matches against absolute paths, keeping the config home-independent. Side effect to know: the `**/` form also excludes any workspace `.agents/skills/**` (project-scope auto-discovery), which is intended here — learning workspaces should only see this repo's own skills.
- `test/*.test.ts` — unit tests.

## Commands

```bash
pnpm install    # root + extensions/visual-tools
pnpm test       # node --test test/**/*.test.ts
pnpm typecheck  # tsc --noEmit
```

There is no lint setup and no CI. Run `pnpm test` and `pnpm typecheck` before you consider work done.

## Conventions

- ESM (`"type": "module"`), TypeScript `strict`, ES2022, Node16 module resolution. Imports use explicit `.ts` extensions (`allowImportingTsExtensions`) — match that style.
- Extensions that need unit-tested internals export them via a single `export const __test__ = { … }`. Pure logic you want to test goes there, not onto the public surface.
- Tests use `node:test` + `node:assert/strict`, one file per extension under `test/`. They can only cover exported pure helpers — extension registration and TUI behavior are not unit-testable; don't try to bootstrap pi in tests.
- The pnpm 11 build-script allowlist lives in `pnpm-workspace.yaml` (`allowBuilds`: puppeteer, protobufjs — pulled in by mermaid-cli). New packages with build scripts go there.
- This repo is a config dir first, toolchain second. Don't add root dependencies unless the work genuinely requires them.

## Constraints that keep the system working

- `ask-user-question`: the copy in this repo must be the only ask-user implementation loaded in a session. Popups from different extensions serialize through a shared UI lock that only works between identical implementations. Don't swap in or add a second copy.
- `agents/researcher.md` lists `web_search` / `fetch_content`, but these tools are provided by the host's subagent setup (recommended: pi-herdr-subagents with pi-web-access), not by this repo. Tool names in `agents/*.md` are requests to the host — changing them changes what the host must provide.
