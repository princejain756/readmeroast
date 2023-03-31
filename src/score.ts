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
      inFence;
    if (!skip && t.replace(/\[(.*?)\]\(.*?\)/g, "$1").trim().length >= 40) return pos;
    pos += line.length + 1;
  }
  return -1;
}

function verdictFor(score: number): string {
  if (score >= 90) return "Star-worthy. Frame it.";
  if (score >= 75) return "Solid. A few fixes from great.";
  if (score >= 50) return "Bounce risk. People are leaving.";
  return "Rough. This README is costing you stars.";
}

export function scoreReadme(md: string): ScoreResult {
  const checks: CheckResult[] = [];
  const findings: Finding[] = [];
  const heads = headings(md);
  const blocks = fencedBlocks(md);
  const words = md.split(/\s+/).filter(Boolean).length;

  const add = (id: string, label: string, points: number, max: number, fix = "", roast = "") => {
    checks.push({ id, label, points: Math.max(0, Math.min(points, max)), max });
    if (fix && points < max) findings.push({ check: id, fix, roast });
  };

  // 1. Pitch in the first lines (15)
  const pitchPos = firstParagraphOffset(md);
  if (pitchPos >= 0 && pitchPos <= 400) {
    add("pitch", "Pitch in the first lines", 15, 15);
  } else {
    add("pitch", "Pitch in the first lines", 0, 15,
      "Add one plain sentence under the title saying what this does and who it's for.",
      "No pitch. People land on your repo and learn nothing about it.");
  }

  // 2. Install instructions (15)
  const installHead = headingMatch(heads, /install|getting started|quickstart|setup/);
  const installCmd = /\b(npm i|npm install|pnpm|yarn add|pip install|brew install|cargo install|go install|npx)\b/i.test(md);
  if (installHead && installCmd) add("install", "Install instructions", 15, 15);
  else add("install", "Install instructions", 0, 15,
    "Add an Install section with the copy-paste command.",
    "No install instructions. How do you expect anyone to use this, osmosis?");

  // 3. Usage example (15)
  const usageHead = headingMatch(heads, /usage|example|how to/);
  if (usageHead && blocks.length) add("usage", "Usage example", 15, 15);
  else if (usageHead || blocks.length) add("usage", "Usage example", 6, 15,
    "Show one real usage example, ideally a runnable command or code block.",
    "Half a usage story. Show the thing working.");
  else add("usage", "Usage example", 0, 15,
    "Add a Usage section with one code block showing the most common case.",
    "No usage example. Visitors shouldn't have to read source to figure out step one.");

  // 4. Screenshot or demo (10)
  if (/!\[[^\]]*\]\(|<img[\s>]|\.gif\b/i.test(md)) {
    add("demo", "Screenshot or demo", 10, 10);
  } else {
    add("demo", "Screenshot or demo", 0, 10,
      "Add one screenshot or GIF showing real output near the top.",
      "Zero visuals. A wall of text won't convert anyone scrolling at speed.");
  }

  // 5. License (8)
  if (headingMatch(heads, /licen[cs]e/) || /licen[cs]e\.(md|txt)|mit licen[cs]e|apache-2\.0/i.test(md)) {
    add("license", "License mentioned", 8, 8);
  } else {
    add("license", "License mentioned", 0, 8,
      "Name the license in the README and add a LICENSE file.",
      "No license means nobody can legally use your code. That's a feature you forgot.");
  }

  // 6. Length band (6)
  if (words < 50) add("length", "Length (tweet vs novel)", 1, 6,
    "The README is barely there. Pitch, install, usage at minimum.",
    "This isn't a README, it's a post-it note.");
  else if (words < 150) add("length", "Length (tweet vs novel)", 4, 6,
    "Thin. A usage example and a features list would help.",
    "A bit thin. People judge repos by README weight, fair or not.");
  else if (words > 6000) add("length", "Length (tweet vs novel)", 3, 6,
    `${words} words is a novel. Move details to docs/ and keep the README to the essentials.`,
    `${words} words. Nobody reads this. Split it into docs and keep the front door clean.`);
  else add("length", "Length (tweet vs novel)", 6, 6);

  const score = checks.reduce((a, c) => a + c.points, 0);
  return { score, verdict: verdictFor(score), checks, findings };
}
