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

export interface ScoreOptions {
  fileExists?: (href: string) => boolean;
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

function relativeLinks(md: string): string[] {
  const links: string[] = [];
  const re = /!?\[[^\]]*\]\(([^)\s"'<]+)[^)]*\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(md))) {
    const href = m[1];
    if (/^(https?:|mailto:|#)/i.test(href)) continue;
    links.push(href.split("#")[0]);
  }
  return links.filter((l) => l.length > 0);
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

export function scoreReadme(md: string, opts: ScoreOptions = {}): ScoreResult {
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

  // 5. Screenshot or demo (10)
  const hasImage = /!\[[^\]]*\]\(|<img[\s>]|\.gif\b/i.test(md);
  const hasDemoLink = /(demo|live|try it|asciinema|youtu|loom\.com)/i.test(md);
  if (hasImage) add("demo", "Screenshot or demo", 10, 10);
  else if (hasDemoLink) add("demo", "Screenshot or demo", 4, 10,
    "Embed the demo as an image or GIF in the README itself, don't just link out.",
    "A link to a demo is where screenshots go to die. Put the GIF in the README.");
  else add("demo", "Screenshot or demo", 0, 10,
    "Add one screenshot or GIF showing real output near the top.",
    "Zero visuals. A wall of text won't convert anyone scrolling at speed.");

  // 6. License (8)
  if (headingMatch(heads, /licen[cs]e/) || /licen[cs]e\.(md|txt)|mit licen[cs]e|apache-2\.0|license.*badge/i.test(md)) {
    add("license", "License mentioned", 8, 8);
  } else {
    add("license", "License mentioned", 0, 8,
      "Name the license in the README and add a LICENSE file.",
      "No license means nobody can legally use your code. That's a feature you forgot.");
  }

  // 7. Length band (6)
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

  // 8. Broken relative links (9)
  if (opts.fileExists) {
    const rel = relativeLinks(md);
    const broken = [...new Set(rel.filter((l) => !opts.fileExists!(l)))];
    if (!broken.length) {
      add("links", "Links resolve", 9, 9);
    } else {
      const pts = Math.max(0, 9 - broken.length * 3);
      const shown = broken.slice(0, 3).join(", ") + (broken.length > 3 ? ` (+${broken.length - 3} more)` : "");
      add("links", "Links resolve", pts, 9,
        `Fix or remove dead links: ${shown}`,
        `${broken.length} dead link${broken.length === 1 ? "" : "s"} (${shown}). Clicking a 404 in your README is how trust dies.`);
    }
  } else {
    add("links", "Links resolve", 9, 9);
  }

  // 9. AI-slop tells (10)
  const emDashes = (prose.match(/—/g) || []).length + (prose.match(/ -- /g) || []).length;
  const lower = prose.toLowerCase();
  const slopHits = SLOP_WORDS.filter((w) => lower.includes(w));
  const emojiHeads = countEmojiHeadings(prose);
  let slopPenalty = 0;
  if (emDashes >= 3) slopPenalty += Math.min(6, 2 + Math.floor(emDashes / 3));
  slopPenalty += Math.min(6, slopHits.length * 3);
  if (emojiHeads >= 3) slopPenalty += 2;
  slopPenalty = Math.min(10, slopPenalty);
  const tells = [
    emDashes >= 3 ? `${emDashes} em dashes` : "",
    slopHits.length ? `"${slopHits.slice(0, 3).join('", "')}"` : "",
    emojiHeads >= 3 ? `${emojiHeads} emoji headings` : "",
  ].filter(Boolean).join(", ");
  add("aislop", "No AI-slop tells", 10 - slopPenalty, 10,
    `Remove the AI tells: ${tells}.`,
    `${tells}. Your README reads like a chatbot wrote it, because one probably did.`);

  // 10. Stale promises (4)
  const wipHits = (prose.match(/\b(todo|fixme|coming soon|work in progress|wip)\b|🚧/gi) || []).length;
  if (!wipHits) {
    add("wip", "No stale promises", 4, 4);
  } else {
    add("wip", "No stale promises", Math.max(0, 4 - wipHits * 2), 4,
      `${wipHits} TODO/coming-soon markers. Ship it or cut the promise.`,
      `"Coming soon" in a README is a museum exhibit. Either build it or delete the line.`);
  }

  const score = checks.reduce((a, c) => a + c.points, 0);
  return { score, verdict: verdictFor(score), checks, findings };
}
