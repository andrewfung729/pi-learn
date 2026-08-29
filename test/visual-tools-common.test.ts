import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import {
  applyEdit,
  publish,
  sessionDir,
  snippetAround,
  writeBody,
} from "../extensions/visual-tools/tools/_common.ts";

const temps: string[] = [];

afterEach(() => {
  while (temps.length > 0) {
    const dir = temps.pop();
    if (dir) rmSync(dir, { recursive: true, force: true });
  }
});

describe("applyEdit", () => {
  it("replaces a unique exact match", () => {
    const { updated, index } = applyEdit("alpha beta gamma", "beta", "BETA");
    assert.equal(updated, "alpha BETA gamma");
    assert.equal(index, 6);
  });

  it("rejects empty old_text", () => {
    assert.throws(() => applyEdit("abc", "", "x"), /non-empty/);
  });

  it("rejects identical old/new text", () => {
    assert.throws(() => applyEdit("abc", "b", "b"), /identical/);
  });

  it("rejects missing old_text", () => {
    assert.throws(() => applyEdit("abc", "z", "y"), /not found/);
  });

  it("rejects non-unique old_text and reports count", () => {
    assert.throws(() => applyEdit("aa aa aa", "aa", "b"), /appears 3 times/);
  });
});

describe("snippetAround", () => {
  it("returns a numbered window around the hit line", () => {
    const content = ["one", "two", "three", "four", "five"].join("\n");
    const index = content.indexOf("three");
    const snippet = snippetAround(content, index, 1);
    assert.match(snippet, /2 {2}two/);
    assert.match(snippet, /3 {2}three/);
    assert.match(snippet, /4 {2}four/);
    assert.doesNotMatch(snippet, /one/);
  });
});

describe("writeBody / sessionDir", () => {
  it("writes source under a pid-keyed staging dir", () => {
    const session = writeBody("test-group", "body.txt", "hello\n");
    temps.push(session.workDir);
    assert.equal(session.workDir, sessionDir("test-group"));
    assert.equal(readFileSync(session.bodyPath, "utf8"), "hello\n");
  });
});

describe("publish", () => {
  it("slugifies and copies into cwd/viz with a unique name", () => {
    const root = mkdtempSync(join(tmpdir(), "pi-learn-publish-"));
    temps.push(root);
    const src = join(root, "src.png");
    writeFileSync(src, "png-bytes");

    const prev = process.cwd();
    process.chdir(root);
    try {
      const out = publish(src, "Hello World!!");
      assert.match(out.filename, /^viz-hello-world-\d+\.png$/);
      assert.equal(readFileSync(out.path, "utf8"), "png-bytes");
      // macOS: cwd() resolves the /var symlink to /private/var — compare against realpath.
      assert.equal(out.path, join(realpathSync(root), "viz", out.filename));
    } finally {
      process.chdir(prev);
    }
  });

  it("falls back to viz when slug is empty after cleaning", () => {
    const root = mkdtempSync(join(tmpdir(), "pi-learn-publish-"));
    temps.push(root);
    const src = join(root, "src.png");
    writeFileSync(src, "x");

    const prev = process.cwd();
    process.chdir(root);
    try {
      const out = publish(src, "!!!");
      assert.match(out.filename, /^viz-viz-\d+\.png$/);
    } finally {
      process.chdir(prev);
    }
  });
});
