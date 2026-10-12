#!/usr/bin/env node
import { existsSync, readFileSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
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
  --badge    Print a shields.io badge with your score
  --min N    Exit 1 if the score is below N (for CI)
  --json     Machine-readable output

Env:
  GITHUB_TOKEN or GH_TOKEN   Raises GitHub API rate limits`;

const README_NAMES = ["README.md", "readme.md", "Readme.md", "README.MD", "README.markdown", "README.txt", "README"];

interface Loaded {
  md: string;
  label: string;
  fileExists?: (href: string) => boolean;
  skipped?: string;
}

function normalizeRel(base: string, href: string): string {
  const parts = (base ? base.split("/") : []).concat(href.split("/"));
  const out: string[] = [];
  for (const p of parts) {
    if (!p || p === ".") continue;
    if (p === "..") out.pop();
    else out.push(p);
  }
  return out.join("/");
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
  const dir = dirname(file);
  return {
    md: readFileSync(file, "utf8"),
    label: file.replace(process.cwd() + "/", ""),
    fileExists: (href) => existsSync(resolve(dir, href.replace(/^\//, ""))),
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
  const meta = await ghFetch(`/repos/${owner}/${repo}`);
  const readme = await ghFetch(`/repos/${owner}/${repo}/readme`);
  const md = Buffer.from(readme.content, "base64").toString("utf8");
  const readmeDir = readme.path.includes("/") ? readme.path.slice(0, readme.path.lastIndexOf("/")) : "";

  let paths: Set<string> | null = null;
  let skipped: string | undefined;
  try {
    const tree = await ghFetch(`/repos/${owner}/${repo}/git/trees/${meta.default_branch}?recursive=1`);
    paths = new Set<string>(tree.tree.map((t: any) => t.path));
  } catch {
    skipped = "link check skipped (GitHub tree unavailable)";
  }

  return {
    md,
    label: `github.com/${owner}/${repo}`,
    skipped,
    fileExists: paths
      ? (href) =>
          paths!.has(
            href.startsWith("/")
              ? normalizeRel("", href.slice(1))
              : normalizeRel(readmeDir, href)
          )
      : undefined,
  };
}

function savageVerdict(score: number): string {
  if (score >= 90) return "Fine. You can write. Barely a roast.";
  if (score >= 75) return "Good enough to be forgettable.";
  if (score >= 50) return "This README is why your repo has 3 stars.";
  if (score >= 25) return "I've seen better docs inside a zip file.";
  return "Blank would be an improvement.";
}

function badgeUrl(score: number): string {
  const color = score >= 90 ? "brightgreen" : score >= 75 ? "green" : score >= 50 ? "yellow" : score >= 25 ? "orange" : "red";
  return `https://img.shields.io/badge/readme_score-${score}%2F100-${color}`;
}

function print(result: ScoreResult, label: string, tone: string, skipped?: string) {
  const w = Math.max(...result.checks.map((c) => c.label.length));
  console.log(`readmeroast - ${label}\n`);
  for (const c of result.checks) {
    const tag = skipped && c.id === "links" ? "  (skipped)" : "";
    console.log(`${c.label.toUpperCase().padEnd(w)}  ${String(c.points).padStart(3)}/${c.max}${tag}`);
  }
  const verdict = tone === "savage" ? savageVerdict(result.score) : result.verdict;
  console.log(`\nScore: ${result.score}/100 - ${verdict}`);
  if (result.findings.length) {
    console.log("");
    const key = tone === "gentle" ? "fix" : "roast";
    for (const f of result.findings) console.log(`- ${f[key]}`);
    const recoverable = result.checks.reduce((a, c) => a + (c.max - c.points), 0);
    const projected = Math.min(100, result.score + Math.min(recoverable, 100 - result.score));
    if (result.score < 100) console.log(`\nFix all of it and you're at ${projected}/100.`);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const flag = (f: string) => args.includes(f);
  if (flag("--help") || flag("-h")) return console.log(HELP);

  const tone = flag("--savage") ? "savage" : flag("--gentle") ? "gentle" : "spicy";
  const minIdx = args.indexOf("--min");
  const min = minIdx >= 0 ? Number(args[minIdx + 1]) : null;
  const target = args.find((a, i) => !a.startsWith("-") && (minIdx < 0 || i !== minIdx + 1));

  let loaded: Loaded;
  if (!target) {
    loaded = loadLocal(".");
  } else if (existsSync(target)) {
    loaded = loadLocal(target);
  } else {
    const m = target.match(/(?:github\.com\/)?([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+?)(?:\.git|\/.*)?$/);
    if (!m || (!target.includes("/") && !existsSync(target))) {
      console.error(`Can't figure out what '${target}' is. Try a path or owner/repo.`);
      process.exit(1);
    }
    loaded = await loadGitHub(m[1], m[2]);
  }

  const result = scoreReadme(loaded.md, { fileExists: loaded.fileExists });

  if (flag("--json")) {
    console.log(JSON.stringify({ target: loaded.label, ...result }, null, 2));
  } else {
    print(result, loaded.label, tone, loaded.skipped);
    if (flag("--badge")) {
      console.log(`\nBadge for your README:\n[![README score](${badgeUrl(result.score)})](https://github.com/princejain756/readmeroast)`);
    }
  }

  if (min !== null && result.score < min) process.exit(1);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
