import { useMemo, useState } from 'react'
import './App.css'
import { analyzeReadme, type RoastLevel } from './analyzeReadme'

const sampleReadme = `# ShipNotes

A tiny CLI that turns git commits into clean release notes.

## Features

- Groups commits into Added, Fixed, and Changed
- Exports Markdown
- Works locally with no account

## Installation

\`\`\`bash
npm install -g shipnotes
\`\`\`

## Usage

\`\`\`bash
shipnotes --since v1.0.0
\`\`\`

## License

MIT
`

function App() {
  const [readme, setReadme] = useState(sampleReadme)
  const [level, setLevel] = useState<RoastLevel>('spicy')
  const result = useMemo(() => analyzeReadme(readme, level), [readme, level])

  return (
    <main className="app-shell">
      <section className="hero-section">
        <div className="eyebrow">README Roast + Fixer</div>
        <h1>Turn confusing READMEs into GitHub pages people actually read.</h1>
        <p>
          Paste a README, pick a roast level, and get an instant clarity score,
          missing-section audit, rewrite suggestion, and launch checklist.
        </p>
        <div className="hero-actions">
          <a href="#roaster" className="primary-action">Roast my README</a>
          <button type="button" onClick={() => setReadme('')} className="secondary-action">
            Start blank
          </button>
        </div>
      </section>

      <section className="workspace" id="roaster" aria-label="README roaster workspace">
        <div className="editor-card">
          <div className="card-header">
            <div>
              <span className="label">Input</span>
              <h2>Your README</h2>
            </div>
            <select
              aria-label="Roast level"
              value={level}
              onChange={(event) => setLevel(event.target.value as RoastLevel)}
            >
              <option value="gentle">Gentle</option>
              <option value="spicy">Spicy</option>
              <option value="savage">Savage</option>
            </select>
          </div>
          <textarea
            value={readme}
            onChange={(event) => setReadme(event.target.value)}
            placeholder="# My Project\n\nPaste your README here..."
            spellCheck="false"
          />
        </div>

        <div className="results-grid">
          <article className="score-card">
            <span className="label">Clarity score</span>
            <div className="score-row">
              <strong>{result.score}</strong>
              <span>{result.grade}</span>
            </div>
            <p>{result.roast}</p>
          </article>

          <article className="result-card">
            <span className="label">Findings</span>
            <div className="finding-list">
              {result.findings.map((finding) => (
                <div className={`finding ${finding.severity}`} key={finding.title}>
                  <strong>{finding.title}</strong>
                  <p>{finding.detail}</p>
                </div>
              ))}
            </div>
          </article>

          <article className="result-card">
            <span className="label">Rewrite suggestion</span>
            <h2>Better intro</h2>
            <p>{result.rewrittenIntro}</p>
          </article>

          <article className="result-card">
            <span className="label">Fix checklist</span>
            <h2>Next edits</h2>
            <ul className="checklist">
              {result.checklist.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>
    </main>
  )
}

export default App
