// Runnable check: scores two fixture READMEs and asserts the checks behave.
// Run with: npm test
import { strict as assert } from "node:assert";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { scoreReadme } from "../dist/score.js";

const dir = dirname(fileURLToPath(import.meta.url));
const good = readFileSync(join(dir, "good.md"), "utf8");
const bad = readFileSync(join(dir, "bad.md"), "utf8");

const g = scoreReadme(good, { fileExists: () => true });
assert.ok(g.score >= 90, `good fixture should score >=90, got ${g.score}`);
assert.equal(g.findings.length, 0, `good fixture should have no findings, got ${g.findings.map(f => f.fix)}`);

const b = scoreReadme(bad, { fileExists: () => false });
assert.ok(b.score < 50, `bad fixture should score <50, got ${b.score}`);
assert.ok(b.findings.length >= 5, `bad fixture should have >=5 findings, got ${b.findings.length}`);

const links = scoreReadme(good, { fileExists: (h) => h !== "docs/guide.md" });
const linkCheck = links.checks.find((c) => c.id === "links");
assert.ok(linkCheck.points < 9, `broken link should cost points, got ${linkCheck.points}`);

console.log(`ok - good: ${g.score}, bad: ${b.score}, links: ${linkCheck.points}/9`);
