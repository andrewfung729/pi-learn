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
