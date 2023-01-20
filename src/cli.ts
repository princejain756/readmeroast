#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { scoreReadme, type ScoreResult } from "./score.js";

function print(result: ScoreResult, label: string) {
  const w = Math.max(...result.checks.map((c) => c.label.length));
  console.log(`readmeroast - ${label}\n`);
  for (const c of result.checks) {
    console.log(`${c.label.toUpperCase().padEnd(w)}  ${String(c.points).padStart(3)}/${c.max}`);
  }
  // The rubric is not at full weight yet, so report a score scaled to 100.
  const total = result.checks.reduce((a, c) => a + c.max, 0);
  console.log(`\nScore: ${Math.round((result.score / total) * 100)}/100 - ${result.verdict}`);
  if (result.findings.length) {
    console.log("");
    for (const f of result.findings) console.log(`- ${f.roast}`);
    console.log(`\nFix all of it and you're at 100/100.`);
  }
}

function main() {
  const file = resolve(process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "README.md");
  if (!existsSync(file)) throw new Error(`no such file: ${file}`);
  print(scoreReadme(readFileSync(file, "utf8")), file.replace(process.cwd() + "/", ""));
}

try {
  main();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
