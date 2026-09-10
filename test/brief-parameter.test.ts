import test from "node:test";
import assert from "node:assert/strict";
import { briefInstruction, prepareBriefArguments, stripBriefParameter, withBriefParameter } from "../src/brief-parameter.ts";
import { BRIEF_PARAMETER } from "../src/types.ts";

const nativeSchema = {
	type: "object",
	properties: { path: { type: "string" }, limit: { type: "number" } },
	required: ["path"],
};

test("adds a required brief parameter on top of the native schema", () => {
	const result = withBriefParameter(nativeSchema) as any;
	assert.deepEqual(Object.keys(result.properties), ["path", "limit", BRIEF_PARAMETER]);
	assert.deepEqual(result.required, ["path", BRIEF_PARAMETER]);
	assert.equal(result.type, "object");
	// The native definition itself must stay untouched.
	assert.deepEqual(nativeSchema.required, ["path"]);
	assert.equal((nativeSchema.properties as any)[BRIEF_PARAMETER], undefined);
});

test("localizes the parameter description and never duplicates required entries", () => {
	const english = withBriefParameter(nativeSchema, "en") as any;
	assert.match(english.properties[BRIEF_PARAMETER].description, /One line/);
	const chinese = withBriefParameter(nativeSchema, "zh") as any;
	assert.match(chinese.properties[BRIEF_PARAMETER].description, /一句话/);
	assert.deepEqual((withBriefParameter(english, "en") as any).required, ["path", BRIEF_PARAMETER]);
});

test("tolerates schemas without properties or required", () => {
	const result = withBriefParameter({ type: "object" }) as any;
	assert.deepEqual(Object.keys(result.properties), [BRIEF_PARAMETER]);
	assert.deepEqual(result.required, [BRIEF_PARAMETER]);
	assert.deepEqual((withBriefParameter(undefined) as any).required, [BRIEF_PARAMETER]);
});

test("keeps the model brief and falls back when it is missing", () => {
	assert.deepEqual(prepareBriefArguments("read", { path: "a.ts", brief: " 查看实现 " }), { path: "a.ts", brief: " 查看实现 " });
	assert.deepEqual(prepareBriefArguments("read", { path: "a.ts" }), { path: "a.ts", brief: "reading a.ts" });
	assert.deepEqual(prepareBriefArguments("read", { path: "a.ts", brief: "" }), { path: "a.ts", brief: "reading a.ts" });
	assert.deepEqual(prepareBriefArguments("ls", undefined), { brief: "listing ." });
});

test("strips the display-only parameter before native execution", () => {
	assert.deepEqual(stripBriefParameter({ path: "a.ts", brief: "x" }), { path: "a.ts" });
	assert.deepEqual(stripBriefParameter({ brief: "x" }), {});
	assert.deepEqual(stripBriefParameter(undefined), {});
	const withoutBrief = { path: "a.ts" };
	assert.equal(stripBriefParameter(withoutBrief), withoutBrief);
});

test("the system prompt instruction names the parameter in the user's language", () => {
	assert.match(briefInstruction("en"), /brief/);
	assert.match(briefInstruction("en"), /tool call/);
	assert.match(briefInstruction("zh"), /brief/);
	assert.match(briefInstruction("zh"), /工具调用/);
	assert.notEqual(briefInstruction("en"), briefInstruction("zh"));
});
