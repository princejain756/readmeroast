#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

interface Check {
  label: string;
  points: number;
  max: number;
}

function firstParagraph(md: string): string {
  const lines = md.split("\n");
  let inFence = false;
  const prose: string[] = [];
  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const t = line.trim();
    const skip = !t || t.startsWith("#") || t.startsWith("!") || t.startsWith("[") || t.startsWith("<") || inFence;
    if (!skip) prose.push(t);
    else if (prose.length) break;
  }
  return prose.join(" ");
}

function codeBlocks(md: string): number {
  return (md.match(/^```/gm) || []).length / 2;
}

function scoreReadme(md: string): Check[] {
  const words = md.split(/\s+/).filter(Boolean).length;
  const checks: Check[] = [];

  const pitch = firstParagraph(md);
  checks.push({ label: "Pitch in the first lines", points: pitch.length >= 40 ? 25 : pitch.length ? 10 : 0, max: 25 });

  const install = /\b(npm i|npm install|pnpm|yarn add|pip install|brew install|cargo install|go install|npx)\b/i.test(md);
  checks.push({ label: "Install instructions", points: install ? 25 : 0, max: 25 });

  const blocks = codeBlocks(md);
  checks.push({ label: "Usage example", points: blocks ? 25 : 0, max: 25 });

  const length = words >= 150 && words <= 6000 ? 25 : words >= 50 ? 15 : 5;
  checks.push({ label: "Length (tweet vs novel)", points: length, max: 25 });

  return checks;
}

function verdictFor(score: number): string {
  if (score >= 90) return "Star-worthy. Frame it.";
  if (score >= 70) return "Solid. A few fixes from great.";
  if (score >= 40) return "Bounce risk. People are leaving.";
  return "Rough. This README is costing you stars.";
}

function main() {
  const file = resolve(process.argv.slice(2).find((a) => !a.startsWith("-")) ?? "README.md");
  if (!existsSync(file)) throw new Error(`no such file: ${file}`);

  const checks = scoreReadme(readFileSync(file, "utf8"));
  const w = Math.max(...checks.map((c) => c.label.length));

  console.log(`readmeroast - ${file.replace(process.cwd() + "/", "")}\n`);
  for (const c of checks) {
    console.log(`${c.label.toUpperCase().padEnd(w)}  ${String(c.points).padStart(3)}/${c.max}`);
  }
  const score = checks.reduce((a, c) => a + c.points, 0);
  console.log(`\nScore: ${score}/100 - ${verdictFor(score)}`);
}

try {
  main();
} catch (e) {
  console.error((e as Error).message);
  process.exit(1);
}
