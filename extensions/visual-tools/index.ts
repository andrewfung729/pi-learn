/**
 * visual-tools
 *
 * A self-contained pi extension that registers custom subagent tools with the
 * globally-loaded `pi-herdr-subagents` extension — and does nothing else:
 *
 *   • write_mermaid / edit_mermaid / render_mermaid
 *       (tools/mermaid_tools.ts) — the mermaid-maker's authoring loop: write a
 *       Mermaid source, exact-match edit it, render whatever is currently in
 *       the managed file to a PNG (via the bundled @mermaid-js/mermaid-cli and
 *       an installed Chrome), return the PNG inline for inspection, and — when
 *       given `save_as` — publish it into <cwd>/viz with a unique name.
 *   • write_svg / edit_svg / render_svg
 *       (tools/svg_tools.ts) — the svg-maker's authoring loop: same shape, but
 *       renders hand-written SVG to a PNG via rsvg-convert (fallback: magick).
 *
 * Each trio maps to ONE file so pi-herdr-subagents loads it once and
 * allow-lists all three names.
 *
 * ── How registration reaches pi-herdr-subagents ─────────────────────────────
 * The global `pi-herdr-subagents` extension exposes `registerToolExtension`
 * on `globalThis.__pi_interactive_subagents` (legacy global name kept for
 * compatibility). A child subagent is launched with `--no-extensions` plus an
 * explicit `-e <path>` only for tools whose name → path mapping it knows; this
 * extension teaches it about the six names above so mermaid-maker / svg-maker
 * (which list them in their `tools:` frontmatter) get them loaded into their
 * child process.
 *
 * pi loads PROJECT-local extensions (this one) BEFORE global ones, so
 * `globalThis.__pi_interactive_subagents` does not exist yet when this factory
 * runs. We defer registration to `session_start`, which fires once after every
 * extension's factory has run. Registration is idempotent (same name+path is a
 * no-op), so `/reload` or a "reload"/"new"/"resume" session_start is harmless.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent"
import * as fs from "node:fs"
import * as path from "node:path"
import { fileURLToPath } from "node:url"

const EXT_DIR = path.dirname(fileURLToPath(import.meta.url))
const MERMAID_TOOLS = path.join(EXT_DIR, "tools", "mermaid_tools.ts")
const SVG_TOOLS = path.join(EXT_DIR, "tools", "svg_tools.ts")

interface HerdrSubagentsApi {
  registerToolExtension: (name: string, extensionPath: string) => void
}

function registerToolExtensions(): void {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  // Legacy global name from the interactive-subagents lineage; pi-herdr-subagents still sets it.
  const api = (globalThis as any).__pi_interactive_subagents as HerdrSubagentsApi | undefined
  if (!api?.registerToolExtension) return // pi-herdr-subagents not loaded — no-op

  for (const [name, toolPath] of [
    ["write_mermaid", MERMAID_TOOLS],
    ["edit_mermaid", MERMAID_TOOLS],
    ["render_mermaid", MERMAID_TOOLS],
    ["write_svg", SVG_TOOLS],
    ["edit_svg", SVG_TOOLS],
    ["render_svg", SVG_TOOLS],
  ] as const) {
    if (!fs.existsSync(toolPath)) continue
    try {
      api.registerToolExtension(name, toolPath)
    } catch {
      // Already registered under a different path, or re-registered — ignore.
    }
  }
}

export default function (pi: ExtensionAPI) {
  pi.on("session_start", async () => {
    registerToolExtensions()
  })
}
