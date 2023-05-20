export interface CheckResult {
  id: string;
  label: string;
  points: number;
  max: number;
}

export interface Finding {
  check: string;
  fix: string;
  roast: string;
}

export interface ScoreResult {
  score: number;
  verdict: string;
  checks: CheckResult[];
  findings: Finding[];
}

const SLOP_WORDS = [
  "delve", "seamless", "leverage", "elevate", "passionate",
  "cutting-edge", "cutting edge", "game-chang", "unlock",
  "supercharge", "revolutioniz",
];

function stripComments(md: string): string {
  return md.replace(/<!--[\s\S]*?-->/g, "");
}

function fencedBlocks(md: string): Array<{ lang: string; body: string }> {
  const blocks: Array<{ lang: string; body: string }> = [];
  const re = /^```([^\s`]*)\n([\s\S]*?)^```/gm;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) blocks.push({ lang: m[1], body: m[2] });
  return blocks;
}

function headings(md: string): string[] {
  return md
    .split("\n")
    .filter((l) => /^#{1,6}\s/.test(l))
    .map((l) => l.replace(/^#{1,6}\s+/, "").trim().toLowerCase());
}

function headingMatch(heads: string[], re: RegExp): boolean {
  return heads.some((h) => re.test(h));
}

// Offset of the first real prose paragraph (not heading, image, badge, html, or list).
function firstParagraphOffset(md: string): number {
  const lines = md.split("\n");
  let pos = 0;
  let inFence = false;
  for (const line of lines) {
    if (/^```/.test(line)) inFence = !inFence;
    const t = line.trim();
    const skip =
      !t ||
      t.startsWith("#") ||
      t.startsWith("!") ||
      t.startsWith("[") ||
      t.startsWith("<") ||
      t.startsWith("|") ||
      /^[-*+•>]\s/.test(t) ||
      /^\d+[.)]\s/.test(t) ||
      inFence;
    if (!skip && t.replace(/\[(.*?)\]\(.*?\)/g, "$1").trim().length >= 40) return pos;
    pos += line.length + 1;
  }
  return -1;
}

function countEmojiHeadings(md: string): number {
  return md
    .split("\n")
    .filter((l) => /^#{1,6}\s/.test(l) && /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(l))
    .length;
}

function verdictFor(score: number): string {
  if (score >= 90) return "Star-worthy. Frame it.";
  if (score >= 75) return "Solid. A few fixes from great.";
  if (score >= 50) return "Bounce risk. People are leaving.";
  if (score >= 25) return "Rough. This README is costing you stars.";
  return "Brutal. This README scares people off.";
}

export function scoreReadme(md: string): ScoreResult {
  md = stripComments(md);
  const checks: CheckResult[] = [];
  const findings: Finding[] = [];
  const heads = headings(md);
  const blocks = fencedBlocks(md);
  // Prose = markdown with fenced code removed; quoted output shouldn't count as tells.
  const prose = md.replace(/```[\s\S]*?```/g, " ");
  const words = prose.split(/\s+/).filter(Boolean).length;

  const add = (id: string, label: string, points: number, max: number, fix = "", roast = "") => {
    checks.push({ id, label, points: Math.max(0, Math.min(points, max)), max });
    if (fix && points < max) findings.push({ check: id, fix, roast });
  };

  // 1. Pitch in the first lines (15)
  const pitchPos = firstParagraphOffset(md);
  if (pitchPos >= 0 && pitchPos <= 400) {
    add("pitch", "Pitch in the first lines", 15, 15);
  } else if (pitchPos > 0) {
    add("pitch", "Pitch in the first lines", 6, 15,
      "Say what the project does in one plain sentence before anything else.",
      "Your pitch is buried. Visitors decide in 5 seconds, and you're spending them on badges.");
  } else {
    add("pitch", "Pitch in the first lines", 0, 15,
      "Add one plain sentence under the title saying what this does and who it's for.",
      "No pitch at all. People land on your repo and learn nothing.");
  }

  // 2. Install instructions (15)
  const installHead = headingMatch(heads, /install|getting started|quickstart|setup|set up/);
  const installCmd = /\b(npm i|npm install|pnpm|yarn add|bun add|pip install|pipx|brew install|cargo (add|install)|go install|go get|npx|uvx|apt install|docker pull|composer require|gem install)\b/i.test(md);
  if (installHead && installCmd) add("install", "Install instructions", 15, 15);
  else if (installHead || installCmd) add("install", "Install instructions", 9, 15,
    "Pair the install section with the exact command, or name the section so people find it.",
    "Half an install. People have to guess the rest, and guessing kills stars.");
  else add("install", "Install instructions", 0, 15,
    "Add an Install section with the copy-paste command.",
    "No install instructions. How do you expect anyone to use this, osmosis?");

  // 3. Usage example (15)
  const usageHead = headingMatch(heads, /usage|example|quick ?start|how to|getting started/);
  if (usageHead && blocks.length) add("usage", "Usage example", 15, 15);
  else if (usageHead || blocks.length) add("usage", "Usage example", 9, 15,
    "Show one real usage example, ideally a runnable command or code block.",
    "You've got half a usage story. Show the thing working.");
  else add("usage", "Usage example", 0, 15,
    "Add a Usage section with one code block showing the most common case.",
    "No usage example. Visitors shouldn't have to read source to figure out step one.");

  // 4. Language tags on code blocks (8)
  if (!blocks.length) {
    add("langtags", "Code blocks have language tags", 8, 8);
  } else {
    const tagged = blocks.filter((b) => b.lang).length;
    const frac = tagged / blocks.length;
    const pts = frac >= 0.8 ? 8 : frac >= 0.5 ? 5 : 2;
    add("langtags", "Code blocks have language tags", pts, 8,
      `${blocks.length - tagged} of ${blocks.length} code blocks have no language tag. Add one (bash, ts, py) for syntax highlighting.`,
      "Bare ``` blocks mean gray walls of text. One word after the fence fixes it.");
  }