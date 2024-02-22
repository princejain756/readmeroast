#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { scoreReadme, type ScoreResult } from "./score.js";

const HELP = `readmeroast - score a README out of 100 and get roasted for what's missing

Usage:
  readmeroast                 Roast ./README.md
  readmeroast <path>          Roast a local README or directory
  readmeroast <owner/repo>    Roast a GitHub repo's README
  readmeroast <github-url>    Same, pasted

Flags:
  --gentle   Constructive notes only (default is spicy)
  --savage   Maximum disrespect

Env:
  GITHUB_TOKEN or GH_TOKEN   Raises GitHub API rate limits`;

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD", "README.markdown", "README.txt", "README"];

interface Loaded {
  md: string;
  label: string;
}

function loadLocal(path: string): Loaded {
  const p = resolve(path);
  if (!existsSync(p)) throw new Error(`no such file or directory: ${path}`);
  let file = p;
  if (statSync(p).isDirectory()) {
    const found = README_NAMES.map((n) => join(p, n)).find(existsSync);
    if (!found) throw new Error(`no README found in ${path}`);
    file = found;
  }
  return {
    md: readFileSync(file, "utf8"),
    label: file.replace(process.cwd() + "/", ""),
  };
}

async function ghFetch(path: string): Promise<any> {
  const token = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
  const res = await fetch(`https://api.github.com${path}`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": "readmeroast",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (res.status === 404) throw new Error("repo not found (or it's private; set GITHUB_TOKEN)");
  if (res.status === 403) throw new Error(`GitHub rate limit hit. Set GITHUB_TOKEN for more.`);
  if (!res.ok) throw new Error(`GitHub API ${res.status}`);
  return res.json();
}

async function loadGitHub(owner: string, repo: string): Promise<Loaded> {
  await ghFetch(`/repos/${owner}/${repo}`);
  const readme = await ghFetch(`/repos/${owner}/${repo}/readme`);
  return {
    md: Buffer.from(readme.content, "base64").toString("utf8"),
    label: `github.com/${owner}/${repo}`,
  };
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

async function main() {
  const args = process.argv.slice(2);
  const flag = (f: string) => args.includes(f);
  if (flag("--help") || flag("-h")) return console.log(HELP);

  const tone = flag("--savage") ? "savage" : flag("--gentle") ? "gentle" : "spicy";
  const target = args.find((a) => !a.startsWith("-"));

  let loaded: Loaded;
  if (!target) {
    loaded = loadLocal(".");
  } else if (existsSync(target)) {
    loaded = loadLocal(target);
  } else {
    const m = target.match(/(?:github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git|\/.*)?$/);
    if (!m) {
      console.error(`Can't figure out what '${target}' is. Try a path or owner/repo.`);
      process.exit(1);
    }
    loaded = await loadGitHub(m[1], m[2]);
  }

  print(scoreReadme(loaded.md), loaded.label, tone);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
