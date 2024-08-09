# readmeroast

Score a README out of 100 and get roasted for what it's missing.

## Install

```bash
npm install
npm run build
```

## Usage

```bash
node dist/cli.js path/to/README.md
node dist/cli.js .
node dist/cli.js owner/repo
```

Point it at a file, a directory holding a README, or an `owner/repo` slug
to fetch the README from GitHub. It prints a score out of 100 and the
components that made it up, worst offenders first as one-line notes.

`GITHUB_TOKEN` (or `GH_TOKEN`) raises GitHub API rate limits. Without it
you get about 60 requests per hour, and a roast costs three.

## Checks

Each check carries a weight, set by how much the thing matters to someone
landing on a repo cold. Weights are scaled to a score out of 100:

| Check | Weight |
|-------|-------:|
| Pitch in the first lines | 15 |
| Install instructions | 15 |
| Usage example | 15 |
| Screenshot or demo | 10 |
| No AI-slop tells | 10 |
| Links resolve | 9 |
| Code blocks have language tags | 8 |
| License mentioned | 8 |
| Length (not a tweet, not a novel) | 6 |
| No stale promises | 4 |

The AI-slop check counts em dashes, chatbot vocabulary, and emoji-spam
headings. A README can pass everything else and still read like a language
model wrote it.

The links check resolves every relative link and image against disk, or
against the repo's file tree when the target is remote. Dead links in a
README are how trust dies. If the tree can't be fetched the check is
marked skipped rather than guessed at.

## Tone

Default output is spicy. `--gentle` swaps the roasts for constructive
fixes, `--savage` turns the volume up.

## License

MIT
