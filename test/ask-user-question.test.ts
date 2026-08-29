import assert from "node:assert/strict";
import { describe, it } from "node:test";
import askUserQuestion, {
	ASK_USER_BLOCKED_EVENT,
	ASK_USER_PROMPT_EVENT,
	__test__,
	reconcileAskUserQuestionTool,
} from "../extensions/ask-user-question.ts";

function rpcContext(selectResult: string | undefined, inputResults: Array<string | undefined> = []) {
	return {
		hasUI: true,
		mode: "rpc",
		ui: {
			select: async () => selectResult,
			input: async () => inputResults.shift(),
		},
	} as any;
}

describe("ask_user_question RPC fallback", () => {
	it("returns the selected option with its stable value", async () => {
		const answers = await __test__.askWithRpcDialogs(
			rpcContext("Fast"),
			"Which mode?",
			undefined,
			"single-select",
			__test__.normalizeOptions([{ label: "Safe", value: "safe" }, { label: "Fast", value: "fast" }]),
		);
		assert.deepEqual(answers, [{ type: "option", label: "Fast", value: "fast", index: 2 }]);
	});

	it("parses multi-select numbers and preserves custom text", async () => {
		const answers = await __test__.askWithRpcDialogs(
			rpcContext(undefined, ["2, a custom constraint, 1"]),
			"Which constraints?",
			undefined,
			"multi-select",
			__test__.normalizeOptions([{ label: "Speed", value: "speed" }, { label: "Cost", value: "cost" }]),
		);
		assert.deepEqual(answers, [
			{ type: "option", label: "Speed", value: "speed", index: 1 },
			{ type: "option", label: "Cost", value: "cost", index: 2 },
			{ type: "other", label: "a custom constraint", value: "a custom constraint" },
		]);
	});
});

describe("ask_user_question extension coordination", () => {
	it("emits prompt and blocked lifecycle events around an RPC dialog", async () => {
		let tool: any;
		const events: Array<{ name: string; payload: unknown }> = [];
		askUserQuestion({
			registerTool: (definition: any) => { tool = definition; },
			on: () => {},
			events: { emit: (name: string, payload: unknown) => events.push({ name, payload }) },
		} as any);

		const result = await tool.execute(
			"call-1",
			{ question: "Choose?", options: [{ label: "Yes", value: "yes" }] },
			undefined,
			undefined,
			rpcContext("Yes"),
		);

		assert.equal(result.details.status, "answered");
		assert.deepEqual(events, [
			{
				name: ASK_USER_PROMPT_EVENT,
				payload: {
					question: "Choose?",
					context: undefined,
					mode: "single-select",
					options: [{ label: "Yes" }],
				},
			},
			{ name: ASK_USER_BLOCKED_EVENT, payload: { active: true } },
			{ name: ASK_USER_BLOCKED_EVENT, payload: { active: false } },
		]);
	});

	it("removes only itself without UI and restores itself with UI", () => {
		let active = ["read", "ask_user_question", "quiz"];
		const changes: string[][] = [];
		const pi = {
			getActiveTools: () => active,
			setActiveTools: (next: string[]) => { active = next; changes.push(next); },
		};

		reconcileAskUserQuestionTool(pi as any, { hasUI: false } as any);
		reconcileAskUserQuestionTool(pi as any, { hasUI: true } as any);

		assert.deepEqual(changes, [
			["read", "quiz"],
			["read", "quiz", "ask_user_question"],
		]);
	});
});
