# pi-learn

[![video](assets/thumbnail.png)](https://www.youtube.com/watch?v=kzcI5F4tGiU)

My fork of [amosblomqvist/learn](https://github.com/amosblomqvist/learn) — Amos Blomqvist's AI learning system for the [pi](https://github.com/earendil-works/pi) coding agent, from his video [How I Use AI to Learn Things](https://www.youtube.com/watch?v=kzcI5F4tGiU).

The core idea is his: the teaching philosophy lives in a skill, small extensions structure the session, and subagents handle research and visuals. This fork adapts it to how I run learning sessions and hardens the pieces I rely on.

## My use case

Every topic I want to learn gets its own repo with this checked out as `.pi`. Two things make that work as an isolated learning workspace:

- `SYSTEM.md` keeps the session a learning session — no drifting into coding or project changes.
- `settings.json` shadows my global skills/extensions, so the workspace loads only this teaching config, nothing else.

## What I changed from upstream

- **Subagent stack** — swapped pi-interactive-subagents (tmux) for [pi-herdr-subagents](https://github.com/andrewfung729/pi-herdr-subagents) (herdr); agent definitions updated to match.
- **Isolated project config** — added `settings.json`, `SYSTEM.md`, and `AGENTS.md`.
- **Tests & toolchain** — root pnpm workspace + tsconfig, with `node --test` coverage for the extensions' pure logic (`pnpm test`, `pnpm typecheck`).
- **Extension fixes** — RPC dialog support in `ask-user-question`, explicit cancel action and LaTeX-safe display in `quiz`, refreshed subagent models.

## What's in it

- `skills/teach/` — the philosophy and the process
- `skills/visualize/` — adds a correct, minimal diagram to a lesson when an idea is clearer as a picture
- `extensions/ask-user-question.ts` — one-question UI popup (native RPC dialogs when needed); emits `pi-learn:ask-user:prompt` and `pi-learn:ask-user:blocked` for cooperating extensions
- `extensions/quiz.ts` — graded questions with instant feedback (✓/✗, correct answer, explanation). Quiz content is written in plain Unicode math (`0.5`, `50%`, `x²`) because it pops up live in a terminal that can't render LaTeX; a thin draw-time fallback strips any `$…$`/`\%` that leaks through, while the md-log transcript keeps whatever the agent sent
- `extensions/md-log/` — link a markdown file to the session
- `extensions/visual-tools/` — tools for visualization subagents
- `agents/` — `researcher`, `svg-maker`, `mermaid-maker`: the subagents the system delegates to

## Install

This repo **is** a `.pi` directory. From your learning project's root:

```bash
git clone https://github.com/andrewfung729/pi-learn .pi
```

Then open pi in that directory. (Or copy the pieces you want into your existing project config.)

## Requirements

- [pi](https://github.com/earendil-works/pi)
- A subagent implementation, so the system can spawn the researcher and the visual makers. Recommended: [pi-herdr-subagents](https://github.com/andrewfung729/pi-herdr-subagents) (herdr only). With it, everything works out of the box. Any other implementation works too, but expect to adapt the agent definitions, e.g. `agents/researcher.md` lists `fetch_content` in its tools, which comes from [pi-web-access](https://pi.dev/packages/pi-web-access) and is resolved by that extension.
- `ask-user-question` — use the copy bundled here. If your setup already has an `ask-user-question` extension, use **this** one in its place. Popups from different extensions serialize through a shared UI lock, which only works when it's the same implementation.

## Dev / test

This repo is still a drop-in `.pi` config, but it has a small root toolchain so extensions can be unit-tested:

```bash
pnpm install          # root + extensions/visual-tools (mermaid-cli)
pnpm test
pnpm typecheck
```

`extensions/visual-tools` is a pnpm workspace package only because it needs `@mermaid-js/mermaid-cli` on disk next to the extension (`node_modules/.bin/mmdc`).

## Notes

You can run the system without subagents. The main session does the teaching. You just lose the researcher (truth verification) and the generated visuals.

The teaching skill is written for one learner. Edit `skills/teach/` to fit how you learn best.
