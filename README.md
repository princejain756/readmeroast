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
```

Point it at a file or a directory holding a README. It prints a score out
of 100 and the components that made it up, worst offenders first as
one-line notes.

## Checks

Each check carries a weight, set by how much the thing matters to someone
landing on a repo cold. Weights are scaled to a score out of 100:

| Check | Weight |
|-------|-------:|
| Pitch in the first lines | 15 |
| Install instructions | 15 |
| Usage example | 15 |
| Screenshot or demo | 10 |
| License mentioned | 8 |
| Length (not a tweet, not a novel) | 6 |
