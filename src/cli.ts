#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { scoreReadme, type ScoreResult } from "./score.js";

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD", "README.markdown", "README.txt", "README"];

interface Target {
  file: string;
  label: string;
}

// Accept a README path, a directory holding one, or nothing at all for the cwd.
function resolveTarget(path: string): Target {
  const p = resolve(path);
  if (!existsSync(p)) throw new Error(`no such file or directory: ${path}`);
  if (!statSync(p).isDirectory()) {
    return { file: p, label: p.replace(process.cwd() + "/", "") };
  }
  const found = README_NAMES.map((n) => join(p, n)).find(existsSync);
  if (!found) throw new Error(`no README found in ${path}`);
  return { file: found, label: found.replace(process.cwd() + "/", "") };
}

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
    if (result.score < 100) console.log(`\nFix all of it and you're at 100/100.`);
  }
}

function main() {
  const target = process.argv.slice(2).find((a) => !a.startsWith("-"));
  const { file, label } = resolveTarget(target ?? ".");
  print(scoreReadme(readFileSync(file, "utf8")), label);
}

try {
  main();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}