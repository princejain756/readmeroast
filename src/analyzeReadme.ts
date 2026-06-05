export type RoastLevel = 'gentle' | 'spicy' | 'savage'

export type Finding = {
  title: string
  detail: string
  severity: 'good' | 'warning' | 'critical'
}

export type RoastResult = {
  score: number
  grade: string
  roast: string
  findings: Finding[]
  missingSections: string[]
  rewrittenIntro: string
  checklist: string[]
}

const requiredSections = [
  { key: 'installation', label: 'Installation', terms: ['install', 'installation', 'setup', 'getting started'] },
  { key: 'usage', label: 'Usage', terms: ['usage', 'how to use', 'example', 'examples'] },
  { key: 'features', label: 'Features', terms: ['features', 'what it does'] },
  { key: 'license', label: 'License', terms: ['license'] },
  { key: 'contributing', label: 'Contributing', terms: ['contributing', 'contribute'] },
]

const roastLines: Record<RoastLevel, string[]> = {
  gentle: [
    'Your README has potential, but it needs a clearer path from curiosity to confidence.',
    'This README is trying its best. A stronger intro and setup guide would help it shine.',
  ],
  spicy: [
    'Your README is giving “trust me bro” energy. Let’s add proof, structure, and a real setup path.',
    'This project might be great, but the README is making people do detective work.',
  ],
  savage: [
    'This README is less documentation and more of a cryptic side quest. Let’s make it usable.',
    'Right now your README is where momentum goes to die. The project deserves better packaging.',
  ],
}

export function analyzeReadme(readme: string, level: RoastLevel = 'spicy'): RoastResult {
  const text = readme.trim()
  const lower = text.toLowerCase()
  const words = text.split(/\s+/).filter(Boolean)
  const headings = text.match(/^#{1,6}\s+.+$/gm) ?? []
  const codeBlocks = text.match(/```[\s\S]*?```/g) ?? []
  const links = text.match(/https?:\/\/\S+|\[[^\]]+\]\([^)]+\)/g) ?? []

  const missingSections = requiredSections
    .filter((section) => !section.terms.some((term) => lower.includes(term)))
    .map((section) => section.label)

  const findings: Finding[] = []
  let score = 100

  if (words.length < 50) {
    score -= 22
    findings.push({
      title: 'Too thin for trust',
      detail: 'Add enough context for a stranger to understand what this is, why it exists, and how to run it.',
      severity: 'critical',
    })
  } else {
    findings.push({
      title: 'Decent amount of content',
      detail: 'There is enough text to work with. Now make sure every section earns its place.',
      severity: 'good',
    })
  }

  if (headings.length < 3) {
    score -= 16
    findings.push({
      title: 'Needs stronger structure',
      detail: 'Use clear headings so readers can scan the README without reading every paragraph.',
      severity: 'warning',
    })
  } else {
    findings.push({
      title: 'Scannable headings found',
      detail: `Found ${headings.length} headings, which helps readers jump to the right section.`,
      severity: 'good',
    })
  }

  if (codeBlocks.length === 0) {
    score -= 14
    findings.push({
      title: 'No runnable example',
      detail: 'Add at least one command or code example so users can try the project quickly.',
      severity: 'warning',
    })
  }

  if (links.length === 0) {
    score -= 8
    findings.push({
      title: 'No helpful links',
      detail: 'Consider linking to a live demo, docs, screenshots, or related resources.',
      severity: 'warning',
    })
  }

  if (missingSections.length > 0) {
    score -= missingSections.length * 7
    findings.push({
      title: 'Missing common sections',
      detail: `Add: ${missingSections.join(', ')}. These sections answer the questions users usually have first.`,
      severity: missingSections.length > 2 ? 'critical' : 'warning',
    })
  }

  if (!/^#\s+.+/m.test(text)) {
    score -= 10
    findings.push({
      title: 'Missing title heading',
      detail: 'Start with a clear project name in an H1 heading.',
      severity: 'critical',
    })
  }

  score = Math.max(0, Math.min(100, score))

  return {
    score,
    grade: getGrade(score),
    roast: pickRoast(level, score),
    findings,
    missingSections,
    rewrittenIntro: createIntroSuggestion(text),
    checklist: createChecklist(missingSections, codeBlocks.length, links.length),
  }
}

function getGrade(score: number) {
  if (score >= 90) return 'A'
  if (score >= 80) return 'B'
  if (score >= 70) return 'C'
  if (score >= 60) return 'D'
  return 'F'
}

function pickRoast(level: RoastLevel, score: number) {
  if (score >= 90) return 'Your README is already in good shape. Time for polish, not panic.'
  if (score >= 75) return 'This README is almost useful on sight. Tighten the weak spots and it will land.'
  const options = roastLines[level]
  return options[score % options.length]
}

function createIntroSuggestion(text: string) {
  const title = text.match(/^#\s+(.+)$/m)?.[1]?.trim() || 'Your Project'
  return `${title} is a focused tool that helps users solve a specific problem quickly. It explains what the project does, why it matters, and how to get started without digging through the codebase. Add one sentence about the target user, one sentence about the core benefit, and one sentence pointing to the fastest way to try it.`
}

function createChecklist(missingSections: string[], codeBlockCount: number, linkCount: number) {
  const checklist = [
    'Open with a one-sentence value proposition.',
    'Add a screenshot, GIF, or live demo link if the project has a UI.',
    'Include copy-paste setup commands.',
  ]

  missingSections.forEach((section) => checklist.push(`Add a ${section} section.`))

  if (codeBlockCount === 0) checklist.push('Add at least one runnable command or code example.')
  if (linkCount === 0) checklist.push('Add links to demo, docs, issues, or releases.')

  checklist.push('End with license and contribution expectations.')
  return Array.from(new Set(checklist))
}
