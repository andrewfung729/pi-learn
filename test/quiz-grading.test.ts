import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { __test__ as quiz } from "../extensions/quiz.ts";

describe("normalizeOptions", () => {
  it("trims labels and defaults value to label", () => {
    const opts = quiz.normalizeOptions([
      { label: "  Mercury  " },
      { label: "Venus", value: " venus " },
    ]);
    assert.deepEqual(opts, [
      { label: "Mercury", value: "Mercury", description: undefined },
      { label: "Venus", value: "venus", description: undefined },
    ]);
  });

  it("drops empty labels", () => {
    assert.deepEqual(quiz.normalizeOptions([{ label: "   " }, { label: "ok" }]), [
      { label: "ok", value: "ok", description: undefined },
    ]);
  });

  it("rejects duplicate values", () => {
    assert.throws(
      () => quiz.normalizeOptions([{ label: "A", value: "x" }, { label: "B", value: "x" }]),
      /duplicate option value "x"/,
    );
  });
});

describe("coerceCorrectAnswer", () => {
  it("passes arrays through", () => {
    assert.deepEqual(quiz.coerceCorrectAnswer(["a", "b"]), ["a", "b"]);
  });

  it("wraps a plain string", () => {
    assert.deepEqual(quiz.coerceCorrectAnswer("mercury"), ["mercury"]);
  });

  it("parses a JSON-stringified array (schema union quirk)", () => {
    assert.deepEqual(quiz.coerceCorrectAnswer('["a", "b"]'), ["a", "b"]);
  });

  it("treats invalid JSON bracket strings as a single literal", () => {
    assert.deepEqual(quiz.coerceCorrectAnswer("[not-json"), ["[not-json"]);
  });
});

describe("resolveCorrect", () => {
  const options = quiz.normalizeOptions([
    { label: "Mercury", value: "mercury" },
    { label: "Venus", value: "venus" },
    { label: "Earth", value: "earth" },
  ]);

  it("maps values to 1-based indices", () => {
    assert.deepEqual(quiz.resolveCorrect("venus", options), { indices: [2] });
  });

  it("maps multi-select values and dedupes/sorts", () => {
    assert.deepEqual(quiz.resolveCorrect(["earth", "mercury", "earth"], options), {
      indices: [1, 3],
    });
  });

  it("errors when correctAnswer is missing", () => {
    assert.equal(quiz.resolveCorrect(undefined, options).error, "correctAnswer is required");
    assert.equal(quiz.resolveCorrect([], options).error, "correctAnswer is required");
  });

  it("errors on unknown values with known list", () => {
    const result = quiz.resolveCorrect("pluto", options);
    assert.equal(result.indices.length, 0);
    assert.match(result.error ?? "", /does not match any option value/);
    assert.match(result.error ?? "", /"mercury"/);
  });
});

describe("isCorrect", () => {
  it("requires exact multiset match (order-independent)", () => {
    assert.equal(quiz.isCorrect([3, 1], [1, 3]), true);
    assert.equal(quiz.isCorrect([1], [1, 3]), false);
    assert.equal(quiz.isCorrect([1, 2, 3], [1, 3]), false);
    assert.equal(quiz.isCorrect([], []), true);
  });
});

describe("shuffleOptions", () => {
  it("returns a permutation with the same members", () => {
    const options = quiz.normalizeOptions([
      { label: "A" },
      { label: "B" },
      { label: "C" },
      { label: "D" },
    ]);
    const shuffled = quiz.shuffleOptions(options);
    assert.equal(shuffled.length, options.length);
    assert.deepEqual(
      [...shuffled.map((o) => o.value)].sort(),
      [...options.map((o) => o.value)].sort(),
    );
    // Does not mutate the input array identity/order object references incorrectly
    assert.notEqual(shuffled, options);
  });
});

describe("latexToText", () => {
  it("strips inline math delimiters", () => {
    assert.equal(
      quiz.latexToText("某社会的“代际收入弹性”为 $0.5$。它通常表示什么？"),
      "某社会的“代际收入弹性”为 0.5。它通常表示什么？",
    );
  });

  it("unescapes \\% inside and outside math", () => {
    assert.equal(
      quiz.latexToText("父母收入高 $50\\%$，子女成年收入平均高约 $10\\%$"),
      "父母收入高 50%，子女成年收入平均高约 10%",
    );
    assert.equal(quiz.latexToText("增长 50\\% 以上"), "增长 50% 以上");
  });

  it("maps high-frequency symbols", () => {
    assert.equal(quiz.latexToText("$\\pi \\approx 3.14$"), "π ≈ 3.14");
    assert.equal(quiz.latexToText("$a \\times b$"), "a × b");
    assert.equal(quiz.latexToText("$x \\geq 5$"), "x ≥ 5");
  });

  it("flattens display math", () => {
    assert.equal(quiz.latexToText("$$\nE = mc^2\n$$"), "E = mc^2");
  });

  it("leaves unpaired dollar signs alone", () => {
    assert.equal(quiz.latexToText("成本 $5"), "成本 $5");
  });

  it("leaves unknown commands and superscripts visibly raw, not mangled", () => {
    assert.equal(quiz.latexToText("$\\frac{a}{b}$"), "\\frac{a}{b}");
    assert.equal(quiz.latexToText("$x^2$"), "x^2");
  });

  it("returns plain text untouched", () => {
    assert.equal(
      quiz.latexToText("父母收入高 10%，子女收入高 5%"),
      "父母收入高 10%，子女收入高 5%",
    );
  });
});
