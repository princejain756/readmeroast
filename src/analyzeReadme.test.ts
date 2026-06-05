import { describe, expect, it } from 'vitest'
import { analyzeReadme } from './analyzeReadme'

describe('analyzeReadme', () => {
  it('penalizes thin READMEs with missing sections', () => {
    const result = analyzeReadme('# Tiny App\n\nIt does something.', 'savage')

    expect(result.score).toBeLessThan(60)
    expect(result.grade).toBe('F')
    expect(result.missingSections).toContain('Installation')
    expect(result.findings.some((finding) => finding.severity === 'critical')).toBe(true)
  })

  it('rewards structured READMEs with examples and common sections', () => {
    const readme = `# Useful CLI

Useful CLI helps developers generate release notes from git commits in seconds.

## Features

- Groups changes by type
- Works locally
- Produces clean Markdown

## Installation

\`\`\`bash
npm install -g useful-cli
\`\`\`

## Usage

\`\`\`bash
useful-cli --since last-tag
\`\`\`

Read the docs at https://example.com/docs.

## Contributing

Open an issue before large changes.

## License

MIT
`

    const result = analyzeReadme(readme, 'gentle')

    expect(result.score).toBeGreaterThanOrEqual(90)
    expect(result.grade).toBe('A')
    expect(result.missingSections).toEqual([])
  })
})
