# readmeroast

**Score any GitHub README out of 100, and get roasted for what it's missing.**

```bash
npx readmeroast you/yourrepo
```

````console
PITCH IN THE FIRST LINES         15/15
INSTALL INSTRUCTIONS             15/15
USAGE EXAMPLE                     9/15
CODE BLOCKS HAVE LANGUAGE TAGS    5/8
SCREENSHOT OR DEMO               10/10
LICENSE MENTIONED                 0/8
LENGTH (TWEET VS NOVEL)           6/6
LINKS RESOLVE                     9/9
NO AI-SLOP TELLS                 10/10
NO STALE PROMISES                 4/4

Score: 83/100 - Solid. A few fixes from great.

- You've got half a usage story. Show the thing working.
- Bare ``` blocks mean gray walls of text. One word after the fence fixes it.
- No license means nobody can legally use your code. That's a feature you forgot.

Fix all of it and you're at 100/100.
````

Real output, roasting [mcp-tax](https://github.com/princejain756/mcp-tax).

## What it checks

Ten checks, weighted to 100:

| Check | Points |
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

The links check fetches the repo's file tree and verifies every relative
link and image actually resolves. Dead links in a README are how trust
dies.

## Install

```bash
npx readmeroast owner/repo   # run once, no install
npm i -g readmeroast         # or keep it around
```

Requires Node 18+.

## Usage

```text
readmeroast                  # roast ./README.md
readmeroast ./docs           # roast a directory's README
readmeroast owner/repo       # roast a GitHub repo
readmeroast owner/repo --savage
```

```text
--gentle   constructive notes only (default tone is spicy)
--savage   maximum disrespect
--badge    print a shields.io badge with your score
--min N    exit 1 if the score is below N (useful as a CI gate)
--json     machine-readable output
```

`GITHUB_TOKEN` (or `GH_TOKEN`) raises GitHub API rate limits. Without it
you get about 60 requests per hour, and a roast costs three.

## Badge

```bash
readmeroast you/repo --badge
```

prints a shields badge with your score, ready to paste into the README it
just judged. Show it off, or wear the shame.

## Famous scores

From [LEADERBOARD.md](LEADERBOARD.md):

| Score | Repo |
|------:|------|
| 88 | vuejs/core |
| 85 | facebook/react |
| 61 | microsoft/vscode |
| 52 | torvalds/linux |
| 47 | sindresorhus/awesome |

Stars don't guarantee the front door is clean.

## Notes

- It's a heuristic. It checks the conventions people actually scan for;
  it can't tell whether your docs are true or well written.
- Awesome-style lists and curated-link repos score low on install and
  usage by design. They aren't software landing pages. Take the score
  with the salt it deserves.
- The link check needs the GitHub trees API. If it can't be fetched, that
  check is skipped and marked as such.
- Nothing leaves your machine except GitHub API calls for remote repos.

## Why

A README is a landing page. Most repos lose visitors in the first screen:
no pitch, no install command, no example. This prints the bill on one
screen, plus a roast so it stings enough to fix.

PRs welcome: more checks, better markdown parsing, a `--fix` mode that
rewrites instead of complaining.

## License

MIT
