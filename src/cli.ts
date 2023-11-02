#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { scoreReadme, type ScoreResult } from "./score.js";

const HELP = `readmeroast - score a README out of 100 and get roasted for what's missing

Usage:
  readmeroast                 Roast ./README.md
  readmeroast <path>          Roast a local README or directory

Flags:
  --gentle   Constructive notes only (default is spicy)
  --savage   Maximum disrespect`;

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

function savageVerdict(score: number): string {
  if (score >= 90) return "Fine. You can write. Barely a roast.";
  if (score >= 75) return "Good enough to be forgettable.";
  if (score >= 50) return "This README is why your repo has 3 stars.";
  if (score >= 25) return "I've seen better docs inside a zip file.";
  return "Blank would be an improvement.";
}

function print(result: ScoreResult, label: string, tone: string) {
  const w = Math.max(...result.checks.map((c) => c.label.length));
  console.log(`readmeroast - ${label}\n`);
  for (const c of result.checks) {
    console.log(`${c.label.toUpperCase().padEnd(w)}  ${String(c.points).padStart(3)}/${c.max}`);
  }
  const verdict = tone === "savage" ? savageVerdict(result.score) : result.verdict;
  // The rubric is not at full weight yet, so report a score scaled to 100.
  const total = result.checks.reduce((a, c) => a + c.max, 0);
  console.log(`\nScore: ${Math.round((result.score / total) * 100)}/100 - ${verdict}`);
  if (result.findings.length) {
    console.log("");
    const key = tone === "gentle" ? "fix" : "roast";
    for (const f of result.findings) console.log(`- ${f[key]}`);
    if (result.score < 100) console.log(`\nFix all of it and you're at 100/100.`);
  }
}

function main() {
  const args = process.argv.slice(2);
  const flag = (f: string) => args.includes(f);
  if (flag("--help") || flag("-h")) return console.log(HELP);